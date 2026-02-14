import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const VALID_PLATFORMS = ["GENERIC", "ADOBE", "SHUTTERSTOCK", "ETSY"] as const;
const VALID_CONTEXTS = ["general", "stock", "ecommerce"] as const;
const MAX_PRESETS_PER_USER = 20;

// GET /api/presets — list user's naming presets
export async function GET(): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const presets = await prisma.namingPreset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: presets });
}

// POST /api/presets — create a new naming preset
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    prefix?: string;
    startNumber?: number;
    context?: string;
    platform?: string;
  };

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ success: false, error: "Preset name is required" }, { status: 400 });
  }

  if (body.name.length > 100) {
    return NextResponse.json(
      { success: false, error: "Preset name must be 100 characters or less" },
      { status: 400 }
    );
  }

  if (
    body.platform &&
    !VALID_PLATFORMS.includes(body.platform as (typeof VALID_PLATFORMS)[number])
  ) {
    return NextResponse.json({ success: false, error: "Invalid platform" }, { status: 400 });
  }

  if (body.context && !VALID_CONTEXTS.includes(body.context as (typeof VALID_CONTEXTS)[number])) {
    return NextResponse.json({ success: false, error: "Invalid context" }, { status: 400 });
  }

  // Check preset limit
  const count = await prisma.namingPreset.count({ where: { userId: session.user.id } });
  if (count >= MAX_PRESETS_PER_USER) {
    return NextResponse.json(
      { success: false, error: `Maximum ${MAX_PRESETS_PER_USER} presets allowed` },
      { status: 400 }
    );
  }

  const preset = await prisma.namingPreset.create({
    data: {
      name: body.name.trim(),
      userId: session.user.id,
      prefix: body.prefix?.trim() || null,
      startNumber: Math.max(1, body.startNumber ?? 1),
      context: body.context || "general",
      platform: (body.platform as (typeof VALID_PLATFORMS)[number]) || "GENERIC",
    },
  });

  return NextResponse.json({ success: true, data: preset }, { status: 201 });
}

// DELETE /api/presets?id=xxx — delete a naming preset
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Preset id is required" }, { status: 400 });
  }

  // Verify ownership
  const preset = await prisma.namingPreset.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!preset) {
    return NextResponse.json({ success: false, error: "Preset not found" }, { status: 404 });
  }

  await prisma.namingPreset.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
