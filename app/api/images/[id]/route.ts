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
    const {
      userTitle,
      userTags,
      sessionId,
      groupId,
      originalFilename,
      sanitizedSlug,
      fileSize,
      mimeType,
    } = body;

    // Validate userTags if provided
    if (userTags !== undefined) {
      if (!Array.isArray(userTags) || !userTags.every((t: unknown) => typeof t === "string")) {
        return NextResponse.json(
          { success: false, error: "userTags must be an array of strings" },
          { status: 400 }
        );
      }
    }

    // Build update payload
    const updateData: { userTitle?: string; userTags?: string[] } = {};
    if (userTitle !== undefined) updateData.userTitle = userTitle;
    if (userTags !== undefined) updateData.userTags = userTags;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Try to find the existing image (owned by this user)
    const existingImage = await prisma.imageItem.findFirst({
      where: {
        id,
        group: { batch: { userId: session.user.id } },
      },
      select: { id: true },
    });

    if (existingImage) {
      // UPDATE path: image exists, just update it
      await prisma.imageItem.update({
        where: { id },
        data: updateData,
      });
    } else {
      // CREATE path: image doesn't exist yet — upsert the chain
      // Require creation metadata
      if (!sessionId || !groupId || !originalFilename) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Image not found and missing creation metadata (sessionId, groupId, originalFilename)",
          },
          { status: 404 }
        );
      }

      // Ensure batch exists (find-or-create by sessionId + userId)
      let batch = await prisma.batch.findFirst({
        where: { sessionId, userId: session.user.id },
        select: { id: true },
      });
      if (!batch) {
        batch = await prisma.batch.create({
          data: {
            sessionId,
            userId: session.user.id,
            marketplace: "ETSY",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });
      }

      // Ensure group exists (upsert by client-side groupId)
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        // Find the max groupNumber for this batch to assign next
        const maxGroup = await prisma.group.findFirst({
          where: { batchId: batch.id },
          orderBy: { groupNumber: "desc" },
          select: { groupNumber: true },
        });
        await prisma.group.create({
          data: {
            id: groupId,
            batchId: batch.id,
            groupNumber: (maxGroup?.groupNumber ?? 0) + 1,
          },
        });
      }

      // Create the image with the update data merged in
      await prisma.imageItem.create({
        data: {
          id,
          groupId,
          originalFilename,
          sanitizedSlug:
            sanitizedSlug || originalFilename.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
          fileSize: fileSize || 0,
          mimeType: mimeType || "image/jpeg",
          ...updateData,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Images API] PATCH error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ success: false, error: "Failed to update image" }, { status: 500 });
  }
}
