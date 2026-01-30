import type { LocalGroup } from "@/store/useBatchStore";
import type { CsvRow, MarketplaceType } from "./types";
import { generateCsv } from "./csv-generator";

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate a stock photo submission CSV from clustered groups.
 * Maps each image to a row with its group's metadata.
 */
export function generateStockCSV(
  groups: LocalGroup[],
  marketplace: MarketplaceType = "ADOBE_STOCK",
  prefix?: string
): string {
  const rows: CsvRow[] = [];

  for (const group of groups) {
    // Skip unclustered/empty groups
    if (group.id === "unclustered" || group.images.length === 0) {
      continue;
    }

    // 1. CLEAN TITLE: Strip existing prefix and re-add cleanly to prevent doubling
    let cleanTitle = group.sharedTitle || "Untitled";

    if (prefix && prefix.trim()) {
      // Strip any existing prefix (case-insensitive) before re-adding
      const prefixPattern = new RegExp(`^${escapeRegExp(prefix)}[-_\\s]*`, "i");
      cleanTitle = cleanTitle.replace(prefixPattern, "").trim();
      // Re-add the prefix cleanly
      cleanTitle = `${prefix} - ${cleanTitle}`;
    } else {
      // No prefix provided, just deduplicate any existing duplicates
      cleanTitle = deduplicatePrefix(cleanTitle);
    }

    // 2. BUILD TAGS with universal safety net
    const keywords = buildKeywords(group);

    // 3. BUILD DESCRIPTION with fallback
    const description = buildDescription(group, keywords);

    for (const image of group.images) {
      rows.push({
        filename: image.originalFilename || image.id,
        title: cleanTitle,
        description,
        tags: keywords,
      });
    }
  }

  return generateCsv(rows, marketplace);
}

/**
 * Remove duplicate prefixes from title.
 * E.g., "TEST_ - TEST_ - River Scenes" -> "TEST_ - River Scenes"
 */
function deduplicatePrefix(title: string): string {
  // Split by common separators
  const parts = title.split(/\s*[-–—]\s*/);

  if (parts.length < 2) return title;

  // Check if first two parts are the same (case-insensitive)
  const seen = new Set<string>();
  const uniqueParts: string[] = [];

  for (const part of parts) {
    const normalized = part
      .toLowerCase()
      .replace(/[_\s]+$/, "")
      .trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      uniqueParts.push(part.trim());
    }
  }

  return uniqueParts.join(" - ");
}

/**
 * Build description from group metadata.
 * Generates a fallback using the keywords if description is empty.
 */
function buildDescription(group: LocalGroup, keywords: string): string {
  // Use explicit description if available
  if (group.sharedDescription && group.sharedDescription.trim()) {
    return group.sharedDescription;
  }

  // Generate fallback description from keywords
  const title = group.sharedTitle || "image";
  const keywordArray = keywords.split(", ").filter((k) => k !== title);

  if (keywordArray.length > 0) {
    const featuredTags = keywordArray.slice(0, 5).join(", ");
    return `Stock photo of ${title.toLowerCase()} featuring ${featuredTags}`;
  }

  return `Stock photo of ${title.toLowerCase()}`;
}

/**
 * Build comma-separated keywords from group metadata.
 * Combines: sharedTitle, semanticTags, sharedTags
 * Includes "Universal Tag Safety Net" - ensures NO group ever has sparse tags
 */
