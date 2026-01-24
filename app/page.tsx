import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

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

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-400">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-xl font-bold text-white">TagArchitect</div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
            <div className="text-sm">&copy; {new Date().getFullYear()} TagArchitect</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
