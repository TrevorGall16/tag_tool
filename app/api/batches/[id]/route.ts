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
    const { isArchived, projectId } = body;

    // Lookup batch by cuid OR sessionId, verify ownership
    const batch = await prisma.batch.findFirst({
      where: {
        userId: session.user.id,
        OR: [{ id }, { sessionId: id }],
      },
      select: { id: true },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // Build update payload — only include fields that were explicitly provided
    const updateData: { isArchived?: boolean; projectId?: string | null } = {};

    if (typeof isArchived === "boolean") {
      updateData.isArchived = isArchived;
    }

    if (projectId !== undefined) {
      // Validate project ownership if a projectId is provided
      if (projectId !== null) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, userId: session.user.id },
          select: { id: true },
        });
        if (!project) {
          return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
        }
      }
      updateData.projectId = projectId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.batch.update({
      where: { id: batch.id },
      data: updateData,
      select: { id: true, isArchived: true, projectId: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Batches API] PATCH error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ success: false, error: "Failed to update batch" }, { status: 500 });
  }
}
