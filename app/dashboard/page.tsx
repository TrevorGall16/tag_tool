"use client";

import { useEffect } from "react";
import { useBatchStore } from "@/store/useBatchStore";
import { usePersistence } from "@/hooks/usePersistence";
import { Dropzone } from "@/components/uploader";
import { ImageGallery, GroupList, GroupSkeleton } from "@/components/gallery";
import { ExportToolbar } from "@/components/export";
import { MarketplaceInfo } from "@/components/ui";

export default function DashboardPage() {
  const { sessionId, initSession, marketplace, setMarketplace, isClustering } = useBatchStore();
  const { isRestoring, error: persistenceError, restoredImageCount } = usePersistence();

  useEffect(() => {
    if (!sessionId) {
      initSession();
    }
  }, [sessionId, initSession]);

  // Show loading state while restoring from IndexedDB
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Restoring your session...</p>
          <p className="text-sm text-slate-500 mt-1">Please wait while we load your images</p>
        </div>
      </div>
    );
  }

  // Show error if persistence failed
  if (persistenceError) {
    console.error("Persistence error:", persistenceError);
  }

  // Show restoration success message briefly (could be toast in future)
  if (restoredImageCount > 0) {
    console.log(`[Session] Restored ${restoredImageCount} images from previous session`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">TagArchitect</h1>
            <div className="flex items-center gap-4">
              <ExportToolbar />
              <div className="flex items-center gap-1">
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value as "ETSY" | "ADOBE_STOCK")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ETSY">Etsy</option>
                  <option value="ADOBE_STOCK">Adobe Stock</option>
                </select>
                <MarketplaceInfo marketplace={marketplace} />
              </div>
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
        {isClustering ? (
          <GroupSkeleton className="mt-8" count={3} />
        ) : (
          <GroupList className="mt-8" />
        )}

        {sessionId && (
          <p className="text-xs text-slate-400 mt-8 text-center">
            Session: {sessionId.slice(0, 8)}...
          </p>
        )}
      </main>
    </div>
  );
}
