import { getDB } from "./db";
import type { BatchRecord, BlobRecord, GroupRecord, ImageRecord } from "./schema";
import type { LocalGroup, LocalImageItem, MarketplaceType } from "@/store/useBatchStore";

/**
 * Save a batch record (standalone - prefer saveSessionAtomic for full saves)
 */
export async function saveBatch(sessionId: string, marketplace: MarketplaceType): Promise<void> {
  const db = await getDB();
  const existing = await db.get("batches", sessionId);

  const record: BatchRecord = {
    sessionId,
    marketplace,
    createdAt: existing?.createdAt ?? Date.now(),
    lastModified: Date.now(),
  };

  await db.put("batches", record);
}

/**
 * ATOMIC save of entire session (batch + groups + images + blobs) in a single transaction.
 * CRITICAL: All async work (like File.arrayBuffer()) must happen BEFORE opening the transaction.
 */
export async function saveSessionAtomic(
  sessionId: string,
  marketplace: MarketplaceType,
  groups: LocalGroup[]
): Promise<{ savedGroups: number; savedImages: number }> {
  // ============================================================
  // PHASE 1: Prepare ALL data BEFORE opening transaction
  // ============================================================

  const batchRecord: BatchRecord = {
    sessionId,
    marketplace,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };

  const groupRecords: GroupRecord[] = [];
  const imageRecords: ImageRecord[] = [];
  const blobRecords: BlobRecord[] = [];

  for (const group of groups) {
    if (!group.id) {
      console.error("[SAVE] Skipping group with undefined id");
      continue;
    }

    groupRecords.push({
      id: group.id,
      sessionId,
      groupNumber: group.groupNumber,
      sharedTitle: group.sharedTitle,
      sharedDescription: group.sharedDescription,
      sharedTags: group.sharedTags,
      isVerified: group.isVerified,
    });

    for (const image of group.images) {
      if (!image.id) {
        console.error("[SAVE] Skipping image with undefined id");
        continue;
      }

      imageRecords.push({
        id: image.id,
        sessionId,
        groupId: group.id,
        originalFilename: image.originalFilename,
        sanitizedSlug: image.sanitizedSlug || "",
        thumbnailDataUrl: image.thumbnailDataUrl,
        aiTitle: image.aiTitle,
        aiTags: image.aiTags,
        aiConfidence: image.aiConfidence,
        userTitle: image.userTitle,
        userTags: image.userTags,
        status: image.status,
        errorMessage: image.errorMessage,
      });

      // Convert File to ArrayBuffer NOW, before transaction
      if (image.file && image.file.size > 0) {
        try {
          const arrayBuffer = await image.file.arrayBuffer();
          blobRecords.push({
            id: image.id,
            type: image.file.type,
            data: arrayBuffer,
            size: image.file.size,
          });
        } catch (err) {
          console.error(`[SAVE] Failed to read File for image "${image.id}":`, err);
        }
      }
    }
  }

  // ============================================================
  // PHASE 2: Execute ALL writes in a single synchronous transaction
  // ============================================================

  const db = await getDB();
  const tx = db.transaction(["batches", "groups", "images", "blobs"], "readwrite");

  const batchStore = tx.objectStore("batches");
  const groupStore = tx.objectStore("groups");
  const imageStore = tx.objectStore("images");
  const blobStore = tx.objectStore("blobs");

  try {
    // Get existing batch to preserve createdAt
    const existingBatch = await batchStore.get(sessionId);
    if (existingBatch) {
      batchRecord.createdAt = existingBatch.createdAt;
    }

    // Get existing data for cleanup
    const existingGroups = await groupStore.index("bySession").getAll(sessionId);
    const existingImages = await imageStore.index("bySession").getAll(sessionId);

    const newGroupIds = new Set(groupRecords.map((g) => g.id));
    const newImageIds = new Set(imageRecords.map((i) => i.id));

    // Collect all write operations
    const writeOps: Promise<unknown>[] = [];

    // Write batch
    writeOps.push(batchStore.put(batchRecord));

    // Delete obsolete groups
    for (const existing of existingGroups) {
      if (!newGroupIds.has(existing.id)) {
        writeOps.push(groupStore.delete(existing.id));
      }
    }

    // Delete obsolete images and blobs
    for (const existing of existingImages) {
      if (!newImageIds.has(existing.id)) {
        writeOps.push(imageStore.delete(existing.id));
        writeOps.push(blobStore.delete(existing.id));
      }
    }

    // Write all groups
    for (const record of groupRecords) {
      writeOps.push(groupStore.put(record));
    }

    // Write all images
    for (const record of imageRecords) {
      writeOps.push(imageStore.put(record));
    }

    // Write all blobs (these are already converted to ArrayBuffers)
    for (const record of blobRecords) {
      writeOps.push(blobStore.put(record));
    }

    // Execute ALL operations in parallel within the transaction
    await Promise.all(writeOps);

    // Commit transaction
    await tx.done;

    return { savedGroups: groupRecords.length, savedImages: imageRecords.length };
  } catch (err) {
    console.error("[SAVE] Atomic save failed:", err);
    throw err;
  }
}

