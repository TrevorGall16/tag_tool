/**
 * Default blacklist — common stock agency rejection words.
 */
export const DEFAULT_TAG_BLACKLIST: string[] = [
  "ai generated",
  "generative ai",
  "render",
  "illustration",
  "3d render",
];

/**
 * Fix CamelCase tags that slip through prompt instructions.
 * "AsianDesserts" → "asian desserts", "StreetFood" → "street food"
 * Only splits on camelCase boundaries; leaves normal words untouched.
 * Preserves internal spaces — only trims the ends.
 */
export function fixCamelCase(tag: string): string {
  // Insert a space before each uppercase letter that follows a lowercase letter or digit
  return tag
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .trim();
}

/**
 * Strip leading # from hashtag-formatted tags.
 * "#sunset" → "sunset"
 */
function stripHashtag(tag: string): string {
  return tag.replace(/^#+/, "");
}

/**
 * Normalize a single tag: strip hashtags, fix CamelCase, trim ends.
 * Does NOT strip internal spaces — "asian desserts" stays as-is.
 */
function normalizeTag(tag: string): string {
  const stripped = stripHashtag(tag.trim());
  return fixCamelCase(stripped);
}

/**
 * Filter tags against a blacklist (case-insensitive partial match).
 * A tag is removed if it contains any blacklisted phrase as a substring.
 */
export function applyBlacklist(tags: string[], blacklist: string[]): string[] {
  if (blacklist.length === 0) return tags;
  const lowerBlacklist = blacklist.map((b) => b.toLowerCase().trim()).filter(Boolean);
  return tags.filter((tag) => {
    const lowerTag = tag.toLowerCase();
    return !lowerBlacklist.some((banned) => lowerTag.includes(banned));
  });
}

/**
 * Deduplicate tags:
 *  1. Case-insensitive — "Dog" and "dog" are the same, keep the first occurrence.
 *  2. Exact duplicates are collapsed.
 *  3. Empty/whitespace-only strings are removed.
 */
export function deduplicateTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Full tag processing pipeline: normalize → blacklist → deduplicate.
 */
export function processTags(tags: string[], blacklist: string[]): string[] {
  const normalized = tags.map(normalizeTag);
  const filtered = applyBlacklist(normalized, blacklist);
  return deduplicateTags(filtered);
}
