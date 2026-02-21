import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkAuthRateLimit } from "@/lib/ratelimit";

/**
 * Extract the real client IP from Next.js request headers.
 * On Vercel, x-forwarded-for is set by the platform and can be trusted.
 * The value may be a comma-separated chain ("client, proxy1, proxy2") —
 * we take the leftmost entry (original client).
 */
function extractClientIp(xForwardedFor: string | null, xRealIp: string | null): string {
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]!.trim();
  }
  return xRealIp ?? "unknown";
}

/**
 * NextAuth configuration for VisionBatch
 * Supports Google OAuth and Magic Link (Email) authentication
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },

  callbacks: {
    /**
     * Sign-in callback - IP rate limit check + anonymous batch promotion
     */
    async signIn({ user }) {
      if (!user.id) return true;

      // IP-based auth rate limit (fail-closed): blocks rapid sign-in attempts per IP.
      try {
        const { headers } = await import("next/headers");
        const headersList = await headers();
        const ip = extractClientIp(
          headersList.get("x-forwarded-for"),
          headersList.get("x-real-ip")
        );

        if (ip !== "unknown") {
          const allowed = await checkAuthRateLimit(ip);
          if (!allowed) {
            console.warn("[SECURITY] Auth rate limit hit from IP:", ip);
            return false;
          }
        }
      } catch (error) {
        console.error("[Auth] IP rate limit check failed:", error);
        // Don't block sign-in on unexpected errors — rate limit is best-effort
      }

      // Promote anonymous batches to the authenticated user
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const anonymousSessionId = cookieStore.get("visionbatch_session")?.value;

        if (anonymousSessionId) {
          await prisma.batch.updateMany({
            where: {
              sessionId: anonymousSessionId,
              userId: null,
            },
            data: {
              userId: user.id,
            },
          });
        }
      } catch (error) {
        console.error("[Auth] Failed to promote anonymous batches:", error);
      }

      return true;
    },

    /**
     * JWT Callback - required when using strategy: "jwt"
     * Encrypts user state into the token to avoid redundant DB reads.
     */
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.creditsBalance = (user as any).creditsBalance ?? 0;
        token.subscriptionTier = (user as any).subscriptionTier;
        token.subscriptionStatus = (user as any).subscriptionStatus;
      }

      if (trigger === "update" && session) {
        if (session.creditsBalance !== undefined) token.creditsBalance = session.creditsBalance;
        if (session.subscriptionTier) token.subscriptionTier = session.subscriptionTier;
        if (session.subscriptionStatus) token.subscriptionStatus = session.subscriptionStatus;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        // The red lines happen here if the types above aren't matched
        session.user.creditsBalance = token.creditsBalance;
        session.user.subscriptionTier = token.subscriptionTier;
        session.user.subscriptionStatus = token.subscriptionStatus;
      }
      return session;
    },
  },

  events: {
    /**
     * Create user event - initialize new users with welcome credits.
     *
     * The Prisma schema sets creditsBalance @default(50), so the User row
     * is already created with 50. Here we:
     *   1. Check Redis for a prior bonus on this IP (24-hour window).
     *   2. If already granted: correct the balance to 5 and log a security warning.
     *   3. If fresh: mark the IP in Redis and record the full 50-credit ledger entry.
     *
     * Fails open (full bonus) if Redis is unavailable — we don't punish legitimate
     * users for infrastructure outages.
     */
    async createUser({ user }) {
      let bonusAmount = 50;

      try {
        const { headers } = await import("next/headers");
        const headersList = await headers();
        const ip = extractClientIp(
          headersList.get("x-forwarded-for"),
          headersList.get("x-real-ip")
        );

        if (redis && ip !== "unknown") {
          const key = `bonus:granted:${ip}`;
          const alreadyGranted = await redis.get(key);

          if (alreadyGranted) {
            bonusAmount = 5;
            console.warn("[SECURITY] Possible account farming detected from IP:", ip);
            // Correct the Prisma @default(50) down to the restricted amount
            await prisma.user.update({
              where: { id: user.id },
              data: { creditsBalance: bonusAmount },
            });
          } else {
            // Mark IP as bonus-granted for the next 24 hours
            await redis.set(key, "1", { ex: 86400 });
          }
        }
      } catch (err) {
        console.error("[Auth] IP bonus guard failed, granting full bonus as fallback:", err);
        bonusAmount = 50; // Fail open — don't penalise users for Redis downtime
      }

      await prisma.creditsLedger.create({
        data: {
          userId: user.id,
          amount: bonusAmount,
          reason: "BONUS",
          description:
            bonusAmount === 50
              ? "Welcome bonus - 50 free credits"
              : "Welcome bonus (restricted) - 5 free credits",
        },
      });
    },
  },

  debug: process.env.NODE_ENV === "development",
};
