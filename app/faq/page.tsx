import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do credits work?",
    answer:
      "1 credit = 1 image analysis. When you upload an image and generate tags, it uses 1 credit. Credits never expire and can be purchased in bundles. You start with 10 free credits when you sign up.",
  },
  {
    question: "Which marketplaces are supported?",
    answer:
      "TagArchitect currently supports Etsy and Adobe Stock. Each marketplace has its own tagging strategy optimized for how buyers search on that platform. Etsy tags focus on gift occasions, emotions, and buyer intent, while Adobe Stock tags are more technical and descriptive.",
  },
  {
    question: "Are my images stored?",
    answer:
      "No, your images are never stored on our servers. Images are processed locally in your browser (resized to under 512px) before being sent for tag analysis. We only generate and return the tags and titles - your original images stay on your device.",
  },
  {
    question: "Can I edit the generated tags?",
    answer:
      "Yes, all generated tags and titles are fully editable. You can add, remove, or reorder tags before exporting. Changes are saved to your local session.",
  },
  {
    question: "What export formats are available?",
    answer:
      "You can export your tagged images as a ZIP file with embedded metadata, or download a CSV file compatible with Adobe Stock bulk upload. The CSV includes filename, title, and keywords columns.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No, credits never expire. Purchase once and use whenever you need them. There are no subscriptions or recurring charges.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="text-xl font-bold text-slate-900">FAQ</h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-lg text-slate-600">Everything you need to know about TagArchitect</p>
        </div>

        {/* FAQ List */}
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">{faq.question}</h3>
              <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Still have questions?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  );
}
