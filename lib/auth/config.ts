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
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const anonymousSessionId = cookieStore.get("tagarchitect_session")?.value;

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
     * Transfers user ID from the database profile into the token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    /**
     * Session callback - extracts ID from token and fetches fresh DB data
     */
    async session({ session, token }) {
      if (session.user && token && token.id) {
        session.user.id = token.id as string;

        // Fetch additional user data for the session
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
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