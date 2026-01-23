import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Check your email</h1>
        <p className="text-slate-600 mb-8">
          We&apos;ve sent you a magic link to sign in. Click the link in your email to continue.
        </p>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h2 className="font-medium text-slate-900 mb-2">Didn&apos;t receive the email?</h2>
          <ul className="text-sm text-slate-600 text-left space-y-2">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email</li>
            <li>• Wait a few minutes and try again</li>
          </ul>
        </div>

        {/* Back Link */}
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
