"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Clock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "efwfew1611@gmail.com";

const FAQ_ITEMS = [
  {
    question: "How do credits work?",
    answer:
      "1 credit = 1 image tagged by AI. Credits never expire and carry over. When you generate AI tags for an image, it deducts 1 credit from your balance.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "If you experience technical issues that prevent you from using purchased credits, please contact us and we'll review your case for a refund or credit restoration.",
  },
  {
    question: "How is my data handled?",
    answer:
      "Images are processed locally in your browser and sent to AI only for tagging. We don't permanently store your original images. See our Privacy Policy for details.",
  },
  {
    question: "What AI model do you use?",
    answer:
      "We use OpenAI's GPT-4 Vision model to analyze images and generate relevant tags optimized for marketplace listings.",
  },
];

export default function ContactPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Contact Support</h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Have a question or need help? We&apos;re here to assist you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Get in Touch</h2>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=TagArchitect Support Request`}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50",
                "hover:border-blue-300 hover:bg-blue-100 transition-all group"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Email Support</p>
                <p className="text-blue-600">{SUPPORT_EMAIL}</p>
              </div>
              <Send className="w-5 h-5 text-blue-400 ml-auto" />
            </a>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Quick Response</p>
                  <p className="text-sm text-slate-500">We typically respond within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Business Hours</p>
                  <p className="text-sm text-slate-500">Monday - Friday, 9am - 6pm CET</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">
                <strong>Tip:</strong> Include your account email and a detailed description of the
                issue for faster resolution.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 pr-4">{item.question}</span>
                    <span
                      className={cn(
                        "text-slate-400 transition-transform",
                        expandedFaq === index && "rotate-180"
                      )}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4 text-sm text-slate-600">{item.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href="/legal/privacy"
            className="text-slate-600 hover:text-blue-600 transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/pricing" className="text-slate-600 hover:text-blue-600 transition-colors">
            Pricing
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/account" className="text-slate-600 hover:text-blue-600 transition-colors">
            Account Settings
          </Link>
        </div>
      </main>
    </div>
  );
}
