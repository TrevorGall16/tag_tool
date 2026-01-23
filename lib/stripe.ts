import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

/**
 * Stripe Node.js SDK instance
 * Used for server-side Stripe operations
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

/**
 * Pricing configuration for TagArchitect plans
 */
export const PRICING = {
  STARTER: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    price: 1200, // €12.00 in cents
    credits: 100,
    features: [
      "100 AI tagging credits",
      "Batch clustering",
      "CSV & ZIP export",
      "EXIF/IPTC embedding",
    ],
  },
  PRO: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    price: 2900, // €29.00 in cents
    credits: 500,
    features: [
      "500 AI tagging credits",
      "Priority processing",
      "Batch clustering",
      "CSV & ZIP export",
      "EXIF/IPTC embedding",
      "Global tags",
      "Priority support",
    ],
  },
} as const;

export type PlanType = keyof typeof PRICING;

/**
 * Create a Stripe Checkout session for purchasing credits
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  plan,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  plan: PlanType;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const pricing = PRICING[plan];

  if (!pricing.priceId) {
    // Use line_items with price_data if no price ID is configured
    return stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pricing.name} Plan - ${pricing.credits} Credits`,
              description: pricing.features.join(" • "),
            },
            unit_amount: pricing.price,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
        credits: pricing.credits.toString(),
      },
    });
  }

  // Use pre-configured price ID
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: userEmail,
    client_reference_id: userId,
    line_items: [
      {
        price: pricing.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
      credits: pricing.credits.toString(),
    },
  });
}

/**
 * Verify and retrieve a completed checkout session
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
