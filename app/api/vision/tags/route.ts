import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, VisionTagsRequest, VisionTagsResponse, TagImageInput } from "@/types";
import { generateTagsForImages } from "@/lib/vision/tags";
import type { ImageTagResult } from "@/lib/vision";
import { checkRateLimit } from "@/lib/ratelimit";

const STRATEGY_LABELS: Record<string, string> = {
  standard: "Standard",
  etsy: "Etsy SEO",
  stock: "Stock Expert",
};

const MAX_IMAGES_PER_REQUEST = 10;
const IS_MOCK_MODE = process.env.NODE_ENV === "development" && process.env.MOCK_API === "true";

// Sample mock tags for realistic testing
const MOCK_TAGS = [
  "handmade",
  "vintage",
  "boho",
  "minimalist",
  "rustic",
  "modern",
  "farmhouse",
  "bohemian",
  "scandinavian",
  "industrial",
  "cottagecore",
  "aesthetic",
  "unique",
  "artisan",
  "custom",
  "personalized",
  "gift",
  "home decor",
  "wall art",
  "jewelry",
  "accessories",
  "clothing",
  "organic",
  "sustainable",
  "eco-friendly",
];

const MOCK_TITLES = [
  "Handcrafted Artisan Collection",
  "Vintage-Inspired Design",
  "Modern Minimalist Style",
  "Boho Chic Piece",
  "Rustic Farmhouse Decor",
  "Unique Gift Item",
  "Custom Made Creation",
];

/**
 * Generate mock tag results for development/testing
 */
function generateMockTagResults(images: TagImageInput[], maxTags: number): ImageTagResult[] {
  return images.map((img) => {
    // Randomly select tags
    const shuffled = [...MOCK_TAGS].sort(() => Math.random() - 0.5);
    const tagCount = Math.min(maxTags, 10 + Math.floor(Math.random() * 15));
    const tags = shuffled.slice(0, tagCount);

    // Random title
    const title = MOCK_TITLES[Math.floor(Math.random() * MOCK_TITLES.length)] ?? "Mock Item";

    return {
      imageId: img.id,
      title,
      description: `Mock description for ${title.toLowerCase()}`,
      tags,
      confidence: 0.8 + Math.random() * 0.15,
    };
  });
}

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
  if (body.platform && !["GENERIC", "ADOBE", "SHUTTERSTOCK", "ETSY"].includes(body.platform)) {
    return "Invalid platform. Must be GENERIC, ADOBE, SHUTTERSTOCK, or ETSY";
  }
  return null;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VisionTagsResponse>>> {
  const startTime = Date.now();

  try {
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

    const body = (await request.json()) as VisionTagsRequest;
    const validationError = validateRequest(body);

    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const { images, marketplace, strategy = "standard", maxTags = 25, platform } = body;

    if (images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_IMAGES_PER_REQUEST} images per request`,
        },
        { status: 400 }
      );
    }

    // Billing: charge for total images in the group, not just the sample sent for analysis.
    // totalImageCount is the real group size; images.length is the sample (up to 4).
    const creditsRequired = body.totalImageCount ?? images.length;
    const strategyLabel = STRATEGY_LABELS[strategy] || "Standard";

    // Validate: totalImageCount must be >= sample size (can't undercount)
    if (body.totalImageCount !== undefined) {
      if (!Number.isInteger(body.totalImageCount) || body.totalImageCount < images.length) {
        return NextResponse.json(
          {
            success: false,
            error: "totalImageCount must be an integer >= the number of sample images",
          },
          { status: 400 }
        );
      }
    }

    // ── RESERVE: Deduct credits + create PENDING ledger entry ──
    let ledgerEntryId: string | null = null;

    if (session?.user?.id && !IS_MOCK_MODE) {
      try {
        ledgerEntryId = await prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id: session.user.id },
            data: { creditsBalance: { decrement: creditsRequired } },
          });

          if (user.creditsBalance < 0) {
            throw new Error("Insufficient credits");
          }

          const ledgerEntry = await tx.creditsLedger.create({
            data: {
              userId: session.user.id,
              amount: -creditsRequired,
              reason: "USAGE",
              status: "PENDING",
              description: `Tag Generation (${strategyLabel}) - ${creditsRequired} image${creditsRequired > 1 ? "s" : ""}`,
            },
          });

          return ledgerEntry.id;
        });
      } catch (creditError) {
        const msg = creditError instanceof Error ? creditError.message : "Unknown";
        console.error("[Credits] Reserve failed:", msg);
        return NextResponse.json(
          {
            success: false,
            error: msg.includes("Insufficient credits")
              ? "Insufficient credits. Please purchase more to continue."
              : "Credit deduction failed. Please try again.",
          },
          { status: 402 }
        );
      }
    }

    // ── PROCESS: Call AI ──
    let results: ImageTagResult[];

    // Mock mode: bypass real API calls for development/testing
    if (IS_MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));
      results = generateMockTagResults(images, maxTags);
    } else {
      try {
        results = await generateTagsForImages(images, marketplace, strategy, maxTags, platform);
      } catch (aiError) {
        // ── FAILED: Mark ledger entry FAILED and refund credits ──
        if (ledgerEntryId && session?.user?.id) {
          try {
            await prisma.$transaction(async (tx) => {
              await tx.creditsLedger.update({
                where: { id: ledgerEntryId },
                data: { status: "FAILED" },
              });
              await tx.user.update({
                where: { id: session.user.id },
                data: { creditsBalance: { increment: creditsRequired } },
              });
            });
          } catch (refundError) {
            console.error(
              "[Credits] Refund failed — PENDING entry remains for manual resolution:",
              refundError
            );
          }
        }
        throw aiError; // Re-throw to hit the outer catch → 500 response
      }
    }

    // ── CAPTURE: Mark ledger entry CONFIRMED ──
    if (ledgerEntryId) {
      try {
        await prisma.creditsLedger.update({
          where: { id: ledgerEntryId },
          data: { status: "CONFIRMED" },
        });
      } catch (confirmError) {
        // Non-fatal: credits already deducted, just log the status update failure
        console.error("[Credits] Failed to confirm ledger entry:", confirmError);
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
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
