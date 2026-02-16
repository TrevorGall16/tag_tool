"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchStore, LocalImageItem } from "@/store/useBatchStore";

export interface ImageLightboxProps {
  image: LocalImageItem | null;
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  /** Optional callback to trigger immediate persistence after save */
  onSaveComplete?: () => void;
}

export function ImageLightbox({
  image,
  groupId,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  onSaveComplete,
}: ImageLightboxProps) {
  const { updateImageTags } = useBatchStore();

  const [editedTitle, setEditedTitle] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with image prop
  useEffect(() => {
    if (image) {
      setEditedTitle(image.userTitle || image.aiTitle || "");
      setEditedTags(image.userTags || image.aiTags || []);
      setHasChanges(false);
    }
  }, [image]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrevious) {
        onPrevious?.();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  const handleTitleChange = (value: string) => {
    setEditedTitle(value);
    setHasChanges(true);
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !editedTags.includes(tag)) {
      setEditedTags([...editedTags, tag]);
      setNewTag("");
      setHasChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter((t) => t !== tagToRemove));
    setHasChanges(true);
  };

  const handleSave = useCallback(() => {
    if (!image) return;
    updateImageTags(groupId, image.id, editedTags, editedTitle);
    setHasChanges(false);
    // Trigger immediate persistence after save
    onSaveComplete?.();
  }, [image, groupId, editedTags, editedTitle, updateImageTags, onSaveComplete]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen || !image) return null;

  return (
    <div
      className="fixed inset-0 flex h-screen w-screen"
      style={{ zIndex: 9999, top: 0, left: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onMouseDown={onClose} />

      {/* Main Content */}
      <div className="relative flex w-full h-full">
        {/* Image Area */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation buttons */}
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-[340px] top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={image.thumbnailDataUrl}
            alt={image.originalFilename}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Sidebar — Light Mode */}
        <div
          className="w-80 h-full overflow-y-auto flex flex-col"
          style={{ backgroundColor: "#ffffff" }}
        >
          {/* Header */}
          <div className="p-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
            <h3 className="font-semibold truncate" style={{ color: "#111827" }}>
              {image.originalFilename}
            </h3>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Status:{" "}
              <span
                className={cn(
                  image.status === "analyzed" && "text-green-600",
                  image.status === "error" && "text-red-600",
                  image.status === "pending" && "text-amber-600"
                )}
              >
                {image.status}
              </span>
            </p>
          </div>

          {/* Title Input */}
          <div className="p-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
            <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
              Title
            </label>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter a title..."
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                border: "1px solid #e5e7eb",
              }}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tags Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <label className="block text-sm font-medium mb-2" style={{ color: "#374151" }}>
              Tags ({editedTags.length})
            </label>

            {/* Add tag input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  border: "1px solid #e5e7eb",
                }}
                className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* Tags list */}
            <div className="flex flex-wrap gap-1.5">
              {editedTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full group"
                  style={{ backgroundColor: "#f3f4f6", color: "#374151" }}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="w-4 h-4 rounded-full hover:bg-gray-300 inline-flex items-center justify-center"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {editedTags.length === 0 && (
                <p className="text-sm italic" style={{ color: "#9ca3af" }}>
                  No tags yet
                </p>
              )}
            </div>
          </div>

          {/* Footer with Save button */}
          <div
            className="p-4"
            style={{ borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}
          >
            {image.errorMessage && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{image.errorMessage}</p>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "px-4 py-2 rounded-lg text-sm font-medium",
                "transition-colors",
                hasChanges
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              <Check className="w-4 h-4" />
              {hasChanges ? "Save Changes" : "No Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