/**
 * Save all groups for a session
 */
export async function saveGroups(sessionId: string, groups: LocalGroup[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["groups", "images", "blobs"], "readwrite");

  const groupStore = tx.objectStore("groups");
  const imageStore = tx.objectStore("images");
  const blobStore = tx.objectStore("blobs");

  // Get existing groups to clean up removed ones
  const existingGroups = await groupStore.index("bySession").getAll(sessionId);
  const newGroupIds = new Set(groups.map((g) => g.id));

  // Delete groups that no longer exist
  for (const existing of existingGroups) {
    if (!newGroupIds.has(existing.id)) {
      await groupStore.delete(existing.id);
    }
  }

  // Get existing images to clean up removed ones
  const existingImages = await imageStore.index("bySession").getAll(sessionId);
  const newImageIds = new Set(groups.flatMap((g) => g.images.map((i) => i.id)));

  // Delete images and blobs that no longer exist
  for (const existing of existingImages) {
    if (!newImageIds.has(existing.id)) {
      await imageStore.delete(existing.id);
      await blobStore.delete(existing.id);
    }
  }

  // Save all current groups and their images
  for (const group of groups) {
    // CRITICAL: Validate group has required 'id' key before saving
    if (!group.id) {
      console.error("[Persistence] ERROR: Attempted to save group with undefined/null id:", {
        groupNumber: group.groupNumber,
        sharedTitle: group.sharedTitle,
        imageCount: group.images?.length ?? 0,
      });
      continue; // Skip this invalid group
    }

    const groupRecord: GroupRecord = {
      id: group.id,
      sessionId,
      groupNumber: group.groupNumber,
      sharedTitle: group.sharedTitle,
      sharedDescription: group.sharedDescription,
      sharedTags: group.sharedTags,
      isVerified: group.isVerified,
    };

    try {
      await groupStore.put(groupRecord);
    } catch (err) {
      console.error("[Persistence] ERROR: Failed to save group:", {
        groupId: group.id,
        groupNumber: group.groupNumber,
        error: err instanceof Error ? err.message : String(err),
        record: groupRecord,
      });
      continue; // Skip this group's images too
    }

    // Save images in this group
    for (const image of group.images) {
      // Validate image has required 'id' key
      if (!image.id) {
        console.error("[Persistence] ERROR: Attempted to save image with undefined/null id:", {
          groupId: group.id,
          filename: image.originalFilename,
        });
        continue;
      }

      const imageRecord: ImageRecord = {
        id: image.id,
        sessionId,
        groupId: group.id,
        originalFilename: image.originalFilename,
        sanitizedSlug: image.sanitizedSlug || "",
        thumbnailDataUrl: image.thumbnailDataUrl,
        aiTitle: image.aiTitle,
        aiTags: image.aiTags,
        aiConfidence: image.aiConfidence,
        userTitle: image.userTitle,
        userTags: image.userTags,
        status: image.status,
        errorMessage: image.errorMessage,
      };

      try {
        await imageStore.put(imageRecord);
      } catch (err) {
        console.error("[Persistence] ERROR: Failed to save image:", {
          imageId: image.id,
          groupId: group.id,
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      // Save blob if file exists and hasn't been saved yet
      if (image.file) {
        try {
          const existingBlob = await blobStore.get(image.id);
          if (!existingBlob) {
            const arrayBuffer = await image.file.arrayBuffer();
            const blobRecord: BlobRecord = {
              id: image.id,
              type: image.file.type,
              data: arrayBuffer,
              size: image.file.size,
            };
            await blobStore.put(blobRecord);
          }
        } catch (err) {
          console.error("[Persistence] ERROR: Failed to save blob:", {
            imageId: image.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  await tx.done;
}

/**
 * Debounce helper
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}
