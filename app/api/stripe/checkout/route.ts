import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, PRICING, type PlanType } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { plan } = body as { plan?: string };

    // Validate plan
    if (!plan || !(plan in PRICING)) {
      return NextResponse.json({ error: "Invalid plan. Choose STARTER or PRO." }, { status: 400 });
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const successUrl = `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?checkout=cancelled`;

    // Create Stripe Checkout session
    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      plan: plan as PlanType,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
