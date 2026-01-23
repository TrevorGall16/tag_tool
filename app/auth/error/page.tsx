"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access was denied. You may not have permission to sign in.",
  Verification: "The verification link has expired or has already been used.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the OAuth callback.",
  OAuthCreateAccount: "Could not create OAuth provider account.",
  EmailCreateAccount: "Could not create email provider account.",
  Callback: "Error in the OAuth callback handler.",
  OAuthAccountNotLinked:
    "This email is already associated with another account. Please sign in with the original method.",
  EmailSignin: "Error sending the verification email.",
  CredentialsSignin: "Sign in failed. Check the details you provided are correct.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An unexpected error occurred. Please try again.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";

  const errorMessage = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Authentication Error</h1>
        <p className="text-slate-600 mb-8">{errorMessage}</p>

        {/* Actions */}
        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200"
          >
            Try again
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        {/* Error Code */}
        <p className="mt-8 text-xs text-slate-400">Error code: {error}</p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
