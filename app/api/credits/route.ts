import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ApiResponse, CreditsBalanceResponse } from "@/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreditsBalanceResponse>>> {
  try {
    // TODO: Get user from session/auth
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsBalance: true, subscriptionTier: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: user.creditsBalance,
        tier: user.subscriptionTier,
      },
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch credits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // TODO: Get user from session/auth
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, reason, description } = body;

    if (!amount || !reason) {
      return NextResponse.json(
        { success: false, error: "Amount and reason are required" },
        { status: 400 }
      );
    }

    // Use atomic transaction for credit operations
    await prisma.$transaction(async (tx) => {
      // Deduct credits
      const user = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: amount } },
      });

      // Check for negative balance
      if (user.creditsBalance < 0) {
        throw new Error("Insufficient credits");
      }

      // Log to ledger
      await tx.creditsLedger.create({
        data: {
          userId,
          amount: -amount,
          reason: reason,
          description,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Credits deduction error:", error);
    const message = error instanceof Error ? error.message : "Failed to process credits";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
