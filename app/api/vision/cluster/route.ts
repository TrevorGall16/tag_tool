import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, VisionClusterRequest, VisionClusterResponse } from "@/types";
import { clusterImagesWithVision } from "@/lib/vision/cluster";
import type { ClusterImageInput, ClusterResult } from "@/lib/vision";

const BATCH_SIZE = 20;
const DEFAULT_MAX_GROUPS = 10;

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
      allGroups.push({
        ...group,
        groupId: `merged_${groupIndex++}_${group.groupId}`,
      });
    }
  }

  return { groups: allGroups };
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

    // If images fit in a single batch, process directly
    if (images.length <= BATCH_SIZE) {
      clusterResult = await clusterImagesWithVision(images, marketplace, maxGroups);
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
