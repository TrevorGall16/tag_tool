"use client";

import { useEffect } from "react";
import { useBatchStore } from "@/store/useBatchStore";

export default function DashboardPage() {
  const { sessionId, initSession, marketplace, setMarketplace } = useBatchStore();

  useEffect(() => {
    if (!sessionId) {
      initSession();
    }
  }, [sessionId, initSession]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">TagArchitect</h1>
            <div className="flex items-center gap-4">
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value as "ETSY" | "ADOBE_STOCK")}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ETSY">Etsy</option>
                <option value="ADOBE_STOCK">Adobe Stock</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 border-t-white/20 p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Upload Your Images</h2>
            <p className="text-slate-700 mb-8">
              Drag and drop images here to begin batch tagging. Supports JPG, PNG, and WebP.
            </p>

            {/* Dropzone placeholder - will be replaced with actual component */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
              <div className="text-slate-500">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm">
                  <span className="font-medium text-blue-600">Click to upload</span> or drag and
                  drop
                </p>
                <p className="text-xs mt-1">Maximum 50 images per batch</p>
              </div>
            </div>

            {sessionId && (
              <p className="text-xs text-slate-400 mt-4">Session: {sessionId.slice(0, 8)}...</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
