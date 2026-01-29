import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, VisionClusterRequest, VisionClusterResponse } from "@/types";
import { clusterImagesWithVision } from "@/lib/vision/cluster";
import type { ClusterImageInput, ClusterResult, ImageClusterGroup } from "@/lib/vision";

const BATCH_SIZE = 20;
const DEFAULT_MAX_GROUPS = 10;
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === "true";

// Semantic tags for mock mode: [Broad Category, Specific Type, Vibe/Attribute]
const MOCK_SEMANTIC_TAGS: string[][] = [
  ["Gastronomy", "Dessert", "Sweet"],
  ["Architecture", "Urban", "Modern"],
  ["Portraits", "Business", "Professional"],
  ["Landscapes", "Coastal", "Serene"],
  ["Fashion", "Accessories", "Luxury"],
  ["Electronics", "Devices", "Modern"],
  ["Jewelry", "Rings", "Elegant"],
  ["Interiors", "Living Room", "Cozy"],
  ["Wildlife", "Birds", "Vibrant"],
  ["Botanicals", "Flowers", "Fresh"],
];

/**
 * Generate mock cluster results for development/testing
 */
function generateMockClusterResult(images: ClusterImageInput[], maxGroups: number): ClusterResult {
  // Simulate processing delay
  const groupCount = Math.min(maxGroups, Math.ceil(images.length / 3));
  const groups: ImageClusterGroup[] = [];

  for (let i = 0; i < groupCount; i++) {
    const startIdx = Math.floor((i * images.length) / groupCount);
    const endIdx = Math.floor(((i + 1) * images.length) / groupCount);
    const groupImages = images.slice(startIdx, endIdx);

    // Cycle through semantic tags
    const semanticTags = MOCK_SEMANTIC_TAGS[i % MOCK_SEMANTIC_TAGS.length] ?? ["Unlabeled"];

    groups.push({
      groupId: `mock_group_${i + 1}`,
      imageIds: groupImages.map((img) => img.id),
      title: semanticTags[0], // Use the first tag as the title
      suggestedLabel: semanticTags[0],
      semanticTags: semanticTags,
      confidence: 0.85 + Math.random() * 0.1,
    });
  }

  return { groups };
}

function validateRequest(body: VisionClusterRequest): string | null {
  if (!body.images || !Array.isArray(body.images)) {
    return "Images array is required";
  }
  if (body.images.length < 2) {
    return "At least 2 images are required for clustering";
  }
  for (const img of body.images) {
    if (!img.id || typeof img.id !== "string") {
      return "Each image must have a valid id";
    }
    if (!img.dataUrl || !img.dataUrl.startsWith("data:image/")) {
      return "Each image must have a valid base64 data URL";
    }
  }
  if (body.marketplace && !["ETSY", "ADOBE_STOCK"].includes(body.marketplace)) {
    return "Invalid marketplace. Must be ETSY or ADOBE_STOCK";
  }
  return null;
}

/**
 * Chunk an array into smaller arrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Exact-match banned labels (only ban if the ENTIRE label matches these)
const EXACT_MATCH_BANNED = [
  // Ultra-generic nouns (exact match only to avoid banning "Beauty Products")
  "objects",
  "object",
  "items",
  "item",
  "things",
  "thing",
  "entities",
  "entity",
  "elements",
  "element",
  "stuff",
  "products",
  "product",
  "goods",
  "merchandise",
  // Vague categories
  "general",
  "mixed",
  "miscellaneous",
  "random",
  "assorted",
  "various",
  "other",
  "collection",
  "uncategorized",
  "undefined",
  "unknown",
  "group",
  "set",
  "batch",
];

// Fuzzy-match banned labels (ban if label contains these anywhere)
const FUZZY_MATCH_BANNED = [
  // Medium descriptors (always ban these as they describe the medium, not content)
  "stock image",
  "stock photo",
  "stock photography",
  "creative assets",
  "visual content",
  "photography",
  "photograph",
  "picture",
  "image",
  "media",
  "photo",
  "asset",
  "content",
  // Multi-word vague labels
  "mixed content",
  "various items",
  "product shot",
  "product shots",
  "lifestyle shot",
];

/**
 * Check if a label is banned (too vague or meta)
 * Uses exact match for generic nouns, fuzzy match for medium descriptors
 */
