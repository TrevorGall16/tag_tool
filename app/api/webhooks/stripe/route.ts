import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  let stripe: Stripe;

  try {
    stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId = session.metadata?.userId || session.client_reference_id;
        const credits = session.metadata?.credits;
        const plan = session.metadata?.plan;

        if (credits && (userId || customerId)) {
          // Idempotency check: skip if this session was already processed
          const existing = await prisma.creditsLedger.findFirst({
            where: { stripeSessionId: session.id },
          });
          if (existing) {
            console.log(`[Stripe Webhook] Duplicate event for session ${session.id}, skipping`);
            break;
          }

          if (userId) {
            // Credit purchase completed - use userId from metadata
            await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: { id: userId },
                data: { creditsBalance: { increment: parseInt(credits) } },
              });

              await tx.creditsLedger.create({
                data: {
                  userId,
                  amount: parseInt(credits),
                  reason: "PURCHASE",
                  stripeSessionId: session.id,
                  description: plan
                    ? `${plan} plan - ${credits} credits`
                    : `Purchased ${credits} credits`,
                },
              });
            });
          } else if (customerId) {
            // Fallback: use stripeCustomerId
            await prisma.$transaction(async (tx) => {
              const user = await tx.user.update({
                where: { stripeCustomerId: customerId },
                data: { creditsBalance: { increment: parseInt(credits) } },
              });

              await tx.creditsLedger.create({
                data: {
                  userId: user.id,
                  amount: parseInt(credits),
                  reason: "PURCHASE",
                  stripeSessionId: session.id,
                  description: `Purchased ${credits} credits`,
                },
              });
            });
          }
        } else {
          console.error("[Stripe Webhook] Missing required metadata for credit fulfillment");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });

        if (!user) {
          console.warn(`[Stripe Webhook] Subscription updated for unknown customer: ${customerId}`);
          break;
        }

        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: mapSubscriptionStatus(subscription.status),
            subscriptionEndsAt: (subscription as unknown as { current_period_end?: number })
              .current_period_end
              ? new Date(
                  (subscription as unknown as { current_period_end?: number }).current_period_end! *
                    1000
                )
              : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });

        if (!user) {
          console.warn(`[Stripe Webhook] Subscription deleted for unknown customer: ${customerId}`);
          break;
        }

        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "CANCELED",
            subscriptionTier: "FREE",
          },
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "[Stripe Webhook] Handler error:",
      error instanceof Error ? error.message : "Unknown"
    );
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" | "INCOMPLETE"> =
    {
      active: "ACTIVE",
      past_due: "PAST_DUE",
      canceled: "CANCELED",
      trialing: "TRIALING",
      incomplete: "INCOMPLETE",
      incomplete_expired: "INCOMPLETE",
      unpaid: "PAST_DUE",
      paused: "INCOMPLETE",
    };
  return statusMap[status] || "INCOMPLETE";
}
