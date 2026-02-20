"use client";

import { useState } from "react";
import { Layers, ImageIcon, Loader2, X, Users, Hand, Trash2 } from "lucide-react";
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

// ─── Client-side orchestration constants ───────────────────────────────────────
const CHUNK_SIZE = 20; // images per API call — matches MAX_IMAGES_PER_REQUEST in the route
const MAX_RETRIES = 3;

/**
 * Send one chunk to /api/vision/cluster with automatic retry on transient errors
 * (overloaded AI, 503s, timeouts). Uses exponential backoff: 1 s → 2 s → 4 s.
 */
async function fetchClusterChunk(
  chunk: Array<{ id: string; thumbnailDataUrl: string; originalFilename: string }>,
  totalImages: number,
  marketplace: string,
  settings: ClusterSettings | undefined
): Promise<VisionClusterResponse["groups"]> {
  const body = {
    images: chunk.map((img) => ({
      id: img.id,
      dataUrl: img.thumbnailDataUrl,
      name: img.originalFilename || "Untitled",
    })),
    marketplace,
    maxGroups: Math.max(2, Math.ceil(10 * (chunk.length / totalImages))),
    settings,
  };

  let lastError: Error = new Error("Clustering failed");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
    try {
      const response = await fetch("/api/vision/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        success: boolean;
        data?: VisionClusterResponse;
        error?: string;
      };
      if (!result.success || !result.data) {
        const isTransient = /timeout|overloaded|rate.?limit|503|529|too many/i.test(
          result.error ?? ""
        );
        if (isTransient && attempt < MAX_RETRIES - 1) {
          lastError = new Error(result.error ?? "Clustering failed");
          continue;
        }
        throw new Error(result.error ?? "Clustering failed");
      }
      return result.data.groups;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTransient = /timeout|overloaded|rate.?limit|503|529|too many|fetch failed/i.test(
        lastError.message
      );
      if (!isTransient || attempt >= MAX_RETRIES - 1) throw lastError;
    }
  }
  throw lastError;
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
    updateGroup,
    setClusteringProgress,
  } = useBatchStore();

  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showGroupAllConfirm, setShowGroupAllConfirm] = useState(false);
  const [clusterMode, setClusterMode] = useState<"append" | "clear" | null>(null);
  const [pendingSettings, setPendingSettings] = useState<ClusterSettings | undefined>(undefined);

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

  const handleClearUploads = async () => {
    if (images.length === 0) return;
    markExplicitClear();
    // Purge every uploaded image from IndexedDB before clearing the store.
    await Promise.allSettled(images.map((img) => deleteImageData(img.id)));
    updateGroup("unclustered", { images: [] });
    toast.success("All uploaded images cleared.");
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

    if (mode === "clear") {
      markExplicitClear();
      clearAllGroups();
    }

    setError(null);
    setProcessingState({ isClustering: true });

    // Always show progress — even a single chunk benefits from the indicator.
    const totalChunks = Math.ceil(images.length / CHUNK_SIZE);
    setClusteringProgress({
      currentBatch: 0,
      totalBatches: totalChunks,
      totalImages: images.length,
    });

    try {
      const allGroups: VisionClusterResponse["groups"] = [];

      // Sequential chunk loop with per-chunk retry. Each chunk is a single API call,
      // so the server stays stateless and well under the 60 s timeout.
      for (let i = 0; i < totalChunks; i++) {
        const chunk = images.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

        setClusteringProgress({
          currentBatch: i + 1,
          totalBatches: totalChunks,
          totalImages: images.length,
        });

        const chunkGroups = await fetchClusterChunk(chunk, images.length, marketplace, settings);
        allGroups.push(...chunkGroups);
      }

      // Transform API response into LocalGroup[] — always use UUID for group IDs.
      const baseTimestamp = Date.now();
      const newGroups: LocalGroup[] = allGroups.map((cluster, index) => ({
        id: crypto.randomUUID(),
        groupNumber: index + 1,
        images: cluster.imageIds
          .map((id) => images.find((img) => img.id === id))
          .filter((img): img is NonNullable<typeof img> => img !== undefined),
        sharedTags: [],
        sharedTitle: cluster.title || cluster.suggestedLabel,
        semanticTags: cluster.semanticTags,
        isVerified: false,
        createdAt: baseTimestamp + index,
      }));

      appendGroups(newGroups);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Clustering failed";
      const isOverloaded =
        /timeout|overloaded|rate.?limit|503|529|too many/i.test(raw) ||
        raw.includes("fetch failed");
      setError(
        isOverloaded ? "The AI is currently overloaded. Please wait a moment and try again." : raw
      );
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
            onClick={handleClearUploads}
            disabled={images.length === 0 || isClustering}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
              "text-red-600 hover:text-red-700 hover:bg-red-50",
              "border border-red-200 hover:border-red-300",
              "transition-all duration-200",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
            title="Remove all uploaded images"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
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
            <AlertDialogTitle className="inline-flex items-center gap-2">
              How would you like to organize?
              <span className="text-[10px] text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Free
              </span>
            </AlertDialogTitle>
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
                  Have the AI attempt to group similar images together
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
