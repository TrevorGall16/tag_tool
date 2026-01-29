import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, VisionClusterRequest, VisionClusterResponse } from "@/types";
import { clusterImagesWithVision } from "@/lib/vision/cluster";
import type { ClusterImageInput, ClusterResult, ImageClusterGroup } from "@/lib/vision";

const BATCH_SIZE = 20;
const DEFAULT_MAX_GROUPS = 10;
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === "true";

// Semantic labels to cycle through in mock mode
const MOCK_SEMANTIC_LABELS = [
  "Architecture",
  "Food & Drink",
  "Nature",
  "Urban Life",
  "Products",
  "Portraits",
  "Abstract Art",
  "Technology",
  "Travel",
  "Lifestyle",
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

    // Cycle through semantic labels
    const semanticLabel = MOCK_SEMANTIC_LABELS[i % MOCK_SEMANTIC_LABELS.length];

    groups.push({
      groupId: `mock_group_${i + 1}`,
      imageIds: groupImages.map((img) => img.id),
      suggestedLabel: semanticLabel,
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

// Fallback labels when AI doesn't provide one
const FALLBACK_LABELS = ["General", "Mixed Content", "Assorted", "Various Items", "Collection"];

/**
 * Merge multiple cluster results into a single unified result.
 * Groups from different batches are combined with unique group IDs.
 */
function mergeClusterResults(results: ClusterResult[]): ClusterResult {
  const allGroups: ClusterResult["groups"] = [];
  let groupIndex = 0;

  for (const result of results) {
    for (const group of result.groups) {
      // Ensure unique group IDs by prefixing with index
      // Also ensure suggestedLabel is always populated
      allGroups.push({
        ...group,
        groupId: `merged_${groupIndex}_${group.groupId}`,
        suggestedLabel:
          group.suggestedLabel || FALLBACK_LABELS[groupIndex % FALLBACK_LABELS.length],
      });
      groupIndex++;
    }
  }

  return { groups: allGroups };
}

/**
 * Ensure all groups in a result have a suggestedLabel
 */
function ensureLabels(result: ClusterResult): ClusterResult {
  return {
    groups: result.groups.map((group, index) => ({
      ...group,
      suggestedLabel: group.suggestedLabel || FALLBACK_LABELS[index % FALLBACK_LABELS.length],
    })),
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

    return NextResponse.json({
      success: true,
      data: {
        groups: clusterResult.groups,
        processingTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Vision cluster API error:", error);
    const message = error instanceof Error ? error.message : "Clustering failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
