"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchStore, LocalGroup } from "@/store/useBatchStore";

export interface TagEditorProps {
  group: LocalGroup;
  isOpen: boolean;
  onClose: () => void;
}

export function TagEditor({ group, isOpen, onClose }: TagEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { updateGroupMetadata } = useBatchStore();

  // Local state for editing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState(false);

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

  const handleSave = () => {
    updateGroupMetadata(group.id, title, description, tags);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className={cn(
        "w-full max-w-2xl p-0 rounded-xl bg-white shadow-2xl",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      )}
    >
      <div className="p-6">
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
            placeholder="Enter a title for this group"
            className={cn(
              "w-full px-3 py-2 rounded-lg border border-slate-300",
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
            <label className="block text-sm font-medium text-slate-700">Tags ({tags.length})</label>
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

          {/* Tag Chips */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg min-h-[80px] mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1",
                  "bg-blue-100 text-blue-800 rounded-full text-sm"
                )}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="text-slate-400 text-sm">No tags yet. Add some below.</span>
            )}
          </div>

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
