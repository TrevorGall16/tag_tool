"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Sparkles, Zap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: 5,
    credits: 50,
    popular: true,
    features: [
      "50 tagging credits",
      "$0.10 per image (1 credit = 1 image analyzed)",
      "Includes AI title + up to 50 tags per image",
      "Smart image grouping",
      "CSV & ZIP export",
      "Project folders",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 15,
    credits: 200,
    popular: false,
    features: [
      "200 tagging credits",
      "$0.075 per image (25% savings)",
      "1 credit = 1 image analyzed (title + all tags)",
      "Everything in Starter",
      "Priority support",
      "Credits never expire",
    ],
  },
];

function PricingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const checkoutCancelled = searchParams.get("checkout") === "cancelled";

  const handlePurchase = async (planId: string) => {
    if (status !== "authenticated") {
      // Redirect to sign in with callback to pricing
      router.push(`/auth/signin?callbackUrl=/pricing`);
      return;
    }

    setLoadingPlan(planId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-slate-900">TagArchitect</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Cancelled Checkout Notice */}
        {checkoutCancelled && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-800">
              Checkout was cancelled. No worries - you can try again anytime!
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Get AI-powered tagging credits to supercharge your product listings. No subscriptions,
            no hidden fees - just pay for what you need.
          </p>
        </div>

        {/* Current Credits (if logged in) */}
        {session?.user?.creditsBalance !== undefined && (
          <div className="text-center mb-8">
            <p className="text-sm text-slate-600">
              Your current balance:{" "}
              <span className="font-semibold text-blue-600">
                {session.user.creditsBalance} credits
              </span>
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative bg-white rounded-2xl shadow-lg border-2 p-8",
                "transition-all duration-200 hover:shadow-xl hover:scale-105",
                plan.popular ? "border-blue-500" : "border-slate-200"
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h2>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-slate-900">€{plan.price}</span>
                  <span className="text-slate-500">one-time</span>
                </div>
                <p className="text-blue-600 font-medium mt-2">{plan.credits} credits</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handlePurchase(plan.id)}
                disabled={loadingPlan !== null}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold",
                  "transition-all duration-200 hover:scale-105",
                  "disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed",
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Get {plan.credits} Credits
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ / Info */}
        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">How credits work</h3>
          <div className="max-w-2xl mx-auto text-slate-600 space-y-2">
            <p>
              <strong>1 Credit = 1 Image analyzed</strong> (includes AI-generated title + all tags).
              Each time you generate AI tags for an image or group, it uses 1 credit from your
              balance.
            </p>
            <p>
              <strong>Starter: $0.10 per image</strong> | <strong>Pro: $0.075 per image</strong>
            </p>
            <p>Credits never expire and carry over. Buy once, use whenever you need them.</p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Secure payment via Stripe
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Instant credit delivery
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            No subscription required
          </span>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
