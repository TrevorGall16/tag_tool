"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";

export interface ClusterToolProps {
  className?: string;
}

/**
 * Inline context input for AI clustering.
 * Provides a free-text field so users can describe what their images are about
 * (e.g., "Music festival photos", "Beach wedding shoot").
 * The context is stored in namingSettings and passed to the vision API.
 */
export function ClusterTool({ className }: ClusterToolProps) {
  const { namingSettings, setNamingSettings, groups } = useBatchStore();
  const [isFocused, setIsFocused] = useState(false);

  const unclusteredGroup = groups.find((g) => g.id === "unclustered");
  const imageCount = unclusteredGroup?.images.length ?? 0;

  const context = namingSettings.context ?? "";

  const handleContextChange = (value: string) => {
    setNamingSettings({
      ...namingSettings,
      context: value || undefined,
    });
  };

  // Only show when there are images to cluster
  if (imageCount < 2) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
          isFocused
            ? "border-purple-300 bg-purple-50/50"
            : context
              ? "border-purple-200 bg-purple-50/30"
              : "border-slate-200 bg-slate-50/50"
        )}
      >
        <Sparkles
          className={cn("h-4 w-4 shrink-0", context ? "text-purple-500" : "text-slate-400")}
        />
        <input
          type="text"
          value={context}
          onChange={(e) => handleContextChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Describe your images for better clustering (e.g., 'Music festival photos')"
          maxLength={200}
          className={cn(
            "flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400",
            "focus:outline-none"
          )}
        />
        {context && (
          <button
            onClick={() => handleContextChange("")}
            className="text-xs text-purple-500 hover:text-purple-700 shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400 px-1">
        Hint: Type a specific event (e.g., &ldquo;Summer Festival&rdquo;) or leave blank to
        auto-sort by category.
      </p>
    </div>
  );
}
