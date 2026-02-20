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

const DEFAULT_MAX_GROUPS = 10;
// Each invocation processes ONE client-sent chunk. The frontend slices large batches
// and calls this endpoint per chunk, keeping each invocation well within timeout limits.
const MAX_IMAGES_PER_REQUEST = 20;
const IS_MOCK_MODE = process.env.NODE_ENV === "development" && process.env.MOCK_API === "true";

// Allow up to 60 s on Vercel Pro. One AI call per invocation keeps this easily under budget.
export const maxDuration = 60;

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
  // Guard against duplicate prefix (e.g., AI already returned "Prefix - Something")
  const normalizedTitle = aiTitle.toLowerCase().trim();
  const normalizedPrefix = prefix.toLowerCase();
  if (
    normalizedTitle.startsWith(normalizedPrefix + " - ") ||
    normalizedTitle.startsWith(normalizedPrefix + " ")
  ) {
    return aiTitle;
  }

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
  let sessionUserId: string | undefined;

  try {
    // AUTH CHECK: Always require authentication (before parsing body to avoid wasted CPU)
    const session = await getServerSession(authOptions);
    sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // RATE LIMIT: 10 requests per minute per user
    const rateLimitResponse = await checkRateLimit(sessionUserId);
    if (rateLimitResponse) return rateLimitResponse;

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

    let clusterResult: ClusterResult;

    // Stateless: process exactly the chunk that was sent. No internal looping.
    // The client orchestrates chunking and progress tracking.
    if (IS_MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
      clusterResult = generateMockClusterResult(images as ClusterImageInput[], maxGroups);
    } else {
      const rawResult = await clusterImagesWithVision(
        images as ClusterImageInput[],
        marketplace,
        maxGroups,
        settings?.context
      );
      clusterResult = ensureLabels(rawResult, settings);
    }

    // Final processing: sanitize labels and merge duplicates
    const sanitizedResult = ensureLabels(clusterResult, settings);
    const finalResult = mergeDuplicateGroups(sanitizedResult);

    const processingTimeMs = Date.now() - startTime;

    // Structured telemetry — never log base64 image data
    console.log(
      JSON.stringify({
        event: "cluster_complete",
        userId: sessionUserId,
        context: settings?.context || "EMPTY",
        imageCount: images.length,
        groupCount: finalResult.groups.length,
        groupNames: finalResult.groups.map((g) => g.title),
        processingTimeMs,
        mock: IS_MOCK_MODE,
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        groups: finalResult.groups,
        processingTimeMs,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown";
    console.error(
      JSON.stringify({
        event: "cluster_error",
        userId: sessionUserId ?? "unknown",
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      })
    );

    const isOverloaded =
      /timeout|overloaded|rate.?limit|503|529|too many/i.test(errorMessage) ||
      errorMessage.includes("fetch failed");

    return NextResponse.json(
      {
        success: false,
        error: isOverloaded
          ? "The AI is currently overloaded. Please try again in a moment."
          : "Internal server error",
      },
      { status: isOverloaded ? 503 : 500 }
    );
  }
}
