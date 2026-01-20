import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, VisionClusterRequest, VisionClusterResponse } from "@/types";
import { clusterImagesWithVision } from "@/lib/vision/cluster";

const MAX_IMAGES_PER_REQUEST = 20;
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

    if (images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_IMAGES_PER_REQUEST} images per clustering request`,
        },
        { status: 400 }
      );
    }

    const clusterResult = await clusterImagesWithVision(images, marketplace, maxGroups);

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
