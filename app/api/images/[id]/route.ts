import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { userTitle, userTags } = body;

    // Verify the image belongs to the authenticated user (image -> group -> batch -> user)
    const image = await prisma.imageItem.findFirst({
      where: {
        id,
        group: { batch: { userId: session.user.id } },
      },
      select: { id: true },
    });

    if (!image) {
      return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
    }

    // Build update payload
    const updateData: { userTitle?: string; userTags?: string[] } = {};

    if (userTitle !== undefined) {
      updateData.userTitle = userTitle;
    }

    if (userTags !== undefined) {
      if (!Array.isArray(userTags) || !userTags.every((t: unknown) => typeof t === "string")) {
        return NextResponse.json(
          { success: false, error: "userTags must be an array of strings" },
          { status: 400 }
        );
      }
      updateData.userTags = userTags;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await prisma.imageItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Images API] PATCH error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ success: false, error: "Failed to update image" }, { status: 500 });
  }
}
