"use client";

import { FolderPlus, Upload, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  onUploadClick?: () => void;
  className?: string;
}

export function EmptyState({ onUploadClick, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8",
        "border-2 border-dashed border-slate-200 rounded-xl",
        "bg-gradient-to-b from-slate-50/50 to-white",
        className
      )}
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center">
          <FolderPlus className="w-10 h-10 text-blue-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border-2 border-white">
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>

      {/* Description */}
      <p className="text-slate-500 text-center max-w-sm mb-6">
        Upload images to start organizing them with AI-powered clustering and tagging.
      </p>

      {/* Features List */}
      <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Auto-clustering
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Smart tagging
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Batch export
        </div>
      </div>

      {/* Upload Button */}
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "rounded-lg font-medium transition-colors",
            "shadow-sm hover:shadow-md"
          )}
        >
          <Upload className="w-5 h-5" />
          Upload Images
        </button>
      )}
    </div>
  );
}
