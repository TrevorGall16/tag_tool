"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  CreditCard,
  History,
  Coins,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Gift,
  Loader2,
  AlertCircle,
  Shield,
  Mail,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";

interface LedgerEntry {
  id: string;
  amount: number;
  reason: "PURCHASE" | "SUBSCRIPTION" | "USAGE" | "REFUND" | "BONUS" | "ADMIN_ADJUST";
  description: string | null;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  receiptUrl: string | null;
}

interface AccountData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    creditsBalance: number;
    subscriptionTier: string;
    subscriptionStatus: string | null;
    createdAt: string;
  };
  creditsLedger: LedgerEntry[];
  payments: Payment[];
}

const REASON_CONFIG: Record<
  LedgerEntry["reason"],
  { label: string; icon: typeof TrendingUp; color: string }
> = {
  PURCHASE: { label: "Purchase", icon: CreditCard, color: "text-green-600 bg-green-50" },
  SUBSCRIPTION: { label: "Subscription", icon: CreditCard, color: "text-blue-600 bg-blue-50" },
  USAGE: { label: "Usage", icon: TrendingDown, color: "text-orange-600 bg-orange-50" },
  REFUND: { label: "Refund", icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  BONUS: { label: "Bonus", icon: Gift, color: "text-pink-600 bg-pink-50" },
  ADMIN_ADJUST: { label: "Adjustment", icon: History, color: "text-slate-600 bg-slate-50" },
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/account");
      return;
    }

    if (status === "authenticated") {
      fetchAccountData();
    }
  }, [status, router]);

  const fetchAccountData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/account");
      if (!response.ok) {
        throw new Error("Failed to fetch account data");
      }
      const data = await response.json();
      setAccountData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading account...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Account</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchAccountData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Account & History</h1>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Coins className="w-4 h-4" />
              Buy Credits
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start gap-6">
            {accountData?.user.image ? (
              <img
                src={accountData.user.image}
                alt={accountData.user.name || "User"}
                className="w-20 h-20 rounded-full border-2 border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {accountData?.user.name || "User"}
              </h2>
              <p className="text-slate-600">{accountData?.user.email}</p>
              <p className="text-sm text-slate-500 mt-1">
                Member since{" "}
                {accountData?.user.createdAt
                  ? new Date(accountData.user.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "..."}
              </p>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                <Coins className="w-5 h-5 text-amber-600" />
                <span className="text-2xl font-bold text-slate-900">
                  {accountData?.user.creditsBalance ?? 0}
                </span>
                <span className="text-slate-600">credits</span>
              </div>
              <Link
                href="/pricing"
                className="block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Buy more credits →
              </Link>
            </div>
          </div>
        </section>

        {/* Credit History */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Credit History</h3>
              <p className="text-sm text-slate-500">Track your credit purchases and usage</p>
            </div>
          </div>

          {accountData?.creditsLedger && accountData.creditsLedger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                      Project
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountData.creditsLedger.map((entry) => {
                    const config = REASON_CONFIG[entry.reason];
                    const Icon = config.icon;
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                              config.color
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {entry.projectName ? (
                            <span className="text-slate-700 font-medium">{entry.projectName}</span>
                          ) : (
                            <span className="text-slate-400">General</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {entry.description || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              "font-semibold",
                              entry.amount > 0 ? "text-green-600" : "text-orange-600"
                            )}
                          >
                            {entry.amount > 0 ? "+" : ""}
                            {entry.amount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No credit history yet</p>
              <Link href="/pricing" className="text-blue-600 hover:underline text-sm mt-1 block">
                Purchase credits to get started
              </Link>
            </div>
          )}
        </section>

        {/* Purchase History */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Purchase History</h3>
              <p className="text-sm text-slate-500">Your payment receipts from Stripe</p>
            </div>
          </div>

          {accountData?.payments && accountData.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountData.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(payment.created * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {payment.description || "Credit purchase"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                            payment.status === "succeeded"
                              ? "bg-green-50 text-green-600"
                              : "bg-amber-50 text-amber-600"
                          )}
                        >
                          {payment.status === "succeeded" ? "Paid" : payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        €{(payment.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {payment.receiptUrl ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No purchase history yet</p>
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="grid md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/faq"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">FAQ</h4>
              <p className="text-sm text-slate-500">Common questions answered</p>
            </div>
          </Link>

          <Link
            href="/legal/privacy"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Privacy Policy</h4>
              <p className="text-sm text-slate-500">How we handle your data</p>
            </div>
          </Link>

          <Link
            href="/contact"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Contact Support</h4>
              <p className="text-sm text-slate-500">Get help with your account</p>
            </div>
          </Link>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Danger Zone</h3>
              <p className="text-sm text-slate-500">Irreversible account actions</p>
            </div>
          </div>

          <div className="border-t border-red-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Delete Account</h4>
                <p className="text-sm text-slate-500">
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteAccountDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                fetch("/api/account", { method: "DELETE" })
                  .then((res) => {
                    if (res.ok) {
                      router.push("/auth/signin?deleted=true");
                    } else {
                      toast.error("Failed to delete account. Please contact support.");
                    }
                  })
                  .catch(() => {
                    toast.error("Failed to delete account. Please try again.");
                  });
              }}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
