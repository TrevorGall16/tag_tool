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
  console.log(`[HYDRATE] Starting hydration for session: "${sessionId}"`);

  const db = await getDB();

  // Load batch metadata
  console.log(`[HYDRATE] Querying 'batches' store for key: "${sessionId}"`);
  const batch = await db.get("batches", sessionId);

  if (!batch) {
    console.warn(`[HYDRATE] NO BATCH FOUND for session: "${sessionId}"`);
    // Debug: List all batches in DB
    const allBatches = await db.getAll("batches");
    console.log(
      `[HYDRATE] All batches in DB (${allBatches.length}):`,
      allBatches.map((b) => b.sessionId)
    );
    return null;
  }

  console.log(`[HYDRATE] Found batch:`, {
    sessionId: batch.sessionId,
    marketplace: batch.marketplace,
  });

  // Load all groups for session
  console.log(`[HYDRATE] Querying 'groups' index bySession for: "${sessionId}"`);
  const groupRecords = await db.getAllFromIndex("groups", "bySession", sessionId);
  console.log(`[HYDRATE] Found ${groupRecords.length} groups for session "${sessionId}"`);

  // Debug: List all groups in DB
  const allGroups = await db.getAll("groups");
  console.log(
    `[HYDRATE] All groups in DB (${allGroups.length}):`,
    allGroups.map((g) => ({ id: g.id, sessionId: g.sessionId }))
  );

  // Load all images for session
  console.log(`[HYDRATE] Querying 'images' index bySession for: "${sessionId}"`);
  const imageRecords = await db.getAllFromIndex("images", "bySession", sessionId);
  console.log(`[HYDRATE] Found ${imageRecords.length} images for session "${sessionId}"`);

  // Debug: List all images in DB
  const allImages = await db.getAll("images");
  console.log(
    `[HYDRATE] All images in DB (${allImages.length}):`,
    allImages.map((i) => ({ id: i.id.slice(0, 8), sessionId: i.sessionId, groupId: i.groupId }))
  );

  // Group images by groupId
  const imagesByGroup = new Map<string, typeof imageRecords>();
  for (const img of imageRecords) {
    const existing = imagesByGroup.get(img.groupId) ?? [];
    existing.push(img);
    imagesByGroup.set(img.groupId, existing);
  }

  // Reconstruct groups with hydrated images
  // CRITICAL: Skip images without blobs to prevent "zombie" images
  let skippedImages = 0;

  const groups: LocalGroup[] = await Promise.all(
    groupRecords.map(async (groupRecord) => {
      const groupImages = imagesByGroup.get(groupRecord.id) ?? [];
      console.log(
        `[HYDRATE] Group "${groupRecord.id.slice(0, 8)}" has ${groupImages.length} images`
      );

      // Hydrate each image with its File object
      // Use Promise.all then filter out nulls for images without blobs
      const maybeHydratedImages = await Promise.all(
        groupImages.map(async (imgRecord): Promise<LocalImageItem | null> => {
          const blob = await db.get("blobs", imgRecord.id);

          // CRITICAL: If no blob exists, skip this image entirely
          if (!blob) {
            console.error(
              `[HYDRATE] CRITICAL: NO BLOB for image "${imgRecord.id.slice(0, 8)}" (${imgRecord.originalFilename}) - SKIPPING`
            );
            skippedImages++;
            return null;
          }

          const file = new File([blob.data], imgRecord.originalFilename, {
            type: blob.type,
          });
          console.log(
            `[HYDRATE] Blob found for image "${imgRecord.id.slice(0, 8)}", size: ${blob.size}`
          );

          return {
            id: imgRecord.id,
            file,
            originalFilename: imgRecord.originalFilename,
            sanitizedSlug: imgRecord.sanitizedSlug || "",
            thumbnailDataUrl: imgRecord.thumbnailDataUrl,
            aiTitle: imgRecord.aiTitle,
            aiTags: imgRecord.aiTags,
            aiConfidence: imgRecord.aiConfidence,
            userTitle: imgRecord.userTitle,
            userTags: imgRecord.userTags,
            status: imgRecord.status,
            errorMessage: imgRecord.errorMessage,
          };
        })
      );

      // Filter out null entries (images without blobs)
      const hydratedImages = maybeHydratedImages.filter(
        (img): img is LocalImageItem => img !== null
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

  if (skippedImages > 0) {
    console.warn(`[HYDRATE] WARNING: Skipped ${skippedImages} images due to missing blobs`);
  }

  const totalImages = groups.reduce((acc, g) => acc + g.images.length, 0);
  console.log(
    `[HYDRATE] SUCCESS: Hydrated ${groups.length} groups with ${totalImages} total images`
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
  console.log(`[HYDRATE] Checking if session exists: "${sessionId}"`);
  const db = await getDB();
  const batch = await db.get("batches", sessionId);
  const exists = !!batch;
  console.log(`[HYDRATE] Session "${sessionId}" exists: ${exists}`);
  return exists;
}
