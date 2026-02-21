import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { handleCreateUser } from "@/lib/auth/events";

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
     * Sign-in callback - promotes anonymous batches to the authenticated user.
     * IP rate limiting is enforced upstream in the route handler (app/api/auth/[...nextauth]/route.ts).
     */
    async signIn({ user }) {
      if (!user.id) return true;

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
    // Bonus guard and credit initialization live in lib/auth/events.ts
    createUser: handleCreateUser,
  },

  debug: process.env.NODE_ENV === "development",
};
