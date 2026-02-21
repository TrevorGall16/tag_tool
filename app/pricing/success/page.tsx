"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PartyPopper, CheckCircle, ArrowRight, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function PaymentSuccessContent() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  const handleSyncBalance = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      // Force refresh the NextAuth session to get latest credits
      await updateSession();
      // Also do a hard refresh of the router cache
      router.refresh();
      setSyncMessage("Balance synced successfully!");
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      setSyncMessage("Failed to sync. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Refresh the session to get updated credits
  useEffect(() => {
    // Fire immediately so the JWT — and therefore the header balance — updates
    // as soon as the user lands, without waiting for any timer.
    updateSession();

    if (sessionId) {
      // Retry at 2 s and 5 s to catch webhook processing lag.
      const t1 = setTimeout(() => updateSession(), 2000);
      const t2 = setTimeout(() => updateSession(), 5000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [sessionId, updateSession]);

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-slate-50 flex items-center justify-center p-6">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className={cn(
                  "w-3 h-3 rotate-45",
                  [
                    "bg-green-400",
                    "bg-blue-400",
                    "bg-yellow-400",
                    "bg-pink-400",
                    "bg-purple-400",
                    "bg-amber-400",
                  ][Math.floor(Math.random() * 6)]
                )}
              />
            </div>
          ))}
        </div>
      )}

      {/* Success Card */}
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-blue-50/50" />

        <div className="relative">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center animate-bounce">
                <PartyPopper className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-slate-600 mb-8">
            Thank you for your purchase. Your credits have been added to your account.
          </p>

          {/* Credits Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Your Balance</span>
            </div>
            <p className="text-4xl font-bold text-slate-900">
              {session?.user?.creditsBalance ?? "..."}{" "}
              <span className="text-lg font-normal text-slate-500">credits</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">Ready to use for AI tagging</p>
          </div>

          {/* Sync Balance Button */}
          <div className="mb-8">
            <button
              onClick={handleSyncBalance}
              disabled={isSyncing}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-slate-100 text-slate-700 border border-slate-200",
                "hover:bg-slate-200 hover:border-slate-300",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync My Balance"}
            </button>
            {syncMessage && (
              <p
                className={cn(
                  "text-sm mt-2",
                  syncMessage.includes("success") ? "text-green-600" : "text-red-600"
                )}
              >
                {syncMessage}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              If your balance hasn&apos;t updated, click to refresh
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl",
                "bg-blue-600 text-white font-semibold",
                "hover:bg-blue-700 hover:scale-105",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              )}
            >
              Back to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-slate-500">Start tagging your images with AI</p>
          </div>
        </div>
      </div>

      {/* Custom CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-slate-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
