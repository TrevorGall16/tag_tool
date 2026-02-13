import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth configuration for TagArchitect
 * Supports Google OAuth and Magic Link (Email) authentication
 */
export const authOptions: NextAuthOptions = {
  debug: true, // <-- ADD THIS LINE
  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Allow linking if email already exists
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
     * Sign-in callback - promotes anonymous batches to the authenticated user
     */
    async signIn({ user, account }) {
      if (!user.id) return true;

      try {
        // Get the tagarchitect_session cookie value from the request
        // This is set during anonymous usage and contains the local sessionId
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const anonymousSessionId = cookieStore.get("tagarchitect_session")?.value;

        if (anonymousSessionId) {
          // Promote all batches from this anonymous session to the authenticated user
          const result = await prisma.batch.updateMany({
            where: {
              sessionId: anonymousSessionId,
              userId: null, // Only promote batches that aren't already claimed
            },
            data: {
              userId: user.id,
            },
          });

          // Batch promotion logged server-side only if needed for debugging
        }
      } catch (error) {
        console.error("[Auth] Failed to promote anonymous batches:", error);
        // Don't block sign-in on promotion failure
      }

      return true;
    },

    /**
     * Session callback - adds user ID and subscription info to session
     */
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;

        // Fetch additional user data for the session
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            creditsBalance: true,
            subscriptionTier: true,
            subscriptionStatus: true,
          },
        });

        if (dbUser) {
          session.user.creditsBalance = dbUser.creditsBalance;
          session.user.subscriptionTier = dbUser.subscriptionTier;
          session.user.subscriptionStatus = dbUser.subscriptionStatus;
        }
      }
      return session;
    },
  },

  events: {
    /**
     * Create user event - initialize new users with default credits
     */
    async createUser({ user }) {
      // User already has default credits from schema (50)
      // Add welcome bonus to ledger
      await prisma.creditsLedger.create({
        data: {
          userId: user.id,
          amount: 50,
          reason: "BONUS",
          description: "Welcome bonus - 50 free credits",
        },
      });
    },
  },

  debug: process.env.NODE_ENV === "development",
};
