/**
 * Sanitize a filename for safe storage and URL usage
 * Removes special characters and converts to lowercase
 */
export function sanitizeFilename(filename: string): string {
  // Remove extension first
  const ext = filename.split(".").pop() || "";
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  // Sanitize the name
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);

  return ext ? `${sanitized}.${ext.toLowerCase()}` : sanitized;
}

/**
 * Create a URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sanitize CSV content to prevent injection
 * Removes characters that could cause issues in CSV files
 */
export function sanitizeForCsv(text: string): string {
  return text.replace(/,/g, " ").replace(/"/g, "'").replace(/\n/g, " ").replace(/\r/g, "").trim();
}
