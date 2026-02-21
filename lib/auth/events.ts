/**
 * NextAuth event handlers extracted from authOptions for clarity and testability.
 *
 * createUser — guards the welcome bonus with IP fingerprinting.
 *
 * Credit grant rules:
 *   Fresh IP in Redis → 50 credits (mark IP for 24 h)
 *   Known IP in Redis → 5 credits  (farming detected)
 *   IP unknown OR Redis unavailable → 0 credits [FATAL SECURITY FALLBACK]
 *
 * The Prisma schema has creditsBalance @default(50), so when bonusAmount ≠ 50
 * we must correct the User row immediately after the ledger entry.
 */

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

function extractClientIp(xForwardedFor: string | null, xRealIp: string | null): string {
  if (xForwardedFor) return xForwardedFor.split(",")[0]!.trim();
  return xRealIp ?? "unknown";
}

export async function handleCreateUser({ user }: { user: { id: string } }) {
  let bonusAmount = 50;

  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const ip = extractClientIp(headersList.get("x-forwarded-for"), headersList.get("x-real-ip"));

    if (ip === "unknown" || !redis) {
      // Cannot verify the requester's identity — deny bonus entirely.
      bonusAmount = 0;
      console.error("[FATAL SECURITY FALLBACK] createUser: IP unknown or Redis unavailable", {
        userId: user.id,
        redisAvailable: !!redis,
      });
    } else {
      const key = `bonus:granted:${ip}`;
      const alreadyGranted = await redis.get(key);

      if (alreadyGranted) {
        bonusAmount = 5;
        console.warn("[SECURITY] Possible account farming detected from IP:", ip, {
          userId: user.id,
        });
      } else {
        // First signup from this IP in the last 24 hours — grant full bonus
        await redis.set(key, "1", { ex: 86400 });
      }
    }
  } catch (err) {
    // Any Redis or headers() failure → treat as unverifiable identity
    bonusAmount = 0;
    console.error("[FATAL SECURITY FALLBACK] createUser: IP bonus guard threw — 0 credits", err, {
      userId: user.id,
    });
  }

  // Correct the Prisma @default(50) when the bonus was reduced or denied
  if (bonusAmount !== 50) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { creditsBalance: bonusAmount },
      });
    } catch (updateErr) {
      console.error("[SECURITY] Failed to correct creditsBalance:", updateErr, {
        userId: user.id,
        target: bonusAmount,
      });
    }
  }

  // Always create a ledger entry — even for 0 credits — so the event is auditable
  await prisma.creditsLedger.create({
    data: {
      userId: user.id,
      amount: bonusAmount,
      reason: "BONUS",
      description:
        bonusAmount === 50
          ? "Welcome bonus - 50 free credits"
          : bonusAmount === 5
            ? "Welcome bonus (restricted) - 5 free credits"
            : "Welcome bonus blocked (security fallback — IP unverifiable)",
    },
  });
}
