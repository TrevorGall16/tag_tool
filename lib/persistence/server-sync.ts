/**
 * Debounced server sync for user edits (title/tags).
 * Fires after 500ms of inactivity per image ID.
 */

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function syncImageToServer(
  imageId: string,
  data: { userTitle?: string; userTags?: string[] }
): void {
  // Clear any pending save for this image
  const existing = pendingTimers.get(imageId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    pendingTimers.delete(imageId);
    try {
      await fetch(`/api/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error(`[ServerSync] Failed to save image ${imageId}:`, error);
    }
  }, 500);

  pendingTimers.set(imageId, timer);
}
