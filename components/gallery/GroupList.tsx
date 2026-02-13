"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  ChevronDown,
  ChevronRight,
  FolderInput,
  Folder,
  XCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn, copyToClipboard } from "@/lib/utils";
import { useBatchStore, LocalGroup, LocalImageItem, GroupSortOption } from "@/store/useBatchStore";
import { TagEditor } from "@/components/editor";
import { DraggableImage, DroppableGroup } from "@/components/dnd";
import { ImageLightbox } from "./ImageLightbox";
import { deleteImageData, deleteGroupData } from "@/lib/persistence";
import { markExplicitClear } from "@/hooks/usePersistence";
import {
  Select,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";
import type { VisionTagsResponse } from "@/types";

const SORT_OPTIONS = [
  { value: "date", label: "Sort by Date" },
  { value: "name", label: "Sort by Name" },
  { value: "imageCount", label: "Sort by Image Count" },
];

interface FolderOption {
  id: string;
  name: string;
}

export interface GroupListProps {
  className?: string;
  onLightboxSave?: () => void;
  folders?: FolderOption[];
  onMoveToFolder?: (groupId: string, folderId: string | null) => void;
  filterFolderId?: string | null; // undefined = show all, null = uncategorized only, string = specific folder
}

interface LightboxState {
  image: LocalImageItem | null;
  groupId: string;
  imageIndex: number;
}

export function GroupList({
  className,
  onLightboxSave,
  folders = [],
  onMoveToFolder,
  filterFolderId,
}: GroupListProps) {
  const {
    groups,
    selectedGroupIds,
    toggleGroupSelection,
    removeImageFromGroup,
    removeGroup,
    groupSortOption,
    setGroupSortOption,
    getSortedGroups,
    clearAllGroups,
    addGroup,
  } = useBatchStore();
  const [selectedGroup, setSelectedGroup] = useState<LocalGroup | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [lightboxState, setLightboxState] = useState<LightboxState>({
    image: null,
    groupId: "",
    imageIndex: -1,
  });

  // Get sorted groups and filter based on filterFolderId
  let clusteredGroups = getSortedGroups();

  if (filterFolderId !== undefined) {
    if (filterFolderId === null) {
      // Show only uncategorized (no folderId)
      clusteredGroups = clusteredGroups.filter((g) => !g.folderId);
    } else {
      // Show only groups in specific folder
      clusteredGroups = clusteredGroups.filter((g) => g.folderId === filterFolderId);
    }
  }

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
      markExplicitClear();
      removeImageFromGroup(groupId, imageId);
      try {
        await deleteImageData(imageId);
      } catch (err) {
        console.error("[GroupList] Failed to delete image from IndexedDB:", err);
      }
      onLightboxSave?.();
    },
    [removeImageFromGroup, onLightboxSave]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      markExplicitClear();
      removeGroup(groupId);
      try {
        await deleteGroupData(groupId);
      } catch (err) {
        console.error("[GroupList] Failed to delete group from IndexedDB:", err);
      }
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

  if (clusteredGroups.length === 0) {
    return (
      <div className={cn("mt-8", className)}>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50/50">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ImagePlus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No image groups here</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            Upload images using the dropzone above. Images will be automatically clustered into
            groups for batch tagging.
          </p>
          <button
            onClick={() => {
              const maxGroupNumber = groups.reduce(
                (max, g) => (g.groupNumber > max ? g.groupNumber : max),
                0
              );
              addGroup({
                id: crypto.randomUUID(),
                groupNumber: maxGroupNumber + 1,
                images: [],
                sharedTags: [],
                isVerified: false,
                createdAt: Date.now(),
              });
              toast.success("Empty group created — drag images into it");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium",
              "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
              "border border-blue-200 rounded-lg transition-colors"
            )}
          >
            <Plus className="h-4 w-4" />
            New Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Image Groups ({clusteredGroups.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const maxGroupNumber = groups.reduce(
                (max, g) => (g.groupNumber > max ? g.groupNumber : max),
                0
              );
              addGroup({
                id: crypto.randomUUID(),
                groupNumber: maxGroupNumber + 1,
                images: [],
                sharedTags: [],
                isVerified: false,
                createdAt: Date.now(),
              });
              toast.success("Empty group created — drag images into it");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm",
              "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
              "border border-blue-200 rounded-lg transition-colors"
            )}
            title="Create an empty group"
          >
            <Plus className="h-4 w-4" />
            New Group
          </button>
          <Select
            options={SORT_OPTIONS}
            value={groupSortOption}
            onChange={(value) => setGroupSortOption(value as GroupSortOption)}
            className="min-w-[160px]"
          />
          {clusteredGroups.length > 0 && (
            <button
              onClick={() => setShowClearAllDialog(true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm",
                "text-red-600 hover:text-red-700 hover:bg-red-50",
                "border border-red-200 rounded-lg transition-colors"
              )}
              title="Clear all groups"
            >
              <XCircle className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {clusteredGroups.map((group) => (
        <DroppableGroup key={group.id} groupId={group.id}>
          <CollapsibleGroupCard
            group={group}
            onEdit={() => setSelectedGroup(group)}
            onImageClick={handleImageClick}
            onDeleteImage={(imageId) => handleDeleteImage(group.id, imageId)}
            onDeleteGroup={() => handleDeleteGroup(group.id)}
            isSelected={selectedGroupIds.has(group.id)}
            onToggleSelect={() => toggleGroupSelection(group.id)}
            folders={folders}
            onMoveToFolder={onMoveToFolder}
          />
        </DroppableGroup>
      ))}

      {selectedGroup && (
        <TagEditor
          group={selectedGroup}
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

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

      {/* Clear All Groups Confirmation */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all groups?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {clusteredGroups.length} groups. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                clearAllGroups();
                toast.success("All groups cleared");
              }}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CollapsibleGroupCardProps {
  group: LocalGroup;
  onEdit: () => void;
  onImageClick: (image: LocalImageItem, groupId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onDeleteGroup: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  folders: FolderOption[];
  onMoveToFolder?: (groupId: string, folderId: string | null) => void;
}

function CollapsibleGroupCard({
  group,
  onEdit,
  onImageClick,
  onDeleteImage,
  onDeleteGroup,
  isSelected,
  onToggleSelect,
  folders,
  onMoveToFolder,
}: CollapsibleGroupCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingGenerateEvent, setPendingGenerateEvent] = useState<React.MouseEvent | null>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  const { marketplace, strategy, maxTags, updateGroupTags, toggleGroupCollapse } = useBatchStore();

  const isCollapsed = group.isCollapsed ?? false;
  // Check for any tags: AI-generated, shared (manual), or user-edited
  const isTagged =
    group.sharedTags.length > 0 ||
    (group.images[0]?.aiTags && group.images[0].aiTags.length > 0) ||
    (group.images[0]?.userTags && group.images[0].userTags.length > 0);

  // Close folder menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
        setShowFolderMenu(false);
      }
    };
    if (showFolderMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFolderMenu]);

  const handleGenerateTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (group.images.length === 0) return;

    if (isTagged) {
      setShowRegenDialog(true);
      return;
    }

    doGenerateTags();
  };

  const doGenerateTags = async () => {
    setIsLoading(true);
    setError(null);
    setShowSuccess(false);

    try {
      const representativeImage = group.images[0];
      if (!representativeImage) return;

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
        updateGroupTags(group.id, tagResult.title, tagResult.tags, tagResult.confidence);
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

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGroupCollapse(group.id);
  };

  const handleMoveToFolder = (folderId: string | null) => {
    onMoveToFolder?.(group.id, folderId);
    setShowFolderMenu(false);
  };

  const currentFolder = folders.find((f) => f.id === group.folderId);

  return (
    <div
      className={cn(
        "border border-slate-200 bg-white rounded-xl shadow-sm",
        "transition-all duration-200",
        !isCollapsed && "hover:shadow-md"
      )}
    >
      {/* Header - Always visible */}
      <div
        onClick={handleToggleCollapse}
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer",
          "hover:bg-slate-50 transition-colors",
          isCollapsed ? "border-b-0" : "border-b border-slate-100"
        )}
      >
        {/* Collapse Toggle */}
        <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

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
        >
          {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>

        {/* Title & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-900 truncate">
              {group.sharedTitle || `Group ${group.groupNumber}`}
            </h3>
            {/* Semantic Tags Badges - fallback to sharedTitle if tags empty */}
            {(() => {
              // Approved categories get special styling
              const APPROVED = [
                "gastronomy",
                "architecture",
                "interiors",
                "fashion",
                "nature",
                "people",
                "technology",
                "transportation",
                "art & design",
                "objects",
              ];

              const badges =
                group.semanticTags && group.semanticTags.length > 0
                  ? group.semanticTags
                  : group.sharedTitle
                    ? [group.sharedTitle]
                    : null;

              if (badges && badges.length > 0) {
                return (
                  <div className="ml-2 flex items-center gap-1">
                    {badges.slice(0, 3).map((tag, idx) => {
                      const isApproved = APPROVED.includes(tag.toLowerCase());
                      return (
                        <span
                          key={idx}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-xs font-semibold border shadow-sm",
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          )}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                );
              }

              return (
                <span className="ml-2 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                  Unlabeled
                </span>
              );
            })()}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{group.images.length} images</span>
            {isTagged && (
              <>
                <span>•</span>
                <span className="text-green-600">Tagged</span>
              </>
            )}
            {currentFolder && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tag Summary (collapsed only) — strictly one row */}
        {isCollapsed && isTagged && group.sharedTags.length > 0 && (
          <div className="hidden md:flex items-center gap-1 shrink min-w-0">
            {group.sharedTags.slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full whitespace-nowrap truncate max-w-[80px]"
              >
                {tag}
              </span>
            ))}
            {group.sharedTags.length > 4 && (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                +{group.sharedTags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Folder Picker */}
          {folders.length > 0 && (
            <div className="relative" ref={folderMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFolderMenu(!showFolderMenu);
                }}
                className={cn(
                  "p-2 rounded-lg text-slate-400",
                  "hover:bg-slate-100 hover:text-slate-600 transition-colors"
                )}
                title="Move to folder"
              >
                <FolderInput className="h-4 w-4" />
              </button>

              {showFolderMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                  <button
                    onClick={() => handleMoveToFolder(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 transition-colors",
                      !group.folderId && "bg-blue-50 text-blue-700"
                    )}
                  >
                    Uncategorized
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveToFolder(folder.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2",
                        group.folderId === folder.id && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <Folder className="h-4 w-4" />
                      {folder.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showSuccess && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 px-2">
              <Check className="h-4 w-4" />
            </span>
          )}

          {/* Generate Tags */}
          <button
            onClick={handleGenerateTags}
            disabled={isLoading || group.images.length === 0}
            className={cn(
              "inline-flex items-center gap-1.5",
              "bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium",
              "hover:bg-blue-700 transition-colors",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isLoading ? "..." : isTagged ? "Redo" : "Tag"}
          </button>

          {/* Edit Tags */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
              "border border-slate-300 text-slate-700",
              "hover:bg-slate-100 hover:border-slate-400 transition-colors"
            )}
            title="Edit tags"
          >
            <Edit2 className="h-4 w-4" />
            Edit Tags
          </button>

          {/* Spacer */}
          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content — always show for empty groups so drop target is visible */}
      {(!isCollapsed || group.images.length === 0) && (
        <div className="p-4">
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
                {group.sharedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
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
                title="Copy tags"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Empty group drop target */}
          {group.images.length === 0 ? (
            <div className="min-h-[120px] flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
              <div className="text-center">
                <ImagePlus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Drag images here</p>
              </div>
            </div>
          ) : (
            /* Image Grid */
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
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
          )}
        </div>
      )}

      {/* Regenerate Tags Confirmation */}
      <AlertDialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate tags for {group.images.length} images?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use {group.images.length} credit{group.images.length !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                doGenerateTags();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{group.sharedTitle || `Group ${group.groupNumber}`}" and all{" "}
              {group.images.length} images? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDeleteGroup}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
