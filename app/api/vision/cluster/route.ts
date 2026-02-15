import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type {
  ApiResponse,
  VisionClusterRequest,
  VisionClusterResponse,
  ClusterSettings,
} from "@/types";
import { clusterImagesWithVision } from "@/lib/vision/cluster";
import type { ClusterImageInput, ClusterResult, ImageClusterGroup } from "@/lib/vision";
import { checkRateLimit } from "@/lib/ratelimit";

const BATCH_SIZE = 20;
const DEFAULT_MAX_GROUPS = 10;
const MAX_IMAGES_PER_REQUEST = 100;
const IS_MOCK_MODE = process.env.NODE_ENV === "development" && process.env.MOCK_API === "true";

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

// Approved categories from the prompt - if AI returns one of these, it's valid
const APPROVED_CATEGORIES = [
  "gastronomy",
  "architecture",
  "interiors",
  "fashion",
  "nature",
  "people",
  "technology",
  "transportation",
  "art & design",
  "objects",
];

// Minimal ban list - only ban truly useless labels
// We're more permissive now because we're forcing the AI to use approved categories
const BANNED_LABELS = [
  // Only ban medium descriptors that describe the file, not content
  "stock image",
  "stock photo",
  "untitled",
  "unnamed",
  "no title",
];

/**
 * SIMPLIFIED: Check if a title is valid (trust the AI!)
 * Only reject obvious placeholders. Accept everything else.
 */
function isValidTitle(title: string | undefined): boolean {
  if (!title || title.trim().length < 2) return false;

  const lower = title.toLowerCase().trim();

  // Only ban obvious placeholder patterns
  if (lower === "untitled" || lower.includes("untitled group")) return false;
  if (lower.startsWith("group ") && /^group \d+$/.test(lower)) return false;
  if (lower.startsWith("batch ")) return false;
  if (lower === "unnamed" || lower === "unknown") return false;

  // TRUST THE AI - accept everything else!
  return true;
}

/**
 * SIMPLIFIED: Get the title from AI response
 * Trust the AI's output - minimal filtering
 */
function getAITitle(
  title: string | undefined,
  semanticTags: string[] | undefined,
  index: number
): string {
  // Priority 1: AI-provided title (TRUST IT)
  if (isValidTitle(title)) {
    return title!;
  }

  // Priority 2: First semantic tag (TRUST IT)
  if (semanticTags && semanticTags.length > 0 && isValidTitle(semanticTags[0])) {
    return semanticTags[0]!;
  }

  // Priority 3: Last resort fallback
  return `Group ${index + 1}`;
}

/**
 * Format final title with optional prefix
 */