function isBannedLabel(label: string | undefined): boolean {
  if (!label) return true;
  const normalized = label.toLowerCase().trim();

  // Check exact match for generic nouns (e.g., "Products" banned, but "Beauty Products" OK)
  if (EXACT_MATCH_BANNED.includes(normalized)) return true;

  // Check fuzzy match for medium descriptors (e.g., "Stock Image" banned anywhere)
  for (const banned of FUZZY_MATCH_BANNED) {
    if (normalized.includes(banned)) {
      return true;
    }
  }

  return false;
}

/**
 * Simple index-based fallback for group titles.
 * We no longer try to guess from filenames - stock photo names are too messy.
 */
function getIndexFallback(index: number): string {
  return `Untitled Group ${index + 1}`;
}

/**
 * Valid Title Logic - Simple and predictable
 * Priority: 1. AI Title -> 2. First Semantic Tag -> 3. "Untitled Group N"
 */
function getValidTitle(
  title: string | undefined,
  semanticTags: string[] | undefined,
  index: number
): string {
  // Priority 1: AI-provided title (if not banned)
  if (title && !isBannedLabel(title)) {
    return title;
  }

  // Priority 2: First valid semantic tag
  if (semanticTags && semanticTags.length > 0) {
    const firstValidTag = semanticTags.find((tag) => !isBannedLabel(tag));
    if (firstValidTag) return firstValidTag;
  }

  // Priority 3: Simple index-based fallback (no filename guessing)
  return getIndexFallback(index);
}

/**
 * REPLACEMENT: Sanitize Tags
 * Just removes banned ones. Returns empty array if none valid.
 */
function sanitizeSemanticTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) return [];
  return tags.filter((tag) => !isBannedLabel(tag));
}

/**
 * Normalize a label for comparison (lowercase, trimmed, singular form)
 */
function normalizeLabel(label: string): string {
  let normalized = label.toLowerCase().trim();
  // Remove common suffixes for comparison
  if (normalized.endsWith("s") && normalized.length > 3) {
    normalized = normalized.slice(0, -1);
  }
  // Remove "&" variations
  normalized = normalized.replace(/\s*&\s*/g, " and ");
  normalized = normalized.replace(/\s+/g, " ");
  return normalized;
}

/**
 * Merge groups with duplicate or similar labels (based on first semantic tag)
 */
function mergeDuplicateGroups(result: ClusterResult): ClusterResult {
  const labelMap = new Map<string, ImageClusterGroup>();

  for (const group of result.groups) {
    // Use first semantic tag for grouping, fall back to suggestedLabel
    const primaryTag = group.semanticTags?.[0] || group.suggestedLabel || "";
    const normalizedLabel = normalizeLabel(primaryTag);

    // If the label is extremely generic (like "Unlabeled Batch"), do NOT merge based on it.
    // We want to keep unbranded groups separate so the user can fix them.
    if (normalizedLabel.includes("unlabeled") || normalizedLabel.length < 2) {
      // Just push it with a unique key so it doesn't merge
      labelMap.set(`unique_${Math.random()}`, group);
      continue;
    }

    if (labelMap.has(normalizedLabel)) {
      // Merge into existing group
      const existing = labelMap.get(normalizedLabel)!;
      existing.imageIds = [...existing.imageIds, ...group.imageIds];
      // Keep higher confidence
      existing.confidence = Math.max(existing.confidence, group.confidence);
    } else {
      // Add new group (clone to avoid mutation)
      labelMap.set(normalizedLabel, {
        ...group,
        imageIds: [...group.imageIds],
        semanticTags: group.semanticTags ? [...group.semanticTags] : undefined,
      });
    }
  }

  // Convert back to array with new group IDs
  const mergedGroups = Array.from(labelMap.values()).map((group, index) => ({
    ...group,
    groupId: `group-${index + 1}`,
  }));

  console.log(
    `[Cluster API] Merged ${result.groups.length} groups into ${mergedGroups.length} unique groups`
  );

  return { groups: mergedGroups };
}

