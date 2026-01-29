"use client";

import { useState } from "react";
import { Layers, ImageIcon, Loader2, X } from "lucide-react";
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
import { ClusterDialog } from "./ClusterDialog";
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
    appendGroups,
    clearAllGroups,
    setProcessingState,
    setError,
    removeImageFromGroup,
    setClusteringProgress,
  } = useBatchStore();

  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
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
    if (images.length < 2) {
      setError("At least 2 images are required for clustering");
      return;
    }

    // Show settings dialog first
    setShowSettingsDialog(true);
  };

  const handleSettingsConfirm = (settings: ClusterSettings) => {
    setShowSettingsDialog(false);
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

          console.log(
            `[Clustering] Processing batch ${i + 1}/${totalBatches} (${batchImages.length} images)`
          );

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
        console.log(`[Clustering] Created group ${groupId} with ${cluster.imageIds.length} images`);
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

      console.log(`[Clustering] Created ${newGroups.length} groups with UUIDs`);
      appendGroups(newGroups);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Clustering failed";
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
          <button
            onClick={handleClusterButtonClick}
            disabled={images.length < 2 || isClustering}
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
            {isClustering ? "Clustering..." : "Cluster Images"}
          </button>
          <span className="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            Free (No credits)
          </span>
        </div>
      </div>

      {/* Grid or Empty State */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden",
                "border border-slate-200 border-t-2 border-t-white/20 bg-white",
                "shadow-sm hover:shadow-lg",
                "hover:scale-105 transition-all duration-200"
              )}
            >
              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDeleteImage(image.id)}
                className={cn(
                  "absolute top-1 right-1 z-10 p-1 rounded-full",
                  "bg-red-500/80 text-white",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-red-600 hover:scale-110"
                )}
                title={`Remove ${image.originalFilename}`}
                aria-label={`Remove ${image.originalFilename}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <img
                src={image.thumbnailDataUrl}
                alt={image.originalFilename}
                className="w-full h-full object-cover"
              />
              {/* Filename overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1">
                <p className="text-white text-xs truncate">{image.originalFilename}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <ImageIcon className="h-8 w-8 text-slate-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No images uploaded yet</h3>
          <p className="text-sm text-slate-500">Drop images in the dropzone above to get started</p>
        </div>
      )}

      {/* Cluster Settings Dialog */}
      <ClusterDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        onConfirm={handleSettingsConfirm}
        imageCount={images.length}
      />

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
