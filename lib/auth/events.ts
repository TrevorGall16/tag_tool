/**
 * NextAuth event handlers extracted from authOptions for clarity and testability.
 *
 * createUser — guards the welcome bonus with IP fingerprinting.
 *
 * Credit grant rules (schema default is now 0):
 *   Fresh IP in Redis → GRANT 50 (prisma.user.update is the granting mechanism)
 *   Repeat IP         → 0 credits (no pity bonus — deny entirely)
 *   IP unknown        → 0 credits [FATAL SECURITY FALLBACK]
 *   Redis unavailable → 0 credits [FATAL SECURITY FALLBACK]
 *   Any thrown error  → 0 credits [FATAL SECURITY FALLBACK]
 *
 * Because creditsBalance @default(0), every non-grant path is already correct
 * without any corrective DB update. The only prisma.user.update call is the
 * positive grant, so a DB failure leaves the user safely at 0.
 */

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

function extractClientIp(xForwardedFor: string | null, xRealIp: string | null): string {
  if (xForwardedFor) return xForwardedFor.split(",")[0]!.trim();
  return xRealIp ?? "unknown";
}

type GrantReason = "fresh_ip" | "repeat_ip" | "ip_unknown" | "redis_unavailable" | "error";

export async function handleCreateUser({ user }: { user: { id: string } }) {
  let bonusAmount = 0;
  let grantReason: GrantReason = "ip_unknown";

  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const ip = extractClientIp(headersList.get("x-forwarded-for"), headersList.get("x-real-ip"));

    if (ip === "unknown") {
      grantReason = "ip_unknown";
      console.error("[FATAL SECURITY FALLBACK] createUser: could not determine client IP", {
        userId: user.id,
      });
    } else if (!redis) {
      grantReason = "redis_unavailable";
      console.error("[FATAL SECURITY FALLBACK] createUser: Redis unavailable — 0 credits", {
        userId: user.id,
      });
    } else {
      const key = `bonus:granted:${ip}`;
      const alreadyGranted = await redis.get(key);

      if (alreadyGranted) {
        grantReason = "repeat_ip";
        console.warn("[SECURITY] Account farming detected — denying bonus from IP:", ip, {
          userId: user.id,
        });
      } else {
        // Fresh IP — this is the ONLY path that grants credits
        bonusAmount = 50;
        grantReason = "fresh_ip";
        await redis.set(key, "1", { ex: 86400 });
      }
    }
  } catch (err) {
    bonusAmount = 0;
    grantReason = "error";
    console.error("[FATAL SECURITY FALLBACK] createUser: IP guard threw — 0 credits", err, {
      userId: user.id,
    });
  }

  // GRANT: prisma.user.update is the granting mechanism, not a corrective one.
  // If this update fails, creditsBalance stays at 0 — the safe default.
  if (bonusAmount > 0) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { creditsBalance: bonusAmount },
      });
    } catch (updateErr) {
      bonusAmount = 0;
      console.error("[SECURITY] Credit grant update failed — user stays at 0:", updateErr, {
        userId: user.id,
      });
    }
  }

  // Always write a ledger entry so every signup is auditable (amount: 0 for blocked cases)
  const description =
    bonusAmount === 50
      ? "Welcome bonus - 50 free credits"
      : grantReason === "repeat_ip"
        ? "Welcome bonus blocked (repeat IP — possible farming)"
        : "Welcome bonus blocked (security fallback — IP unverifiable)";

  await prisma.creditsLedger.create({
    data: {
      userId: user.id,
      amount: bonusAmount,
      reason: "BONUS",
      description,
    },
  });
}