function formatFinalTitle(
  aiTitle: string,
  settings: ClusterSettings | undefined,
  index: number
): string {
  const prefix = settings?.prefix?.trim();
  const startNum = (settings?.startNumber || 1) + index;

  // No prefix - just return the AI title
  if (!prefix) {
    return aiTitle;
  }

  // Has prefix - check if title is a fallback or real category
  const isFallback = aiTitle.startsWith("Group ");
  if (isFallback) {
    // Fallback: "Prefix 01"
    return `${prefix} ${String(startNum).padStart(2, "0")}`;
  }

  // Real category: "Prefix - Category"
  return `${prefix} - ${aiTitle}`;
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
 * Check if a label is a generic placeholder that should NOT be used for merging
 */
function isGenericLabel(label: string): boolean {
  const lower = label.toLowerCase().trim();
  // Reject "Group 1", "Batch 2", "Set 3", etc.
  if (/^(group|batch|set|untitled|unnamed)\s*\d*$/i.test(lower)) return true;
  if (lower.includes("unlabeled") || lower.includes("uncategorized")) return true;
  if (lower.length < 2) return true;
  return false;
}

/**
 * Merge groups with duplicate or similar labels (based on first semantic tag)
 * Uses CASE-INSENSITIVE comparison for merging
 */
function mergeDuplicateGroups(result: ClusterResult): ClusterResult {
  const labelMap = new Map<string, ImageClusterGroup>();

  for (const group of result.groups) {
    // Use first semantic tag for grouping, fall back to title, then suggestedLabel
    const primaryTag = group.semanticTags?.[0] || group.title || group.suggestedLabel || "";
    const normalizedLabel = normalizeLabel(primaryTag);

    // If the label is generic (like "Group 1"), do NOT merge based on it.
    // Give it a unique key so it stays separate for user to fix.
    if (isGenericLabel(primaryTag)) {
      labelMap.set(`unique_${Math.random()}`, group);
      continue;
    }

    if (labelMap.has(normalizedLabel)) {
      // Merge into existing group
      const existing = labelMap.get(normalizedLabel)!;
      existing.imageIds = [...existing.imageIds, ...group.imageIds];
      // Keep higher confidence
      existing.confidence = Math.max(existing.confidence, group.confidence);

      // MERGE and DEDUPE semantic tags from both groups
      const allTags = new Set([...(existing.semanticTags || []), ...(group.semanticTags || [])]);
      // Remove the title from tags to avoid redundancy
      if (existing.title) allTags.delete(existing.title);
      existing.semanticTags = Array.from(allTags);
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

  return { groups: mergedGroups };
}

/**
 * Merge multiple cluster results into a single unified result.
 * Groups from different batches are combined with unique group IDs.
 */
function mergeClusterResults(results: ClusterResult[], settings?: ClusterSettings): ClusterResult {
  const allGroups: ClusterResult["groups"] = [];
  let groupIndex = 0;

  for (const result of results) {
    for (const group of result.groups) {
      // TRUST THE AI: Get title directly from AI response
      const aiTitle = getAITitle(group.title, group.semanticTags, groupIndex);
      // Apply prefix exactly once
      const finalTitle = formatFinalTitle(aiTitle, settings, groupIndex);

      allGroups.push({
        ...group,
        groupId: `merged_${groupIndex}_${group.groupId}`,
        title: finalTitle,
        suggestedLabel: finalTitle,
        semanticTags: group.semanticTags,
      });
      groupIndex++;
    }
  }

  return { groups: allGroups };
}

/**
 * Ensure all groups in a result have valid labels (non-vague)
 * SIMPLIFIED: Trust the AI output, minimal filtering
 */
function ensureLabels(result: ClusterResult, settings?: ClusterSettings): ClusterResult {
  return {
    groups: result.groups.map((group, index) => {
      // TRUST THE AI: Get title directly from AI response
      const aiTitle = getAITitle(group.title, group.semanticTags, index);

      // Apply prefix exactly once
      const finalTitle = formatFinalTitle(aiTitle, settings, index);

      return {
        ...group,
        title: finalTitle,
        suggestedLabel: finalTitle,
        semanticTags: group.semanticTags,
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

    const { images, marketplace, maxGroups = DEFAULT_MAX_GROUPS, settings } = body;

    if (images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size limit exceeded. Maximum ${MAX_IMAGES_PER_REQUEST} images per request.`,
        },
        { status: 400 }
      );
    }

    // AUTH CHECK: Always require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // RATE LIMIT: 10 requests per minute per user
    const rateLimitResponse = await checkRateLimit(session.user.id);
    if (rateLimitResponse) return rateLimitResponse;

    let clusterResult: ClusterResult;

    // Mock mode: bypass real API calls for development/testing
    if (IS_MOCK_MODE) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
      clusterResult = generateMockClusterResult(images as ClusterImageInput[], maxGroups);
    } else if (images.length <= BATCH_SIZE) {
      // If images fit in a single batch, process directly
      const rawResult = await clusterImagesWithVision(
        images,
        marketplace,
        maxGroups,
        settings?.context
      );
      clusterResult = ensureLabels(rawResult, settings);
    } else {
      // Automatic batching: chunk images and process sequentially
      const batches = chunkArray(images as ClusterImageInput[], BATCH_SIZE);
      const batchResults: ClusterResult[] = [];

      for (const [, batch] of batches.entries()) {
        // Calculate proportional maxGroups for this batch
        const batchMaxGroups = Math.max(2, Math.ceil((maxGroups * batch.length) / images.length));

        const batchResult = await clusterImagesWithVision(
          batch,
          marketplace,
          batchMaxGroups,
          settings?.context
        );
        batchResults.push(batchResult);
      }

      // Merge all batch results
      clusterResult = mergeClusterResults(batchResults, settings);
    }

    // Final processing: sanitize labels and merge duplicates
    const sanitizedResult = ensureLabels(clusterResult, settings);
    const finalResult = mergeDuplicateGroups(sanitizedResult);

    return NextResponse.json({
      success: true,
      data: {
        groups: finalResult.groups,
        processingTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("[Cluster API] Error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
