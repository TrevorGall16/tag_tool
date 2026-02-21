import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const RETRY_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 500;

async function retryOnNotFound<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNotFound =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
      if (isNotFound && attempt < RETRY_ATTEMPTS - 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Stripe Webhook] Record not found, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_ATTEMPTS - 1})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("retryOnNotFound: exhausted attempts");
}

function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured");
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
          const parsedCredits = parseInt(credits);
          const isPaid = session.payment_status === "paid";

          try {
            if (userId) {
              await retryOnNotFound(() =>
                prisma.$transaction(async (tx) => {
                  if (isPaid) {
                    await tx.user.update({
                      where: { id: userId },
                      data: { creditsBalance: { increment: parsedCredits } },
                    });
                  }
                  await tx.creditsLedger.create({
                    data: {
                      userId,
                      amount: parsedCredits,
                      reason: "PURCHASE",
                      status: isPaid ? "CONFIRMED" : "PENDING",
                      stripeSessionId: session.id,
                      description: plan ? `${plan} plan - ${credits} credits` : `Purchased ${credits} credits`,
                    },
                  });
                })
              );
            } else if (customerId) {
              await retryOnNotFound(() =>
                prisma.$transaction(async (tx) => {
                  const dbUser = await tx.user.findUniqueOrThrow({ where: { stripeCustomerId: customerId } });
                  if (isPaid) {
                    await tx.user.update({
                      where: { stripeCustomerId: customerId },
                      data: { creditsBalance: { increment: parsedCredits } },
                    });
                  }
                  await tx.creditsLedger.create({
                    data: {
                      userId: dbUser.id,
                      amount: parsedCredits,
                      reason: "PURCHASE",
                      status: isPaid ? "CONFIRMED" : "PENDING",
                      stripeSessionId: session.id,
                      description: `Purchased ${credits} credits`,
                    },
                  });
                })
              );
            }
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
              console.log(`[Stripe Webhook] Duplicate session ${session.id} ignored.`);
              return NextResponse.json({ received: true, ignored: true });
            }
            throw error;
          }
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const credits = session.metadata?.credits;

        if (credits && userId) {
          const parsedCredits = parseInt(credits);
          await retryOnNotFound(() =>
            prisma.$transaction(async (tx) => {
              await tx.creditsLedger.update({
                where: { stripeSessionId: session.id },
                data: { status: "CONFIRMED" },
              });
              await tx.user.update({
                where: { id: userId },
                data: { creditsBalance: { increment: parsedCredits } },
              });
            })
          );
          console.log(`[Stripe Webhook] Async payment cleared for ${session.id}`);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await prisma.creditsLedger.update({
          where: { stripeSessionId: session.id },
          data: { status: "FAILED" },
        });
        break;
      }

case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Use a type assertion to force TypeScript to accept the property
        const periodEnd = (subscription as any).current_period_end as number | undefined;

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
          data: { subscriptionStatus: "CANCELED", subscriptionTier: "FREE" },
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Handler error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" | "INCOMPLETE"> = {
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