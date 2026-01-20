import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">TagArchitect</h1>
        <p className="text-lg text-slate-700 mb-8">
          AI-powered batch tagging for Etsy & Adobe Stock. Transform hours of manual work into
          minutes with smart clustering and Claude Vision.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors duration-150 hover:scale-105"
          >
            Start Tagging
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="rounded-xl border border-slate-200 border-t-white/20 p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Smart Clustering</h3>
            <p className="text-sm text-slate-700">
              AI groups similar images automatically, saving you time on repetitive tagging.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-white/20 p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Claude Vision</h3>
            <p className="text-sm text-slate-700">
              Get intelligent title and tag suggestions powered by advanced AI vision.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 border-t-white/20 p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Easy Export</h3>
            <p className="text-sm text-slate-700">
              Export CSV files ready for Etsy or Adobe Stock with one click.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
