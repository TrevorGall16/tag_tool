import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LedgerReason } from "@prisma/client";
import type { ApiResponse, CreditsBalanceResponse } from "@/types";

// Only reasons a regular user can trigger via this endpoint.
// ADMIN_ADJUST and PURCHASE are restricted to server-side handlers (webhooks, cron).
const VALID_REASONS: LedgerReason[] = ["USAGE", "REFUND"];

export async function GET(): Promise<NextResponse<ApiResponse<CreditsBalanceResponse>>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    console.error("[Credits API] Fetch error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ success: false, error: "Failed to fetch credits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, reason, description } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid positive amount is required" },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || !VALID_REASONS.includes(reason as LedgerReason)) {
      return NextResponse.json(
        { success: false, error: `Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Use atomic transaction for credit operations
    await prisma.$transaction(async (tx) => {
      // Deduct credits
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: { creditsBalance: { decrement: amount } },
      });

      // Check for negative balance
      if (user.creditsBalance < 0) {
        throw new Error("Insufficient credits");
      }

      // Log to ledger
      await tx.creditsLedger.create({
        data: {
          userId: session.user.id,
          amount: -amount,
          reason: reason as LedgerReason,
          description,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Credits API] Deduction error:", msg);

    if (msg.includes("Insufficient credits")) {
      return NextResponse.json(
        { success: false, error: "Insufficient credits", code: "INSUFFICIENT_BALANCE" },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to process credit operation" },
      { status: 500 }
    );
  }
}
