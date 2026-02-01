import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <span className="text-sm font-medium text-slate-900 dark:text-white">TagArchitect</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Document Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
                <p className="text-blue-100 text-sm mt-1">Last updated: January 2026</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="px-8 py-10">
            <div className="prose prose-slate dark:prose-invert prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-li:text-slate-600 dark:prose-li:text-slate-400 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline max-w-none">
              <h2>1. Agreement to Terms</h2>
              <p>
                By accessing or using TagArchitect (&quot;Service&quot;), you agree to be bound by
                these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these
                terms, you may not access the Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                TagArchitect is an AI-powered image tagging service that helps users generate
                metadata, keywords, and descriptions for images intended for stock photography
                platforms such as Etsy and Adobe Stock.
              </p>

              <h2>3. Account Registration</h2>
              <p>To use certain features of the Service, you must:</p>
              <ul>
                <li>Create an account using valid information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly notify us of any unauthorized access</li>
                <li>Be at least 16 years of age</li>
              </ul>
              <p>You are responsible for all activities that occur under your account.</p>

              <h2>4. Credits and Payments</h2>
              <h3>4.1 Credit System</h3>
              <p>
                The Service operates on a credit-based system. Credits are consumed when you use
                AI-powered features to generate tags and metadata for your images.
              </p>

              <h3>4.2 Purchases</h3>
              <ul>
                <li>All credit purchases are final and non-refundable</li>
                <li>Credits do not expire</li>
                <li>Credits cannot be transferred between accounts</li>
                <li>Prices are subject to change with reasonable notice</li>
              </ul>

              <h3>4.3 Refunds</h3>
              <p>
                Refunds may be provided at our sole discretion in cases of technical errors that
                prevented service delivery. Contact support within 7 days of the issue.
              </p>

              <h2>5. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Upload illegal, harmful, or infringing content</li>
                <li>Attempt to reverse engineer or exploit the Service</li>
                <li>Use the Service for any unlawful purpose</li>
                <li>Share account credentials with third parties</li>
                <li>Automate access to the Service without permission</li>
                <li>Interfere with or disrupt the Service infrastructure</li>
              </ul>

              <h2>6. Intellectual Property</h2>
              <h3>6.1 Your Content</h3>
              <p>
                You retain all rights to the images you upload. By using the Service, you grant us a
                limited license to process your images solely for the purpose of providing the
                Service.
              </p>

              <h3>6.2 Generated Content</h3>
              <p>
                Tags, titles, and descriptions generated by our AI are provided for your use. You
                may use this generated content for your stock photography submissions without
                restriction.
              </p>

              <h3>6.3 Our Property</h3>
              <p>
                The Service, including its design, features, and underlying technology, is owned by
                TagArchitect and protected by intellectual property laws.
              </p>

              <h2>7. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
                GUARANTEE THAT:
              </p>
              <ul>
                <li>The Service will be uninterrupted or error-free</li>
                <li>Generated tags will be accepted by any specific platform</li>
                <li>AI-generated content will be accurate or suitable for your needs</li>
              </ul>

              <h2>8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TAGARCHITECT SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF
                PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
              </p>
              <p>
                Our total liability shall not exceed the amount you paid to us in the 12 months
                preceding the claim.
              </p>

              <h2>9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless TagArchitect from any claims, damages, or
                expenses arising from your use of the Service, your content, or your violation of
                these Terms.
              </p>

              <h2>10. Termination</h2>
              <p>
                We may suspend or terminate your account at any time for violation of these Terms or
                for any other reason at our discretion. Upon termination:
              </p>
              <ul>
                <li>Your right to use the Service ceases immediately</li>
                <li>Unused credits are forfeited</li>
                <li>We may delete your account data after a reasonable period</li>
              </ul>

              <h2>11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of
                significant changes via email or through the Service. Continued use after changes
                constitutes acceptance of the new Terms.
              </p>

              <h2>12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable laws,
                without regard to conflict of law principles.
              </p>

              <h2>13. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at:{" "}
                <a href="mailto:efwfew1611@gmail.com">efwfew1611@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
