import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, VisionAnalysisResponse } from "@/types";

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VisionAnalysisResponse>>> {
  try {
    // AUTH CHECK: Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // PAYLOAD CHECK: Verify content length
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { success: false, error: "Payload too large. Maximum 5MB allowed." },
        { status: 413 }
      );
    }

    // CREDIT CHECK: Verify user has credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditsBalance: true },
    });

    if (!user || user.creditsBalance < 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient credits. You need at least 1 credit but have ${user?.creditsBalance ?? 0}.`,
        },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { imageDataUrl } = body;

    if (!imageDataUrl) {
      return NextResponse.json(
        { success: false, error: "Image data URL is required" },
        { status: 400 }
      );
    }

    // TODO: Implement Claude Vision API call
    // Per CLAUDE.md: All image processing must happen locally (resize < 512px) before API calls
    // The image should already be resized on the client before being sent here

    // Placeholder response
    return NextResponse.json({
      success: true,
      data: {
        title: "AI-generated title placeholder",
        tags: ["placeholder", "tags", "will", "be", "generated"],
        confidence: 0.85,
      },
    });
  } catch (error) {
    console.error("[Vision API] Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ success: false, error: "Vision analysis failed" }, { status: 500 });
  }
}
