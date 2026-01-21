"use client";

import { useEffect } from "react";
import { useBatchStore } from "@/store/useBatchStore";
import { Dropzone } from "@/components/uploader";
import { ImageGallery, GroupList } from "@/components/gallery";
import { ExportToolbar } from "@/components/export";

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
              <ExportToolbar />
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

      <main className="max-w-7xl mx-auto p-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Tag Architect</h2>
          <p className="text-lg text-slate-600">Upload, Cluster, and Tag</p>
        </div>

        {/* Dropzone */}
        <Dropzone />

        {/* Image Gallery */}
        <ImageGallery className="mt-8" />

        {/* Clustered Groups */}
        <GroupList className="mt-8" />

        {sessionId && (
          <p className="text-xs text-slate-400 mt-8 text-center">
            Session: {sessionId.slice(0, 8)}...
          </p>
        )}
      </main>
    </div>
  );
}
