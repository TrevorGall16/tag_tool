import type { LocalGroup, LocalImageItem } from "@/store/useBatchStore";

/**
 * Escape a value for CSV format
 */
function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Get the effective title for an image (user override or AI-generated)
 */
function getImageTitle(image: LocalImageItem): string {
  return image.userTitle || image.aiTitle || "";
}

/**
 * Get the effective tags for an image (user override or AI-generated)
 */
function getImageTags(image: LocalImageItem): string[] {
  return image.userTags || image.aiTags || [];
}

export interface AdobeStockCsvRow {
  filename: string;
  title: string;
  keywords: string;
}

/**
 * Generate Adobe Stock compatible CSV content
 * Columns: Filename, Title, Keywords (comma-separated)
 */
export function generateAdobeStockCSV(groups: LocalGroup[]): string {
  const headers = ["Filename", "Title", "Keywords"];
  const lines: string[] = [headers.join(",")];

  for (const group of groups) {
    // Skip unclustered or empty groups
    if (group.id === "unclustered" || group.images.length === 0) continue;

    for (const image of group.images) {
      const title = getImageTitle(image) || group.sharedTitle || "";
      const tags = getImageTags(image).length > 0 ? getImageTags(image) : group.sharedTags;

      const row: AdobeStockCsvRow = {
        filename: image.originalFilename,
        title: title,
        keywords: tags.join(", "),
      };

      lines.push(
        [escapeCsv(row.filename), escapeCsv(row.title), escapeCsv(row.keywords)].join(",")
      );
    }
  }

  // Add BOM for Excel compatibility
  const bom = "\uFEFF";
  return bom + lines.join("\n");
}

/**
 * Collect all unique tags from all groups
 */
export function collectAllTags(groups: LocalGroup[]): string[] {
  const tagSet = new Set<string>();

  for (const group of groups) {
    if (group.id === "unclustered") continue;

    // Add shared tags
    for (const tag of group.sharedTags) {
      tagSet.add(tag);
    }

    // Add individual image tags
    for (const image of group.images) {
      const imageTags = getImageTags(image);
      for (const tag of imageTags) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet);
}

/**
 * Download a string as a file
 */
export function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
