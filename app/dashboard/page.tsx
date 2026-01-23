"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useBatchStore } from "@/store/useBatchStore";
import { usePersistence, markExplicitClear } from "@/hooks/usePersistence";
import { nukeAllData } from "@/lib/persistence";
import { Dropzone } from "@/components/uploader";
import { ImageGallery, GroupList, GroupSkeleton } from "@/components/gallery";
import { ExportToolbar } from "@/components/export";
import { MarketplaceInfo, Button, ConfirmationModal } from "@/components/ui";

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
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      initSession();
    }
  }, [sessionId, initSession]);

  const handleNewBatchClick = () => {
    const totalImages = groups.reduce((acc, g) => acc + g.images.length, 0);
    if (totalImages > 0) {
      setShowResetModal(true);
    } else {
      // No images, just reset directly
      performReset();
    }
  };

  const performReset = async () => {
    setIsResetting(true);
    setShowResetModal(false);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TagArchitect</h1>
            <div className="flex items-center gap-4">
              <ExportToolbar />
              <div className="flex items-center gap-2">
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value as "ETSY" | "ADOBE_STOCK")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-slate-400"
                >
                  <option value="ETSY">Etsy</option>
                  <option value="ADOBE_STOCK">Adobe Stock</option>
                </select>
                <MarketplaceInfo marketplace={marketplace} />
                <button
                  onClick={handleNewBatchClick}
                  disabled={isResetting}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
                  title="Start new batch (clears all images)"
                >
                  <RotateCcw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
                  New Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Tag Architect</h2>
          <p className="text-lg text-slate-600">Upload, Cluster, and Tag</p>
        </div>

        {/* Dropzone */}
        <Dropzone />

        {/* Image Gallery */}
        <ImageGallery className="mt-12" />

        {/* Clustered Groups */}
        {isClustering ? (
          <GroupSkeleton className="mt-12" count={3} />
        ) : (
          <GroupList className="mt-12" onLightboxSave={triggerSync} />
        )}

        {sessionId && (
          <p className="text-xs text-slate-400 mt-12 text-center">
            Session: {sessionId.slice(0, 8)}...
          </p>
        )}
      </main>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={performReset}
        title="Start a New Batch?"
        message="This will permanently delete your current images and metadata. This action cannot be undone."
        confirmLabel="Delete & Start Fresh"
        cancelLabel="Keep Working"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
}
