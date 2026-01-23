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
  // 🔍 DEBUG: Very first line - verify endpoint is being hit
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🔍 DEBUG: Webhook endpoint hit at", new Date().toISOString());
  console.log("═══════════════════════════════════════════════════════════");

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  console.log("🔍 DEBUG: Signature present:", !!signature);
  console.log("🔍 DEBUG: Body length:", body.length);
  console.log("🔍 DEBUG: STRIPE_WEBHOOK_SECRET set:", !!process.env.STRIPE_WEBHOOK_SECRET);

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
    console.error("❌ Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // 💰 LOUD LOGGING - This helps verify the webhook is being received
  console.log("═══════════════════════════════════════════════════════════");
  console.log("💰 STRIPE WEBHOOK RECEIVED!", event.type);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Event ID:", event.id);
  console.log("Event Type:", event.type);
  console.log("Timestamp:", new Date().toISOString());

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId = session.metadata?.userId || session.client_reference_id;
        const credits = session.metadata?.credits;
        const plan = session.metadata?.plan;

        console.log("📦 Checkout Session Data:");
        console.log("  - Session ID:", session.id);
        console.log("  - Customer ID:", customerId);
        console.log("  - User ID (from metadata):", userId);
        console.log("  - Credits:", credits);
        console.log("  - Plan:", plan);
        console.log("  - Payment Status:", session.payment_status);

        if (credits && userId) {
          // Credit purchase completed - use userId from metadata
          console.log(
            `💳 [Stripe Webhook] Processing checkout for user ${userId}: +${credits} credits (${plan})`
          );

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

          console.log(
            `✅ [Stripe Webhook] Successfully added ${credits} credits to user ${userId}`
          );
          console.log("═══════════════════════════════════════════════════════════");
        } else if (!credits || !userId) {
          console.error("❌ Missing required data:");
          console.error("  - credits:", credits);
          console.error("  - userId:", userId);
          console.error("  - customerId:", customerId);
          console.error("  - Full metadata:", JSON.stringify(session.metadata));
          console.error("  - client_reference_id:", session.client_reference_id);
        }

        if (credits && customerId && !userId) {
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
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const periodEnd = (subscription as unknown as { current_period_end?: number })
          .current_period_end;

        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: mapSubscriptionStatus(subscription.status),
            subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

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
    console.error("═══════════════════════════════════════════════════════════");
    console.error("❌ WEBHOOK HANDLER ERROR:");
    console.error("═══════════════════════════════════════════════════════════");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }
    console.error("═══════════════════════════════════════════════════════════");
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
