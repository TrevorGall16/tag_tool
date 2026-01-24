import Link from "next/link";
import {
  Zap,
  Target,
  Clock,
  ShoppingBag,
  Camera,
  Check,
  ArrowRight,
  Star,
  Shield,
  Layers,
  Coffee,
} from "lucide-react";

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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium mb-8">
            <Coffee className="w-4 h-4" />
            Built for busy Etsy & stock sellers
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Professional tagging
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {" "}
              without the busywork
            </span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Upload your images, get SEO-optimized titles and tags in seconds. Smart grouping means
            you tag once, apply to many. Finally, tagging that doesn't eat your weekend.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-600/25"
            >
              Try It Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#comparison"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-700 text-lg font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              See How It Works
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              No credit card needed
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              10 free tags to start
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Export-ready files
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-8 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-slate-400">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              <span className="font-medium">Etsy Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="w-6 h-6" />
              <span className="font-medium">Adobe Stock Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <span className="font-medium">Your Images Stay Local</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6" />
              <span className="font-medium">Seconds, Not Hours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Comparison Section */}
      <section id="comparison" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Tags that match how buyers actually search
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Generic tags get lost in the crowd. Our marketplace-specific strategies generate tags
              that connect with real buyer intent.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
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

      {/* Features Grid */}
      <section className="py-24 px-6 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for your workflow</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Whether you're listing 5 products or 500, TagArchitect scales with you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Grouping</h3>
              <p className="text-slate-400">
                Similar images get grouped together. Tag a group once, and every image in it gets
                the same metadata. Perfect for color variations.
              </p>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Marketplace Modes</h3>
              <p className="text-slate-400">
                One click to switch between Etsy-style emotional tags and Adobe Stock technical
                descriptions. The right tags for each platform.
              </p>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quick Export</h3>
              <p className="text-slate-400">
                Download a CSV ready for bulk upload, or a ZIP with metadata embedded in each file.
                No copy-pasting required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Simple pricing, no surprises
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              1 credit = 1 image tagged. Buy what you need, use it whenever. No subscriptions, no
              expiry dates.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="text-sm font-medium text-slate-500 mb-2">Free</div>
              <div className="text-4xl font-bold text-slate-900 mb-2">$0</div>
              <p className="text-slate-600 mb-6">To get you started</p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  10 credits on signup
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  All features included
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  CSV & ZIP export
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  Smart grouping
                </li>
              </ul>

              <Link
                href="/dashboard"
                className="block w-full py-3 text-center rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Starter Tier */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-8 relative">
              <div className="absolute -top-3 right-6 px-3 py-1 bg-blue-600 rounded-full text-sm font-medium text-white">
                Most Popular
              </div>
              <div className="text-sm font-medium text-blue-600 mb-2">Starter</div>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                $5<span className="text-lg font-normal text-slate-500">/50 credits</span>
              </div>
              <p className="text-slate-600 mb-6">For regular sellers</p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" />
                  50 tagging credits
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" />
                  $0.10 per image
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" />
                  Never expires
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" />
                  Project folders
                </li>
              </ul>

              <Link
                href="/pricing"
                className="block w-full py-3 text-center rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
              >
                Buy Credits
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="text-sm font-medium text-slate-500 mb-2">Pro</div>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                $15<span className="text-lg font-normal text-slate-500">/200 credits</span>
              </div>
              <p className="text-slate-600 mb-6">Best value</p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  200 tagging credits
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  $0.075 per image (25% off)
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  Everything in Starter
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  Priority support
                </li>
              </ul>

              <Link
                href="/pricing"
                className="block w-full py-3 text-center rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Buy Credits
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Get your weekends back</h2>
          <p className="text-xl text-blue-100 mb-8">
            Professional tagging for busy sellers. Less time on metadata, more time on what matters.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-600 text-lg font-semibold hover:bg-blue-50 transition-all shadow-lg"
          >
            Start Tagging Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-400">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-xl font-bold text-white">TagArchitect</div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
            <div className="text-sm">&copy; {new Date().getFullYear()} TagArchitect</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
