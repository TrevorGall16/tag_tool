import type { SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      creditsBalance: number; // Removed '?'
      subscriptionTier: SubscriptionTier; // Removed '?'
      subscriptionStatus: SubscriptionStatus; // Removed '?'
    };
  }

  interface User {
    id: string;
    creditsBalance: number;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: SubscriptionStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    creditsBalance: number;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: SubscriptionStatus;
  }
}