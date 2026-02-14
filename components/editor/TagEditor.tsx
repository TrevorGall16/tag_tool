"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Copy, Plus, Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchStore, LocalGroup } from "@/store/useBatchStore";
import { useClickOutside } from "@/hooks";

export interface TagEditorProps {
  group: LocalGroup;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Sortable Tag Chip ───────────────────────────────────────

interface SortableTagProps {
  id: string;
  tag: string;
  index: number;
  onRemove: (tag: string) => void;
  onCopy: (tag: string, index: number) => void;
  copiedTagIndex: number | null;
}

function SortableTag({ id, tag, index, onRemove, onCopy, copiedTagIndex }: SortableTagProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative inline-flex items-center gap-0.5 pl-1 pr-1 py-1",
        "bg-blue-100 text-blue-800 rounded-full text-sm",
        "transition-shadow",
        isDragging && "shadow-lg ring-2 ring-blue-400 opacity-90 z-50"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 cursor-grab active:cursor-grabbing text-blue-400 hover:text-blue-600 touch-none"
        tabIndex={-1}
        aria-label={`Reorder tag: ${tag}`}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Tag Text (click to copy) */}
      <span
        onClick={() => onCopy(tag, index)}
        className="cursor-pointer hover:text-blue-900 select-none px-1"
        title="Click to copy"
      >
        {tag}
      </span>

      {/* Copied tooltip */}
      {copiedTagIndex === index && (
        <span
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2",
            "px-2 py-1 bg-slate-800 text-white text-xs rounded",
            "whitespace-nowrap animate-fade-in"
          )}
        >
          Copied!
        </span>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(tag)}
        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Main TagEditor ──────────────────────────────────────────

export function TagEditor({ group, isOpen, onClose }: TagEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { updateGroupMetadata } = useBatchStore();

  // Local state for editing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedTagIndex, setCopiedTagIndex] = useState<number | null>(null);

  // DnD sensors — pointer with 5px activation distance, keyboard with arrow keys
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Generate stable IDs for sortable items (tag text may not be unique after edits)
  const tagIds = tags.map((tag, i) => `tag-${i}-${tag}`);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useClickOutside(contentRef, handleClose, {
    ignoreTextSelection: true,
    enabled: isOpen,
  });

  // Sync state when group changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(group.sharedTitle || group.images[0]?.aiTitle || "");
      setDescription(group.sharedDescription || "");
      setTags(group.sharedTags || []);
      setNewTag("");
      setCopied(false);
    }
  }, [isOpen, group]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCopyTags = async () => {
    const tagsText = tags.join(", ");
    await navigator.clipboard.writeText(tagsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySingleTag = async (tag: string, index: number) => {
    await navigator.clipboard.writeText(tag);
    setCopiedTagIndex(index);
    setTimeout(() => setCopiedTagIndex(null), 1500);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tagIds.indexOf(active.id as string);
    const newIndex = tagIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      setTags(arrayMove(tags, oldIndex, newIndex));
    }
  };

  const handleSave = () => {
    updateGroupMetadata(group.id, title, description, tags);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "w-full max-w-2xl p-0 rounded-xl bg-white shadow-2xl",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      )}
    >
      <div ref={contentRef} className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Edit Group {group.groupNumber}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Title Input */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Enter a title for this group"
            className={cn(
              "w-full px-3 py-2 rounded-lg border border-slate-300 truncate",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder:text-slate-400"
            )}
          />
        </div>

        {/* Description Textarea */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description"
            rows={3}
            className={cn(
              "w-full px-3 py-2 rounded-lg border border-slate-300",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder:text-slate-400 resize-none"
            )}
          />
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Tags ({tags.length})
              <span className="ml-2 text-xs font-normal text-slate-400">Drag to reorder</span>
            </label>
            <button
              onClick={handleCopyTags}
              disabled={tags.length === 0}
              className={cn(
                "inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700",
                "disabled:text-slate-400 disabled:cursor-not-allowed"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy All
                </>
              )}
            </button>
          </div>

          {/* Sortable Tag Chips */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tagIds} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg min-h-[80px] mb-2">
                {tags.map((tag, index) => (
                  <SortableTag
                    key={tagIds[index]}
                    id={tagIds[index]!}
                    tag={tag}
                    index={index}
                    onRemove={handleRemoveTag}
                    onCopy={handleCopySingleTag}
                    copiedTagIndex={copiedTagIndex}
                  />
                ))}
                {tags.length === 0 && (
                  <span className="text-slate-400 text-sm">No tags yet. Add some below.</span>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Tag Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a tag..."
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border border-slate-300",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-slate-400"
              )}
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className={cn(
                "inline-flex items-center gap-1 px-4 py-2 rounded-lg",
                "bg-slate-100 text-slate-700 hover:bg-slate-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-slate-100 text-slate-700 hover:bg-slate-200",
              "transition-colors"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-blue-600 text-white hover:bg-blue-700",
              "transition-colors"
            )}
          >
            Save Changes
          </button>
        </div>
      </div>
    </dialog>
  );
}
