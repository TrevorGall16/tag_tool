"use client";

import { cn } from "@/lib/utils";
import { StrategySelector } from "@/components/dashboard";
import { ExportToolbar } from "@/components/export";
import { useBatchStore } from "@/store/useBatchStore";

export interface BatchToolbarProps {
  className?: string;
}

export function BatchToolbar({ className }: BatchToolbarProps) {
  const { groups } = useBatchStore();

  // Only show toolbar if there are groups with images
  const hasContent = groups.some((g) => g.id !== "unclustered" && g.images.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm",
        className
      )}
    >
      {/* Left: Strategy Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500">Strategy:</span>
        <StrategySelector />
      </div>

      {/* Right: Export Tools */}
      <ExportToolbar />
    </div>
  );
}
