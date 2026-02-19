"use client";

import { useState } from "react";
import { Layers, ImageIcon, Loader2, X, Users, Hand } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBatchStore, LocalGroup } from "@/store/useBatchStore";
import { deleteImageData } from "@/lib/persistence";
import { markExplicitClear } from "@/hooks/usePersistence";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";
import { DraggableImage, DroppableGroup } from "@/components/dnd";
import { ClusterDialog } from "./ClusterDialog";
import { NamingSettings } from "./NamingSettings";
import type { VisionClusterResponse, ClusterSettings } from "@/types";

export interface ImageGalleryProps {
  className?: string;
}

export function ImageGallery({ className }: ImageGalleryProps) {
  const {
    groups,
    marketplace,
    isClustering,
    error,
    namingSettings,
    appendGroups,
    clearAllGroups,
    setProcessingState,
    setError,
    removeImageFromGroup,
    setClusteringProgress,
  } = useBatchStore();

  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showGroupAllConfirm, setShowGroupAllConfirm] = useState(false);
  const [clusterMode, setClusterMode] = useState<"append" | "clear" | null>(null);
  const [pendingSettings, setPendingSettings] = useState<ClusterSettings | undefined>(undefined);

  const BATCH_SIZE = 20;

  const unclusteredGroup = groups.find((g) => g.id === "unclustered");
  const images = unclusteredGroup?.images ?? [];

  const handleDeleteImage = async (imageId: string) => {
    // Mark explicit clear to allow sync with reduced image count
    markExplicitClear();
    // Remove from store
    removeImageFromGroup("unclustered", imageId);
    // Delete from IndexedDB
    try {
      await deleteImageData(imageId);
    } catch (err) {
      console.error("[ImageGallery] Failed to delete image from IndexedDB:", err);
    }
  };

  // Check if there are existing clustered groups
  const existingGroups = groups.filter((g) => g.id !== "unclustered" && g.images.length > 0);
  const hasExistingGroups = existingGroups.length > 0;

  const handleClusterButtonClick = () => {
    if (images.length === 0) {
      setError("Upload images first before organizing");
      return;
    }

    // Show organize options modal first
    setShowOrganizeModal(true);
  };

  const handleAIAutoCluster = () => {
    setShowOrganizeModal(false);
    if (images.length < 2) {
      setError("At least 2 images are required for AI clustering");
      return;
    }
    // Proceed to existing cluster settings dialog
    setShowSettingsDialog(true);
  };

  const handleGroupAllTogether = () => {
    setShowOrganizeModal(false);
    setShowGroupAllConfirm(true);
  };

  const confirmGroupAll = () => {
    setShowGroupAllConfirm(false);
    const baseName = namingSettings.prefix || "Group";
    const number = namingSettings.startNumber || 1;
    const groupTitle = `${baseName} ${number}`;
    const newGroup: LocalGroup = {
      id: crypto.randomUUID(),
      groupNumber: number,
      images: [...images],
      sharedTitle: groupTitle,
      sharedTags: [],
      isVerified: false,
      createdAt: Date.now(),
    };
    appendGroups([newGroup]);
    toast.success(`Grouped all ${images.length} images as "${groupTitle}"`);
  };

  const handleManualMode = () => {
    setShowOrganizeModal(false);
    toast("Manual mode — create groups and drag images into them", {
      duration: 5000,
    });
    // Scroll down so both the image pool and groups area are visible
    setTimeout(() => {
      window.scrollBy({ top: 300, behavior: "smooth" });
    }, 100);
  };

  const handleSettingsConfirm = () => {
    setShowSettingsDialog(false);
    // Use global naming settings from store
    const settings = namingSettings;
    setPendingSettings(settings);

    // If there are existing groups, ask about append/clear
    if (hasExistingGroups) {
      setShowClusterDialog(true);
      return;
    }

    // No existing groups, proceed directly with settings
    performClustering("append", settings);
  };

  const handleDialogChoice = (mode: "append" | "clear") => {
    setShowClusterDialog(false);
    performClustering(mode, pendingSettings);
    setPendingSettings(undefined);
  };

  const performClustering = async (mode: "append" | "clear", settings?: ClusterSettings) => {
    if (images.length < 2) {
      setError("At least 2 images are required for clustering");
      return;
    }

    // If clearing, do it before clustering
    if (mode === "clear") {
      markExplicitClear();
      clearAllGroups();
    }

    setError(null);
    setProcessingState({ isClustering: true });

    // Calculate batches for progress tracking
    const totalBatches = Math.ceil(images.length / BATCH_SIZE);
    const needsBatching = images.length > BATCH_SIZE;

    if (needsBatching) {
      setClusteringProgress({
        currentBatch: 0,
        totalBatches,
        totalImages: images.length,
      });
    }

    try {
      const allGroups: VisionClusterResponse["groups"] = [];

      if (needsBatching) {
        // Client-side batching for progress tracking
        for (let i = 0; i < totalBatches; i++) {
          const start = i * BATCH_SIZE;
          const batchImages = images.slice(start, start + BATCH_SIZE);

          setClusteringProgress({
            currentBatch: i + 1,
            totalBatches,
            totalImages: images.length,
          });

          const response = await fetch("/api/vision/cluster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: batchImages.map((img) => ({
                id: img.id,
                dataUrl: img.thumbnailDataUrl,
                name: img.originalFilename || "Untitled",
              })),
              marketplace,
              maxGroups: Math.max(2, Math.ceil(10 * (batchImages.length / images.length))),
              settings,
            }),
          });

          const result = (await response.json()) as {
            success: boolean;
            data?: VisionClusterResponse;
            error?: string;
          };

          if (!result.success || !result.data) {
            throw new Error(result.error || `Clustering failed for batch ${i + 1}`);
          }

          allGroups.push(...result.data.groups);
        }
      } else {
        // Single batch - no progress needed
        const response = await fetch("/api/vision/cluster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: images.map((img) => ({
              id: img.id,
              dataUrl: img.thumbnailDataUrl,
              name: img.originalFilename || "Untitled",
            })),
            marketplace,
            maxGroups: 10,
            settings,
          }),
        });

        const result = (await response.json()) as {
          success: boolean;
          data?: VisionClusterResponse;
          error?: string;
        };

        if (!result.success || !result.data) {
          throw new Error(result.error || "Clustering failed");
        }

        allGroups.push(...result.data.groups);
      }

      // Transform API response into LocalGroup[] format
      // CRITICAL: Always generate UUID for group IDs to ensure uniqueness
      const baseTimestamp = Date.now();
      const newGroups: LocalGroup[] = allGroups.map((cluster, index) => {
        const groupId = crypto.randomUUID(); // Always use UUID, ignore API's groupId
        return {
          id: groupId,
          groupNumber: index + 1,
          images: cluster.imageIds
            .map((id) => images.find((img) => img.id === id))
            .filter((img): img is NonNullable<typeof img> => img !== undefined),
          sharedTags: [],
          sharedTitle: cluster.title || cluster.suggestedLabel, // Use AI title with fallback
          semanticTags: cluster.semanticTags, // Store semantic category tags array
          isVerified: false,
          createdAt: baseTimestamp + index, // Preserve order with incrementing timestamps
        };
      });

      appendGroups(newGroups);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Clustering failed";
      const isOverloaded =
        /timeout|overloaded|rate.?limit|503|529|too many/i.test(raw) ||
        raw.includes("fetch failed");
      const message = isOverloaded
        ? "The AI is currently overloaded. Please wait a moment and try again."
        : raw;
      setError(message);
    } finally {
      setProcessingState({ isClustering: false });
      setClusteringProgress(null);
    }
  };

  return (
    <div className={className}>
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Uploaded Images {images.length > 0 && `(${images.length})`}
        </h2>
        <div className="flex items-center gap-2">
          <NamingSettings />
          <button
            onClick={handleClusterButtonClick}
            disabled={images.length === 0 || isClustering}
            className={cn(
              "inline-flex items-center gap-2",
              "bg-blue-600 text-white px-4 py-2 rounded-lg font-medium",
              "hover:bg-blue-700 hover:scale-105",
              "transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
            )}
          >
            {isClustering ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Layers className="h-4 w-4" aria-hidden="true" />
            )}
            {isClustering ? "Clustering..." : "Organize"}
          </button>
          <span className="text-[10px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            Beta
          </span>
        </div>
      </div>

      {/* Grid or Empty State */}
      <DroppableGroup groupId="unclustered">
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image) => (
              <DraggableImage
                key={image.id}
                image={image}
                groupId="unclustered"
                onDeleteImage={(imageId) => handleDeleteImage(imageId)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
              <ImageIcon className="h-8 w-8 text-slate-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No images uploaded yet</h3>
            <p className="text-sm text-slate-500">
              Drop images in the dropzone above to get started
            </p>
          </div>
        )}
      </DroppableGroup>

      {/* Organize Options Modal */}
      <AlertDialog open={showOrganizeModal} onOpenChange={setShowOrganizeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How would you like to organize?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to group your {images.length} image{images.length !== 1 ? "s" : ""} before
              tagging.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <button
              onClick={handleAIAutoCluster}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 text-left",
                "hover:border-blue-400 hover:bg-blue-50 transition-all"
              )}
            >
              <div className="p-2 rounded-lg bg-blue-100">
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">AI Auto-Cluster</p>
                <p className="text-sm text-slate-500">
                  AI groups similar images together automatically
                </p>
              </div>
            </button>
            <button
              onClick={handleGroupAllTogether}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 text-left",
                "hover:border-emerald-400 hover:bg-emerald-50 transition-all"
              )}
            >
              <div className="p-2 rounded-lg bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Group All Together</p>
                <p className="text-sm text-slate-500">Put all images into one group instantly</p>
              </div>
            </button>
            <button
              onClick={handleManualMode}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 text-left",
                "hover:border-amber-400 hover:bg-amber-50 transition-all"
              )}
            >
              <div className="p-2 rounded-lg bg-amber-100">
                <Hand className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Manual (I'll do it myself)</p>
                <p className="text-sm text-slate-500">
                  Create empty groups and drag images into them
                </p>
              </div>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOrganizeModal(false)}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cluster Confirmation Dialog */}
      <ClusterDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        onConfirm={handleSettingsConfirm}
        imageCount={images.length}
      />

      {/* Group All Confirmation Dialog */}
      <AlertDialog open={showGroupAllConfirm} onOpenChange={setShowGroupAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all {images.length} unclustered image
              {images.length !== 1 ? "s" : ""} into a single group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowGroupAllConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmGroupAll}>Group All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Existing Groups Dialog */}
      <AlertDialog open={showClusterDialog} onOpenChange={setShowClusterDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Groups Found</AlertDialogTitle>
            <AlertDialogDescription>
              You have {existingGroups.length} existing group
              {existingGroups.length !== 1 ? "s" : ""} with{" "}
              {existingGroups.reduce((sum, g) => sum + g.images.length, 0)} images. Do you want to
              keep your current groups or start fresh?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClusterDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant="outline" onClick={() => handleDialogChoice("append")}>
              Keep & Add New
            </AlertDialogAction>
            <AlertDialogAction variant="destructive" onClick={() => handleDialogChoice("clear")}>
              Clear & Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
