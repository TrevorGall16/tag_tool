/**
 * Debounced server sync for user edits (title/tags).
 * Fires after 500ms of inactivity per image ID.
 * Sends creation metadata so the server can UPSERT (create-if-missing).
 *
 * On 4xx/5xx the function throws so the caller can mark the record dirty
 * and surface a "Sync Error" indicator to the user.
 */

export interface SyncImageData {
  userTitle?: string;
  userTags?: string[];
  // Creation metadata (for upsert — required if image doesn't exist on server yet)
  sessionId?: string;
  groupId?: string;
  originalFilename?: string;
  sanitizedSlug?: string;
  fileSize?: number;
  mimeType?: string;
}

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function syncImageToServer(
  imageId: string,
  data: SyncImageData,
  onResult?: (status: "synced" | "error") => void
): void {
  // Clear any pending save for this image
  const existing = pendingTimers.get(imageId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    pendingTimers.delete(imageId);
    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(`Server sync failed: HTTP ${res.status}`);
      }

      onResult?.("synced");
    } catch (error) {
      console.error(`[ServerSync] Failed to save image ${imageId}:`, error);
      onResult?.("error");
    }
  }, 500);

  pendingTimers.set(imageId, timer);
}
