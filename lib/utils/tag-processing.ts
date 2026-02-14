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
 * Full tag processing pipeline: blacklist → deduplicate.
 */
export function processTags(tags: string[], blacklist: string[]): string[] {
  const filtered = applyBlacklist(tags, blacklist);
  return deduplicateTags(filtered);
}