/**
 * Merge multiple cluster results into a single unified result.
 * Groups from different batches are combined with unique group IDs.
 */
function mergeClusterResults(results: ClusterResult[]): ClusterResult {
  const allGroups: ClusterResult["groups"] = [];
  let groupIndex = 0;

  for (const result of results) {
    for (const group of result.groups) {
      const sanitizedTags = sanitizeSemanticTags(group.semanticTags);
      const validTitle = getValidTitle(
        group.title || group.suggestedLabel,
        sanitizedTags,
        groupIndex
      );

      allGroups.push({
        ...group,
        groupId: `merged_${groupIndex}_${group.groupId}`,
        title: validTitle,
        suggestedLabel: validTitle,
        semanticTags: sanitizedTags,
      });
      groupIndex++;
    }
  }

  return { groups: allGroups };
}

/**
 * Ensure all groups in a result have valid labels (non-vague)
 */
function ensureLabels(result: ClusterResult): ClusterResult {
  return {
    groups: result.groups.map((group, index) => {
      const sanitizedTags = sanitizeSemanticTags(group.semanticTags);
      const validTitle = getValidTitle(group.title || group.suggestedLabel, sanitizedTags, index);

      return {
        ...group,
        title: validTitle,
        suggestedLabel: validTitle,
        semanticTags: sanitizedTags,
      };
    }),
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VisionClusterResponse>>> {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as VisionClusterRequest;
    const validationError = validateRequest(body);

    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const { images, marketplace, maxGroups = DEFAULT_MAX_GROUPS } = body;

    let clusterResult: ClusterResult;

    // Mock mode: bypass real API calls for development/testing
    if (IS_MOCK_MODE) {
      console.log(`[Cluster API] MOCK MODE - Generating mock clusters for ${images.length} images`);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
      clusterResult = generateMockClusterResult(images as ClusterImageInput[], maxGroups);
    } else if (images.length <= BATCH_SIZE) {
      // If images fit in a single batch, process directly
      const rawResult = await clusterImagesWithVision(images, marketplace, maxGroups);
      clusterResult = ensureLabels(rawResult);
    } else {
      // Automatic batching: chunk images and process sequentially
      const batches = chunkArray(images as ClusterImageInput[], BATCH_SIZE);
      console.log(
        `[Cluster API] Processing ${images.length} images in ${batches.length} batches of up to ${BATCH_SIZE}`
      );

      const batchResults: ClusterResult[] = [];

      for (const [i, batch] of batches.entries()) {
        console.log(
          `[Cluster API] Processing batch ${i + 1}/${batches.length} (${batch.length} images)`
        );

        // Calculate proportional maxGroups for this batch
        const batchMaxGroups = Math.max(2, Math.ceil((maxGroups * batch.length) / images.length));

        const batchResult = await clusterImagesWithVision(batch, marketplace, batchMaxGroups);
        batchResults.push(batchResult);
      }

      // Merge all batch results
      clusterResult = mergeClusterResults(batchResults);
      console.log(
        `[Cluster API] Merged ${batchResults.length} batches into ${clusterResult.groups.length} groups`
      );
    }

    // Final processing: sanitize labels and merge duplicates
    const sanitizedResult = ensureLabels(clusterResult);
    const finalResult = mergeDuplicateGroups(sanitizedResult);

    return NextResponse.json({
      success: true,
      data: {
        groups: finalResult.groups,
        processingTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Vision cluster API error:", error);
    const message = error instanceof Error ? error.message : "Clustering failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
