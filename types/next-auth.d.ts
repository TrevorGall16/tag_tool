import type { SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      creditsBalance?: number;
      subscriptionTier?: SubscriptionTier;
      subscriptionStatus?: SubscriptionStatus | null;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    creditsBalance?: number;
    subscriptionTier?: SubscriptionTier;
    subscriptionStatus?: SubscriptionStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    creditsBalance?: number;
    subscriptionTier?: SubscriptionTier;
    subscriptionStatus?: SubscriptionStatus | null;
  }
}
