import Link from "next/link";
import { ArrowRight, Star, HelpCircle, Upload, Layers, Sparkles, FileImage } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui";

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
  {
    question: "How does clustering work?",
    answer:
      "Clustering uses AI to analyze your images and group similar ones together. This helps you apply the same tags to related images efficiently. Clustering costs are included in your credit usage - it analyzes the images once during clustering.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            TagArchitect
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Open App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Centered & Minimal */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            TagArchitect:{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Marketplace SEO in Seconds.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Upload images, get optimized tags for Etsy & Adobe Stock. Simple. Fast. Professional.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-600/25"
          >
            Try It Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center">
            <div className="w-1.5 h-3 bg-slate-400 rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Upload className="h-7 w-7 text-blue-600" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Step 1
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Images</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Drag & drop your photos. Everything is resized locally before leaving your browser.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Layers className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Step 2
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Organize into Groups</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Let AI cluster similar images or manually drag them into groups.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-amber-600" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Step 3
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Tags</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                AI generates optimized titles & keywords tailored to Etsy or Adobe Stock.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
                <FileImage className="h-7 w-7 text-purple-600" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Step 4
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Embed in Image Properties
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Export with IPTC/XMP metadata baked in, or download a CSV for bulk upload.
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              Read the Full Guide
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tag Comparison Section */}
      <section id="comparison" className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Standard Tags */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 relative">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                Generic Tags
              </div>
              <div className="mt-4">
                <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-6xl">🎁</div>
                </div>
                <h4 className="font-semibold text-slate-900 mb-3">What you usually get:</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    "box",
                    "gift",
                    "present",
                    "wrapped",
                    "ribbon",
                    "decoration",
                    "package",
                    "container",
                    "cardboard",
                    "celebration",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Descriptive, but not how buyers search.
                </p>
              </div>
            </div>

            {/* Etsy Optimized Tags */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-8 relative">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 rounded-full text-sm font-medium text-white flex items-center gap-1">
                <Star className="w-3 h-3" />
                Etsy Optimized
              </div>
              <div className="mt-4">
                <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-6xl">🎁</div>
                </div>
                <h4 className="font-semibold text-slate-900 mb-3">What TagArchitect generates:</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    "birthday gift",
                    "gift for her",
                    "bridesmaid gift",
                    "thank you gift",
                    "housewarming",
                    "mothers day",
                    "christmas gift",
                    "anniversary",
                    "personalized",
                    "handmade gift",
                    "gift box set",
                    "unique gift",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm text-blue-700 font-medium">
                  Gift occasions + emotions = how Etsy buyers actually search.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 mb-4">
              <HelpCircle className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-600">Everything you need to know about TagArchitect</p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" className="bg-slate-50 rounded-2xl border border-slate-200 px-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-slate-900 hover:no-underline hover:text-blue-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* CTA */}
          <div className="mt-10 text-center">
            <p className="text-slate-600 mb-4">Ready to get started?</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Try It Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
