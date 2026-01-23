"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useBatchStore } from "@/store/useBatchStore";
import { usePersistence, markExplicitClear } from "@/hooks/usePersistence";
import { nukeAllData } from "@/lib/persistence";
import { Dropzone } from "@/components/uploader";
import { ImageGallery, GroupList, GroupSkeleton } from "@/components/gallery";
import { ExportToolbar } from "@/components/export";
import { MarketplaceInfo, Button } from "@/components/ui";

export default function DashboardPage() {
  const { sessionId, initSession, marketplace, setMarketplace, isClustering, clearBatch, groups } =
    useBatchStore();
  const {
    isRestoring,
    error: persistenceError,
    restoredImageCount,
    triggerSync,
  } = usePersistence();
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      initSession();
    }
  }, [sessionId, initSession]);

  const handleNewBatch = async () => {
    const totalImages = groups.reduce((acc, g) => acc + g.images.length, 0);
    if (totalImages > 0) {
      if (!confirm("This will delete all images and start fresh. Are you sure?")) {
        return;
      }
    }

    setIsResetting(true);
    try {
      // Mark explicit clear to allow zero-image save
      markExplicitClear();
      // Clear IndexedDB
      await nukeAllData();
      // Clear Zustand store
      clearBatch();
      // Re-initialize session
      initSession();
    } catch (err) {
      console.error("[Dashboard] Reset failed:", err);
    } finally {
      setIsResetting(false);
    }
  };

  // Check if there are any images in the batch
  const hasImages = groups.some((g) => g.images.length > 0);

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
          <GroupList className="mt-8" onLightboxSave={triggerSync} />
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
