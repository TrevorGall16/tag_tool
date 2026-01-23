"use client";

import { useEffect, useState } from "react";
import { useBatchStore } from "@/store/useBatchStore";
import { usePersistence, markExplicitClear } from "@/hooks/usePersistence";
import { nukeAllData } from "@/lib/persistence";
import { Dropzone } from "@/components/uploader";
import { ImageGallery, GroupList, GroupSkeleton, BatchToolbar } from "@/components/gallery";
import { Header } from "@/components/layout";
import { ProjectList } from "@/components/dashboard";
import { ConfirmationModal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeft } from "lucide-react";

export default function DashboardPage() {
  const { sessionId, initSession, isClustering, clearBatch, groups } = useBatchStore();
  const {
    isRestoring,
    error: persistenceError,
    restoredImageCount,
    triggerSync,
  } = usePersistence();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      performReset();
    }
  };

  const performReset = async () => {
    setIsResetting(true);
    setShowResetModal(false);
    try {
      markExplicitClear();
      await nukeAllData();
      clearBatch();
      initSession();
    } catch (err) {
      console.error("[Dashboard] Reset failed:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const hasImages = groups.some((g) => g.images.length > 0);

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

  if (persistenceError) {
    console.error("Persistence error:", persistenceError);
  }

  if (restoredImageCount > 0) {
    console.log(`[Session] Restored ${restoredImageCount} images from previous session`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Header onNewBatch={handleNewBatchClick} isResetting={isResetting} />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "bg-white border-r border-slate-200 transition-all duration-300 shrink-0",
            sidebarOpen ? "w-64" : "w-0 overflow-hidden"
          )}
        >
          <ProjectList
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived(!showArchived)}
            className="h-[calc(100vh-73px)]"
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Sidebar Toggle + Breadcrumb */}
          <div className="px-8 pt-6 pb-2 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeft className="h-5 w-5" />
              )}
            </button>
            <div className="text-sm text-slate-500">
              {showArchived ? (
                <span className="font-medium text-amber-600">Archived Batches</span>
              ) : selectedProjectId ? (
                <span>
                  Projects / <span className="font-medium text-slate-700">Selected Project</span>
                </span>
              ) : (
                <span className="font-medium text-slate-700">All Batches</span>
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-8 py-6">
            {/* Title Section */}
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Tag Architect
              </h2>
              <p className="text-lg text-slate-600">Upload, Cluster, and Tag</p>
            </div>

            {/* Dropzone */}
            <Dropzone />

            {/* Image Gallery */}
            <ImageGallery className="mt-12" />

            {/* Batch Toolbar - Strategy & Export */}
            <BatchToolbar className="mt-8" selectedProjectId={selectedProjectId} />

            {/* Clustered Groups */}
            {isClustering ? (
              <GroupSkeleton className="mt-6" count={3} />
            ) : (
              <GroupList className="mt-6" onLightboxSave={triggerSync} />
            )}
          </div>
        </main>
      </div>

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
