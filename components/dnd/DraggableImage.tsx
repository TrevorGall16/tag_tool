"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalImageItem } from "@/store/useBatchStore";

export interface DraggableImageProps {
  image: LocalImageItem;
  groupId: string;
  onImageClick?: (image: LocalImageItem) => void;
  onDeleteImage?: (imageId: string) => void;
}

export function DraggableImage({
  image,
  groupId,
  onImageClick,
  onDeleteImage,
}: DraggableImageProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: image.id,
    data: { groupId, image },
  });

  const handleImageClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling if we're dragging
    if (isDragging) return;
    onImageClick?.(image);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteImage) {
      onDeleteImage(image.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden",
        "border border-slate-200 border-t-2 border-t-white/20",
        "shadow-sm bg-white",
        "transition-all duration-200 group",
        "hover:border-blue-300 hover:shadow-md hover:scale-105",
        isDragging && "opacity-40 scale-95 ring-2 ring-blue-400 shadow-lg"
      )}
    >
      {/* Drag Handle - Only this triggers dragging */}
      <div
        {...listeners}
        {...attributes}
        className={cn(
          "absolute top-1 left-1 z-10 p-1 rounded",
          "bg-black/50 text-white",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing",
          "hover:bg-black/70"
        )}
        title="Drag to move to another group"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Delete Button */}
      {onDeleteImage && (
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "absolute top-1 right-1 z-10 p-1 rounded",
            "bg-red-500/80 text-white",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-red-600"
          )}
          title="Delete image"
          aria-label={`Delete ${image.originalFilename}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Clickable Image Area */}
      <button
        type="button"
        onClick={handleImageClick}
        className="w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-label={`View ${image.originalFilename}`}
      >
        <img
          src={image.thumbnailDataUrl}
          alt={image.originalFilename}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      </button>

      {/* Status indicator */}
      {image.status === "analyzed" && (
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
      )}
      {image.status === "error" && (
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </div>
  );
}

export interface ImageDragPreviewProps {
  image: LocalImageItem;
}

export function ImageDragPreview({ image }: ImageDragPreviewProps) {
  return (
    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-blue-500 shadow-xl bg-white">
      <img
        src={image.thumbnailDataUrl}
        alt={image.originalFilename}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
