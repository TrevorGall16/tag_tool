import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, VisionTagsRequest, VisionTagsResponse } from "@/types";
import { generateTagsForImages } from "@/lib/vision/tags";

const STRATEGY_LABELS: Record<string, string> = {
  standard: "Standard",
  etsy: "Etsy SEO",
  stock: "Stock Expert",
};

const MAX_IMAGES_PER_REQUEST = 10;

function validateRequest(body: VisionTagsRequest): string | null {
  if (!body.images || !Array.isArray(body.images)) {
    return "Images array is required";
  }
  if (body.images.length === 0) {
    return "At least 1 image is required";
  }
  for (const img of body.images) {
    if (!img.id || typeof img.id !== "string") {
      return "Each image must have a valid id";
    }
    if (!img.dataUrl || !img.dataUrl.startsWith("data:image/")) {
      return "Each image must have a valid base64 data URL";
    }
  }
  if (!body.marketplace || !["ETSY", "ADOBE_STOCK"].includes(body.marketplace)) {
    return "Invalid marketplace. Must be ETSY or ADOBE_STOCK";
  }
  return null;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VisionTagsResponse>>> {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as VisionTagsRequest;
    const validationError = validateRequest(body);

    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const { images, marketplace, strategy = "standard", maxTags = 25 } = body;

    if (images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_IMAGES_PER_REQUEST} images per request`,
        },
        { status: 400 }
      );
    }

    const results = await generateTagsForImages(images, marketplace, strategy, maxTags);

    // Deduct credits for authenticated users
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const creditsToDeduct = images.length;
      const strategyLabel = STRATEGY_LABELS[strategy] || "Standard";

      try {
        await prisma.$transaction(async (tx) => {
          // Deduct credits
          const user = await tx.user.update({
            where: { id: session.user.id },
            data: { creditsBalance: { decrement: creditsToDeduct } },
          });

          // Check for negative balance
          if (user.creditsBalance < 0) {
            throw new Error("Insufficient credits");
          }

          // Log to ledger
          await tx.creditsLedger.create({
            data: {
              userId: session.user.id,
              amount: -creditsToDeduct,
              reason: "USAGE",
              description: `Tag Generation (${strategyLabel}) - ${creditsToDeduct} image${creditsToDeduct > 1 ? "s" : ""}`,
            },
          });
        });

        console.log(
          `[Credits] Deducted ${creditsToDeduct} credits from user ${session.user.id} for ${strategyLabel} analysis`
        );
      } catch (creditError) {
        console.error("[Credits] Failed to deduct credits:", creditError);
        // Continue with the response - credits deduction failure shouldn't block the user
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        processingTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Vision tags API error:", error);
    const message = error instanceof Error ? error.message : "Tag generation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
