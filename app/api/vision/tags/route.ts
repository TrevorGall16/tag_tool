import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, VisionTagsRequest, VisionTagsResponse, TagImageInput } from "@/types";
import { generateTagsForImages } from "@/lib/vision/tags";
import type { ImageTagResult } from "@/lib/vision";

const STRATEGY_LABELS: Record<string, string> = {
  standard: "Standard",
  etsy: "Etsy SEO",
  stock: "Stock Expert",
};

const MAX_IMAGES_PER_REQUEST = 10;
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === "true";

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
    // AUTH CHECK: Require authentication (skip only in mock mode)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !IS_MOCK_MODE) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

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

    const creditsRequired = images.length;

    // CREDIT CHECK: Verify user has sufficient credits BEFORE API call (skip in mock mode)
    if (session?.user?.id && !IS_MOCK_MODE) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { creditsBalance: true },
      });

      if (!user || user.creditsBalance < creditsRequired) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient credits. You need ${creditsRequired} credits but have ${user?.creditsBalance ?? 0}.`,
          },
          { status: 402 }
        );
      }
    }

    let results: ImageTagResult[];

    // Mock mode: bypass real API calls for development/testing
    if (IS_MOCK_MODE) {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));
      results = generateMockTagResults(images, maxTags);
    } else {
      results = await generateTagsForImages(images, marketplace, strategy, maxTags, platform);
    }

    // Deduct credits for authenticated users (skip in mock mode)
    if (session?.user?.id && !IS_MOCK_MODE) {
      const strategyLabel = STRATEGY_LABELS[strategy] || "Standard";

      try {
        await prisma.$transaction(async (tx) => {
          // Deduct credits
          const user = await tx.user.update({
            where: { id: session.user.id },
            data: { creditsBalance: { decrement: creditsRequired } },
          });

          // Check for negative balance (race condition protection)
          if (user.creditsBalance < 0) {
            throw new Error("Insufficient credits");
          }

          // Log to ledger
          await tx.creditsLedger.create({
            data: {
              userId: session.user.id,
              amount: -creditsRequired,
              reason: "USAGE",
              description: `Tag Generation (${strategyLabel}) - ${creditsRequired} image${creditsRequired > 1 ? "s" : ""}`,
            },
          });
        });
      } catch (creditError) {
        console.error(
          "[Credits] Deduction failed:",
          creditError instanceof Error ? creditError.message : "Unknown"
        );
        return NextResponse.json(
          { success: false, error: "Credit deduction failed. Please try again." },
          { status: 402 }
        );
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