function buildKeywords(group: LocalGroup, globalTags: string[] = []): string {
  const tags = new Set<string>();
  const title = group.sharedTitle || "stock image";

  // 1. Add semantic tags (AI-generated)
  const semanticTags = group.semanticTags || [];
  for (const tag of semanticTags) {
    if (tag && tag.trim()) {
      tags.add(tag.trim());
    }
  }

  // 2. Add user-defined shared tags
  if (group.sharedTags && group.sharedTags.length > 0) {
    for (const tag of group.sharedTags) {
      if (tag && tag.trim()) {
        tags.add(tag.trim());
      }
    }
  }

  // 3. Add global tags (from export settings)
  for (const tag of globalTags) {
    if (tag && tag.trim()) {
      tags.add(tag.trim());
    }
  }

  // 4. UNIVERSAL TAG SAFETY NET: If tags are sparse (< 5), inject fallbacks
  if (tags.size < 5) {
    // A. Add universal stock photo tags
    tags.add("stock photo");
    tags.add("commercial");
    tags.add("high quality");
    tags.add("editorial");

    // B. Extract keywords from the title (e.g., "River Scenes" -> "river", "scenes")
    const titleWords = title
      .replace(/[-_]+/g, " ") // Replace separators with spaces
      .split(/\s+/)
      .filter((word) => word.length > 2) // Skip tiny words
      .map((word) => word.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((word) => word.length > 2);

    for (const word of titleWords) {
      tags.add(word);
    }

    // C. Add the full title as a tag too
    tags.add(title.toLowerCase());

    // D. Add category-specific fallbacks
    const categoryTags = getCategoryFallbackTags(title);
    for (const tag of categoryTags) {
      tags.add(tag);
    }
  }

  // Convert to array, with title first
  const result = [title, ...Array.from(tags).filter((t) => t !== title)];
  return result.join(", ");
}

/**
 * Get category-specific fallback tags based on title keywords
 */
function getCategoryFallbackTags(title: string): string[] {
  const titleLower = title.toLowerCase();

  // Check for category keywords and return relevant tags
  if (
    titleLower.includes("gastronomy") ||
    titleLower.includes("food") ||
    titleLower.includes("meal") ||
    titleLower.includes("dish")
  ) {
    return ["food", "meal", "cuisine", "dining", "delicious", "gourmet"];
  }
  if (
    titleLower.includes("architecture") ||
    titleLower.includes("building") ||
    titleLower.includes("urban")
  ) {
    return ["building", "urban", "city", "structure", "modern", "exterior"];
  }
  if (
    titleLower.includes("nature") ||
    titleLower.includes("landscape") ||
    titleLower.includes("outdoor")
  ) {
    return ["nature", "outdoor", "scenic", "environment", "natural", "green"];
  }
  if (
    titleLower.includes("people") ||
    titleLower.includes("portrait") ||
    titleLower.includes("person")
  ) {
    return ["person", "lifestyle", "portrait", "human", "face", "adult"];
  }
  if (
    titleLower.includes("object") ||
    titleLower.includes("product") ||
    titleLower.includes("item")
  ) {
    return ["object", "product", "item", "detail", "closeup", "studio"];
  }
  if (
    titleLower.includes("transport") ||
    titleLower.includes("vehicle") ||
    titleLower.includes("car")
  ) {
    return ["vehicle", "transport", "travel", "motion", "speed", "road"];
  }
  if (
    titleLower.includes("river") ||
    titleLower.includes("water") ||
    titleLower.includes("sea") ||
    titleLower.includes("ocean")
  ) {
    return ["water", "river", "scenic", "nature", "blue", "reflection"];
  }
  if (
    titleLower.includes("sky") ||
    titleLower.includes("cloud") ||
    titleLower.includes("sunset") ||
    titleLower.includes("sunrise")
  ) {
    return ["sky", "clouds", "atmospheric", "weather", "dramatic", "horizon"];
  }
  if (titleLower.includes("street") || titleLower.includes("city") || titleLower.includes("town")) {
    return ["street", "urban", "city", "downtown", "cityscape", "pedestrian"];
  }

  // Universal fallback if no category matches
  return ["background", "concept", "abstract", "texture", "pattern"];
}

/**
 * Trigger a browser download of the CSV file
 */
export function downloadStockCSV(
  groups: LocalGroup[],
  marketplace: MarketplaceType = "ADOBE_STOCK"
): void {
  const csv = generateStockCSV(groups, marketplace);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `stock_submission_${date}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get count of exportable images (excludes unclustered group)
 */
export function getExportableImageCount(groups: LocalGroup[]): number {
  return groups.filter((g) => g.id !== "unclustered").reduce((sum, g) => sum + g.images.length, 0);
}
