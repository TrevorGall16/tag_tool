import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import nodemailer from "nodemailer";
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

    // Email Magic Link Provider (via Resend SMTP)
    // Note: Use onboarding@resend.dev if you haven't verified a custom domain yet
    EmailProvider({
      from: process.env.EMAIL_FROM || "TagArchitect <onboarding@resend.dev>",
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const transport = nodemailer.createTransport({
          host: "smtp.resend.com",
          port: 465,
          secure: true,
          auth: {
            user: "resend",
            pass: process.env.RESEND_API_KEY!,
          },
        });

        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: "Sign in to TagArchitect",
          text: `Sign in to TagArchitect\n\nClick here to sign in: ${url}\n\nIf you did not request this email, you can safely ignore it.`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>Sign in to TagArchitect</h2>
              <p>Click the button below to sign in to your account.</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Sign in
              </a>
              <p style="color: #6b7280; font-size: 14px;">If you did not request this email, you can safely ignore it.</p>
            </div>
          `,
        });

        const failed = result.rejected?.concat(result.pending ?? []).filter(Boolean);
        if (failed && failed.length > 0) {
          throw new Error(`Email delivery failed for: ${failed.join(", ")}`);
        }
      },
    }),
  ],

  session: {
    strategy: "database",
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

          if (result.count > 0) {
            console.log(`[Auth] Promoted ${result.count} anonymous batch(es) to user ${user.id}`);
          }
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
      console.log(`[Auth] New user created: ${user.email}`);

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
