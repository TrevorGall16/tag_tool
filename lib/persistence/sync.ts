import { getDB } from "./db";
import type { BatchRecord, BlobRecord, GroupRecord, ImageRecord } from "./schema";
import type { LocalGroup, LocalImageItem, MarketplaceType } from "@/store/useBatchStore";

/**
 * Save a batch record
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
    const groupRecord: GroupRecord = {
      id: group.id,
      sessionId,
      groupNumber: group.groupNumber,
      sharedTitle: group.sharedTitle,
      sharedDescription: group.sharedDescription,
      sharedTags: group.sharedTags,
      isVerified: group.isVerified,
    };

    await groupStore.put(groupRecord);

    // Save images in this group
    for (const image of group.images) {
      const imageRecord: ImageRecord = {
        id: image.id,
        sessionId,
        groupId: group.id,
        originalFilename: image.originalFilename,
        thumbnailDataUrl: image.thumbnailDataUrl,
        aiTitle: image.aiTitle,
        aiTags: image.aiTags,
        aiConfidence: image.aiConfidence,
        userTitle: image.userTitle,
        userTags: image.userTags,
        status: image.status,
        errorMessage: image.errorMessage,
      };

      await imageStore.put(imageRecord);

      // Save blob if file exists and hasn't been saved yet
      if (image.file) {
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
