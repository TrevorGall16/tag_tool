import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Upload, Layers, Sparkles, FileImage } from "lucide-react";

export default function GuidePage() {
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
            <h1 className="text-xl font-bold text-slate-900">TagArchitect / Guide</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            How TagArchitect Works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Batch-tag your images for Etsy and Adobe Stock in four simple steps.
          </p>
        </div>

        <div className="space-y-16">
          {/* Step 1: Upload */}
          <section className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                    Step 1
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900">Upload Images</h3>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Drag and drop your images into the dropzone, or click to browse your files.
                TagArchitect supports JPEG, PNG, and WebP formats. All images are resized locally
                before processing — nothing leaves your browser until you explicitly request AI
                analysis.
              </p>
            </div>
            <Image
              src="/screenshots/step-1.png"
              alt="Step 1: Upload images"
              width={800}
              height={450}
              className="w-full md:w-1/2 h-auto min-h-[280px] rounded-xl object-contain border border-slate-200 bg-slate-50 shadow-md p-2"
            />
          </section>

          {/* Step 2: Organize */}
          <section className="flex flex-col md:flex-row-reverse items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">
                    Step 2
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900">Organize into Groups</h3>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Use AI Auto-Cluster to let the AI sort similar images into groups, group everything
                together with one click, or go fully manual and drag images between groups yourself.
                Groups share titles, descriptions, and tags so you can batch-tag efficiently.
              </p>
            </div>
            <Image
              src="/screenshots/step-2.png"
              alt="Step 2: Organize into Groups"
              width={800}
              height={450}
              className="w-full md:w-1/2 h-auto min-h-[280px] rounded-xl object-contain border border-slate-200 bg-slate-50 shadow-md p-2"
            />
          </section>

          {/* Step 3: Generate Tags */}
          <section className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
                    Step 3
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900">Generate Tags</h3>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Click the "Tag" button on any group to generate an optimized title and keyword tags
                using AI vision. Tags are tailored to your chosen marketplace (Etsy or Adobe Stock).
                You can edit, reorder, add, or remove tags before exporting.
              </p>
            </div>
            <Image
              src="/screenshots/step-3.png"
              alt="Step 3: Generate Tags"
              width={800}
              height={450}
              className="w-full md:w-1/2 h-auto min-h-[280px] rounded-xl object-contain border border-slate-200 bg-slate-50 shadow-md p-2"
            />
          </section>

          {/* Step 4: Export */}
          <section className="flex flex-col md:flex-row-reverse items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <FileImage className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-purple-600 uppercase tracking-wide">
                    Step 4
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900">
                    How Tags Embed in Image Properties
                  </h3>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                When you export, TagArchitect writes your titles and tags directly into each image's
                IPTC/XMP metadata. This means Etsy and Adobe Stock can read the keywords
                automatically when you upload — no manual copy-pasting required. You can also export
                as a CSV spreadsheet for bulk upload tools.
              </p>
            </div>
            <Image
              src="/screenshots/step-4.png"
              alt="Step 4: Export metadata"
              width={800}
              height={450}
              className="w-full md:w-1/2 h-auto min-h-[280px] rounded-xl object-contain border border-slate-200 bg-slate-50 shadow-md p-2"
            />
          </section>
        </div>

        {/* CTA */}
        <div className="text-center mt-16 pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Ready to get started?</h3>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}