"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  Edit2,
  Square,
  CheckSquare,
  Trash2,
  ImagePlus,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn, copyToClipboard } from "@/lib/utils";
import { useBatchStore, LocalGroup, LocalImageItem } from "@/store/useBatchStore";
import { TagEditor } from "@/components/editor";
import { BatchDndContext, DraggableImage, DroppableGroup } from "@/components/dnd";
import { ImageLightbox } from "./ImageLightbox";
import { deleteImageData, deleteGroupData } from "@/lib/persistence";
import { markExplicitClear } from "@/hooks/usePersistence";
import type { VisionTagsResponse } from "@/types";

export interface GroupListProps {
  className?: string;
  /** Optional callback to trigger immediate persistence after Lightbox save */
  onLightboxSave?: () => void;
}

interface LightboxState {
  image: LocalImageItem | null;
  groupId: string;
  imageIndex: number;
}

export function GroupList({ className, onLightboxSave }: GroupListProps) {
  const { groups, selectedGroupIds, toggleGroupSelection, removeImageFromGroup, removeGroup } =
    useBatchStore();
  const [selectedGroup, setSelectedGroup] = useState<LocalGroup | null>(null);
  const [lightboxState, setLightboxState] = useState<LightboxState>({
    image: null,
    groupId: "",
    imageIndex: -1,
  });

  const clusteredGroups = groups.filter((g) => g.id !== "unclustered");

  const handleImageClick = useCallback(
    (image: LocalImageItem, groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      const imageIndex = group?.images.findIndex((img) => img.id === image.id) ?? -1;
      setLightboxState({ image, groupId, imageIndex });
    },
    [groups]
  );

  const handleDeleteImage = useCallback(
    async (groupId: string, imageId: string) => {
      // Mark explicit clear to allow sync with reduced image count
      markExplicitClear();
      // Remove from store
      removeImageFromGroup(groupId, imageId);
      // Delete from IndexedDB
      try {
        await deleteImageData(imageId);
      } catch (err) {
        console.error("[GroupList] Failed to delete image from IndexedDB:", err);
      }
      // Trigger sync
      onLightboxSave?.();
    },
    [removeImageFromGroup, onLightboxSave]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      // Mark explicit clear to allow sync with reduced image count
      markExplicitClear();
      // Remove from store
      removeGroup(groupId);
      // Delete from IndexedDB
      try {
        await deleteGroupData(groupId);
      } catch (err) {
        console.error("[GroupList] Failed to delete group from IndexedDB:", err);
      }
      // Trigger sync
      onLightboxSave?.();
    },
    [removeGroup, onLightboxSave]
  );

  const handleLightboxClose = useCallback(() => {
    setLightboxState({ image: null, groupId: "", imageIndex: -1 });
  }, []);

  const handleLightboxPrevious = useCallback(() => {
    const group = groups.find((g) => g.id === lightboxState.groupId);
    if (!group || lightboxState.imageIndex <= 0) return;
    const newIndex = lightboxState.imageIndex - 1;
    const newImage = group.images[newIndex];
    if (newImage) {
      setLightboxState({ image: newImage, groupId: lightboxState.groupId, imageIndex: newIndex });
    }
  }, [groups, lightboxState]);

  const handleLightboxNext = useCallback(() => {
    const group = groups.find((g) => g.id === lightboxState.groupId);
    if (!group || lightboxState.imageIndex >= group.images.length - 1) return;
    const newIndex = lightboxState.imageIndex + 1;
    const newImage = group.images[newIndex];
    if (newImage) {
      setLightboxState({ image: newImage, groupId: lightboxState.groupId, imageIndex: newIndex });
    }
  }, [groups, lightboxState]);

  const currentGroup = groups.find((g) => g.id === lightboxState.groupId);
  const hasPrevious = lightboxState.imageIndex > 0;
  const hasNext = currentGroup ? lightboxState.imageIndex < currentGroup.images.length - 1 : false;

  // Empty state when no clustered groups exist
  if (clusteredGroups.length === 0) {
    return (
      <div className={cn("mt-8", className)}>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50/50">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ImagePlus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No images yet</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            Upload images using the dropzone above to get started. Images will be automatically
            clustered into groups for batch tagging.
          </p>
          <button
            onClick={() => {
              // Scroll to dropzone
              const dropzone = document.querySelector("[data-dropzone]");
              dropzone?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            Upload Images
          </button>
        </div>
      </div>
    );
  }

  return (
    <BatchDndContext>
      <div className={cn("space-y-6", className)}>
        <h2 className="text-xl font-semibold text-slate-900">
          Clustered Groups ({clusteredGroups.length})
        </h2>
        <p className="text-sm text-slate-500 -mt-4">
          Drag images between groups to reorganize. Click an image to view and edit.
        </p>
        {clusteredGroups.map((group) => (
          <DroppableGroup key={group.id} groupId={group.id}>
            <GroupCard
              group={group}
              onEdit={() => setSelectedGroup(group)}
              onImageClick={handleImageClick}
              onDeleteImage={(imageId) => handleDeleteImage(group.id, imageId)}
              onDeleteGroup={() => handleDeleteGroup(group.id)}
              isSelected={selectedGroupIds.has(group.id)}
              onToggleSelect={() => toggleGroupSelection(group.id)}
            />
          </DroppableGroup>
        ))}

        {/* Tag Editor Modal */}
        {selectedGroup && (
          <TagEditor
            group={selectedGroup}
            isOpen={!!selectedGroup}
            onClose={() => setSelectedGroup(null)}
          />
        )}

        {/* Image Lightbox */}
        <ImageLightbox
          image={lightboxState.image}
          groupId={lightboxState.groupId}
          isOpen={!!lightboxState.image}
          onClose={handleLightboxClose}
          onPrevious={handleLightboxPrevious}
          onNext={handleLightboxNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onSaveComplete={onLightboxSave}
        />
      </div>
    </BatchDndContext>
  );
}

interface GroupCardProps {
  group: LocalGroup;
  onEdit: () => void;
  onImageClick: (image: LocalImageItem, groupId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onDeleteGroup: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function GroupCard({
  group,
  onEdit,
  onImageClick,
  onDeleteImage,
  onDeleteGroup,
  isSelected,
  onToggleSelect,
}: GroupCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { marketplace, strategy, maxTags, updateGroupTags } = useBatchStore();

  const isTagged = group.images[0]?.aiTags && group.images[0].aiTags.length > 0;

  const handleGenerateTags = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (group.images.length === 0) return;

    // Confirm regeneration to prevent accidental credit usage
    if (isTagged) {
      const confirmed = window.confirm("Regenerate tags? This will use 1 credit.");
      if (!confirmed) return;
    }

    console.log(
      `[GroupCard] Generate tags clicked for group: ${group.id} (${group.sharedTitle || `Group ${group.groupNumber}`})`
    );

    setIsLoading(true);
    setError(null);
    setShowSuccess(false);

    try {
      // Send only the first image as representative
      const representativeImage = group.images[0];
      if (!representativeImage) return;

      console.log(`[GroupCard] Using representative image: ${representativeImage.id}`);

      const response = await fetch("/api/vision/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [
            {
              id: representativeImage.id,
              dataUrl: representativeImage.thumbnailDataUrl,
            },
          ],
          marketplace,
          strategy,
          maxTags,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        data?: VisionTagsResponse;
        error?: string;
      };

      if (!result.success || !result.data) {
        throw new Error(result.error || "Tag generation failed");
      }

      const tagResult = result.data.results[0];
      if (tagResult) {
        console.log(`[GroupCard] Calling updateGroupTags for group: ${group.id}`);
        // Apply tags to all images in the group
        updateGroupTags(group.id, tagResult.title, tagResult.tags, tagResult.confidence);

        // Show success indicator
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tag generation failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onEdit}
      className={cn(
        "border border-slate-200 border-t-2 border-t-white/10 bg-white rounded-xl shadow-sm p-6",
        "cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Selection Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              "p-0.5 rounded transition-colors",
              isSelected ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
            title={isSelected ? "Deselect for export" : "Select for export"}
            aria-label={isSelected ? "Deselect group" : "Select group"}
          >
            {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
          </button>
          <div>
            <h3 className="font-medium text-slate-900">
              {group.sharedTitle || `Group ${group.groupNumber}`}
            </h3>
            <p className="text-sm text-slate-500">
              {group.images.length} images
              {isTagged && " • Tagged"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showSuccess && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Done
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  `Delete "${group.sharedTitle || `Group ${group.groupNumber}`}" and all ${group.images.length} images?`
                )
              ) {
                onDeleteGroup();
              }
            }}
            className={cn(
              "p-2 rounded-lg text-slate-400",
              "hover:bg-red-50 hover:text-red-600 transition-colors"
            )}
            title="Delete group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              "p-2 rounded-lg text-slate-500",
              "hover:bg-slate-100 hover:text-slate-700 transition-colors"
            )}
            title="Edit tags"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleGenerateTags}
            disabled={isLoading || group.images.length === 0}
            className={cn(
              "inline-flex items-center gap-2",
              "bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium",
              "hover:bg-blue-700 hover:scale-105 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? "Generating..." : isTagged ? "Regenerate Tags" : "Generate Tags"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tags Preview */}
      {isTagged && group.sharedTags.length > 0 && (
        <div className="mb-4 flex items-start gap-2">
          <div className="flex flex-wrap gap-1 flex-1">
            {group.sharedTags.slice(0, 8).map((tag, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {group.sharedTags.length > 8 && (
              <span className="inline-block px-2 py-0.5 text-slate-500 text-xs">
                +{group.sharedTags.length - 8} more
              </span>
            )}
          </div>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const success = await copyToClipboard(group.sharedTags.join(", "));
              if (success) {
                toast.success(`Copied ${group.sharedTags.length} tags`);
              } else {
                toast.error("Failed to copy tags");
              }
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            title="Copy tags to clipboard"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image Grid */}
      <div
        className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {group.images.map((image) => (
          <DraggableImage
            key={image.id}
            image={image}
            groupId={group.id}
            onImageClick={(img) => onImageClick(img, group.id)}
            onDeleteImage={onDeleteImage}
          />
        ))}
      </div>
    </div>
  );
}
