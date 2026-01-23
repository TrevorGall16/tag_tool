"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-slate-900">TagArchitect</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          {/* Title */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
              <p className="text-slate-500">Last updated: January 2026</p>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-slate prose-headings:text-slate-900 prose-p:text-slate-800 prose-li:text-slate-800 prose-strong:text-slate-900 max-w-none">
            <h2>1. Introduction</h2>
            <p>
              TagArchitect (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our AI-powered image tagging service.
            </p>

            <h2>2. Information We Collect</h2>

            <h3>2.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Name (if provided via Google OAuth)</li>
              <li>Profile picture (if provided via Google OAuth)</li>
            </ul>

            <h3>2.2 Images and Content</h3>
            <p>When you use our service:</p>
            <ul>
              <li>
                <strong>Temporary Storage:</strong> Images are processed locally in your browser.
                Thumbnails may be temporarily stored to enable the tagging workflow.
              </li>
              <li>
                <strong>AI Processing:</strong> Image data is sent to AI services (OpenAI) for tag
                generation. We do not permanently store your original images on our servers.
              </li>
              <li>
                <strong>Generated Tags:</strong> AI-generated tags and titles are stored temporarily
                for your session and can be exported.
              </li>
            </ul>

            <h3>2.3 Payment Information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store your credit card details. We
              only receive confirmation of successful payments and transaction IDs.
            </p>

            <h3>2.4 Usage Data</h3>
            <p>We automatically collect:</p>
            <ul>
              <li>Credit usage and purchase history</li>
              <li>Feature usage analytics (anonymized)</li>
              <li>Error logs for debugging purposes</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and maintain our tagging service</li>
              <li>Process payments and manage your credit balance</li>
              <li>Send transactional emails (receipts, account notifications)</li>
              <li>Improve our AI models and service quality</li>
              <li>Respond to support requests</li>
            </ul>

            <h2>4. Data Sharing</h2>
            <p>We share data with:</p>
            <ul>
              <li>
                <strong>OpenAI:</strong> Image data for AI tag generation (subject to OpenAI&apos;s
                privacy policy)
              </li>
              <li>
                <strong>Stripe:</strong> Payment processing (subject to Stripe&apos;s privacy
                policy)
              </li>
              <li>
                <strong>Vercel:</strong> Hosting and infrastructure
              </li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h2>5. Data Retention</h2>
            <ul>
              <li>
                <strong>Session Data:</strong> Batch data expires after 7 days of inactivity
              </li>
              <li>
                <strong>Account Data:</strong> Retained until you delete your account
              </li>
              <li>
                <strong>Payment Records:</strong> Retained for legal and tax compliance (typically 7
                years)
              </li>
            </ul>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h2>7. Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS encryption, secure
              authentication, and regular security audits. However, no method of transmission over
              the Internet is 100% secure.
            </p>

            <h2>8. Cookies</h2>
            <p>We use essential cookies for:</p>
            <ul>
              <li>Authentication and session management</li>
              <li>Remembering your preferences</li>
            </ul>
            <p>We do not use tracking or advertising cookies.</p>

            <h2>9. Children&apos;s Privacy</h2>
            <p>
              Our service is not intended for users under 16 years of age. We do not knowingly
              collect information from children.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant
              changes via email or through the service.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, please contact us at:{" "}
              <a href="mailto:trevor.gallois@gmail.com" className="text-blue-600 hover:underline">
                trevor.gallois@gmail.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
