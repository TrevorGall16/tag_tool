import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Fetch user with credits ledger
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        creditsLedger: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch Stripe payment history if customer exists
    let payments: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created: number;
      description: string | null;
      receiptUrl: string | null;
    }> = [];

    if (user.stripeCustomerId) {
      try {
        const charges = await stripe.charges.list({
          customer: user.stripeCustomerId,
          limit: 20,
        });

        payments = charges.data.map((charge) => ({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          created: charge.created,
          description: charge.description,
          receiptUrl: charge.receipt_url,
        }));
      } catch (stripeError) {
        console.error("[Account API] Stripe error:", stripeError);
        // Continue without Stripe data
      }
    }

    // Also check for payments via checkout sessions (for users without stripeCustomerId)
    if (payments.length === 0) {
      const ledgerPurchases = user.creditsLedger.filter(
        (entry) => entry.reason === "PURCHASE" && entry.stripeSessionId
      );

      for (const purchase of ledgerPurchases.slice(0, 10)) {
        if (purchase.stripeSessionId) {
          try {
            const checkoutSession = await stripe.checkout.sessions.retrieve(
              purchase.stripeSessionId,
              { expand: ["payment_intent"] }
            );

            if (checkoutSession.payment_intent) {
              const paymentIntent =
                typeof checkoutSession.payment_intent === "string"
                  ? await stripe.paymentIntents.retrieve(checkoutSession.payment_intent)
                  : checkoutSession.payment_intent;

              if (paymentIntent.latest_charge) {
                const charge = await stripe.charges.retrieve(
                  typeof paymentIntent.latest_charge === "string"
                    ? paymentIntent.latest_charge
                    : paymentIntent.latest_charge.id
                );

                payments.push({
                  id: charge.id,
                  amount: charge.amount,
                  currency: charge.currency,
                  status: charge.status,
                  created: charge.created,
                  description: purchase.description || "Credit purchase",
                  receiptUrl: charge.receipt_url,
                });
              }
            }
          } catch (e) {
            console.error("[Account API] Error fetching checkout session:", e);
          }
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        creditsBalance: user.creditsBalance,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
      },
      creditsLedger: user.creditsLedger.map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        reason: entry.reason,
        description: entry.description,
        createdAt: entry.createdAt,
      })),
      payments,
    });
  } catch (error) {
    console.error("[Account API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch account data" }, { status: 500 });
  }
}
