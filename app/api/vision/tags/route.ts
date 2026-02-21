import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

const MAX_DATA_URL_BYTES = 4 * 1024 * 1024; // 4 MB per image (post-resize thumbnails are well under this)

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
    // Reject oversized payloads before they reach the AI layer.
    // JS strings are UTF-16 internally but base64 is pure ASCII, so
    // .length ≈ byte length for this check.
    if (img.dataUrl.length > MAX_DATA_URL_BYTES) {
      return `Image ${img.id} exceeds the 4 MB payload limit. Resize before uploading.`;
    }
  }
  if (!body.marketplace || !["ETSY", "ADOBE_STOCK"].includes(body.marketplace)) {
    return "Invalid marketplace. Must be ETSY or ADOBE_STOCK";
  }
  if (body.platform && !["GENERIC", "ADOBE", "SHUTTERSTOCK", "ETSY"].includes(body.platform)) {
    return "Invalid platform. Must be GENERIC, ADOBE, SHUTTERSTOCK, or ETSY";
  }
  if (
    body.totalImageCount !== undefined &&
    (body.totalImageCount < body.images.length || body.totalImageCount > 10_000)
  ) {
    return "totalImageCount must be >= images.length and <= 10000";
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

    const {
      images,
      marketplace,
      strategy = "standard",
      maxTags = 25,
      platform,
      totalImageCount,
    } = body;

    if (images.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_IMAGES_PER_REQUEST} images per request`,
        },
        { status: 400 }
      );
    }

    // Billing is based on the full group size (totalImageCount), not just the
    // representative sample sent for AI analysis. The client declares how many
    // images it is tagging; the server validates the claim is ≥ sample length
    // and ≤ 10 000 (enforced in validateRequest above).
    const creditsRequired = totalImageCount ?? images.length;
    const strategyLabel = STRATEGY_LABELS[strategy] || "Standard";

    // Task 2: Pre-check balance without deducting (read-only, no lock).
    // Deduction happens AFTER AI succeeds, so a serverless crash/timeout never
    // orphans credits in a PENDING state. The WHERE guard on the post-deduct
    // transaction closes the concurrent-request race window at the DB level.
    if (!IS_MOCK_MODE) {
      const userBalance = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { creditsBalance: true },
      });
      if (!userBalance || userBalance.creditsBalance < creditsRequired) {
        return NextResponse.json(
          { success: false, error: "Insufficient credits. Please purchase more to continue." },
          { status: 402 }
        );
      }
    }

    // ── PROCESS: Call AI ──
    // If this throws, no credits were touched — the outer catch returns 500 cleanly.
    let results: ImageTagResult[];
    if (IS_MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));
      results = generateMockTagResults(images, maxTags);
    } else {
      results = await generateTagsForImages(images, marketplace, strategy, maxTags, platform);
    }

    // ── CAPTURE: Atomically deduct credits only after AI succeeds ──
    // WHERE creditsBalance >= creditsRequired is a conditional row-level guard:
    // if a concurrent request drained the balance between the pre-check and here,
    // Prisma throws P2025 instead of letting the balance go negative.
    if (!IS_MOCK_MODE) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: {
              id: session.user.id,
              creditsBalance: { gte: creditsRequired },
            },
            data: { creditsBalance: { decrement: creditsRequired } },
          });
          await tx.creditsLedger.create({
            data: {
              userId: session.user.id,
              amount: -creditsRequired,
              reason: "USAGE",
              status: "CONFIRMED",
              description: `Tag Generation (${strategyLabel}) - ${creditsRequired} image${creditsRequired > 1 ? "s" : ""}`,
            },
          });
        });
      } catch (deductErr) {
        if (
          deductErr instanceof Prisma.PrismaClientKnownRequestError &&
          deductErr.code === "P2025"
        ) {
          // Concurrent race: another request consumed the credits between pre-check and deduct.
          console.error("[Credits] Race condition on deduct — returning 402", {
            userId: session.user.id,
          });
          return NextResponse.json(
            { success: false, error: "Insufficient credits. Please purchase more to continue." },
            { status: 402 }
          );
        }
        // Non-fatal DB error after AI already succeeded. Return the result to the user
        // and log for manual credit review.
        console.error("[Credits] CRITICAL: post-deduct failed after AI success:", deductErr);
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
