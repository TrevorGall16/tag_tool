import { getDB } from "./db";
import type { LocalGroup, LocalImageItem, MarketplaceType } from "@/store/useBatchStore";

export interface HydratedSession {
  groups: LocalGroup[];
  marketplace: MarketplaceType;
}

/**
 * Load and reconstruct a session from IndexedDB
 */
export async function hydrateSession(sessionId: string): Promise<HydratedSession | null> {
  const db = await getDB();

  // Load batch metadata
  const batch = await db.get("batches", sessionId);
  if (!batch) {
    return null;
  }

  // Load all groups for session
  const groupRecords = await db.getAllFromIndex("groups", "bySession", sessionId);

  // Load all images for session
  const imageRecords = await db.getAllFromIndex("images", "bySession", sessionId);

  // Group images by groupId
  const imagesByGroup = new Map<string, typeof imageRecords>();
  for (const img of imageRecords) {
    const existing = imagesByGroup.get(img.groupId) ?? [];
    existing.push(img);
    imagesByGroup.set(img.groupId, existing);
  }

  // Reconstruct groups with hydrated images
  const groups: LocalGroup[] = await Promise.all(
    groupRecords.map(async (groupRecord) => {
      const groupImages = imagesByGroup.get(groupRecord.id) ?? [];

      // Hydrate each image with its File object
      const hydratedImages: LocalImageItem[] = await Promise.all(
        groupImages.map(async (imgRecord) => {
          const blob = await db.get("blobs", imgRecord.id);

          let file: File | null = null;
          if (blob) {
            file = new File([blob.data], imgRecord.originalFilename, {
              type: blob.type,
            });
          }

          return {
            id: imgRecord.id,
            file: file!,
            originalFilename: imgRecord.originalFilename,
            thumbnailDataUrl: imgRecord.thumbnailDataUrl,
            aiTitle: imgRecord.aiTitle,
            aiTags: imgRecord.aiTags,
            aiConfidence: imgRecord.aiConfidence,
            userTitle: imgRecord.userTitle,
            userTags: imgRecord.userTags,
            status: imgRecord.status,
            errorMessage: imgRecord.errorMessage,
          } as LocalImageItem;
        })
      );

      return {
        id: groupRecord.id,
        groupNumber: groupRecord.groupNumber,
        images: hydratedImages,
        sharedTitle: groupRecord.sharedTitle,
        sharedDescription: groupRecord.sharedDescription,
        sharedTags: groupRecord.sharedTags,
        isVerified: groupRecord.isVerified,
      };
    })
  );

  return {
    groups,
    marketplace: batch.marketplace,
  };
}

/**
 * Check if a session exists in IndexedDB
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const db = await getDB();
  const batch = await db.get("batches", sessionId);
  return !!batch;
}
