"use client";

import { Loader2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";

export interface ClusteringProgressProps {
  className?: string;
}

export function ClusteringProgress({ className }: ClusteringProgressProps) {
  const { isClustering, clusteringProgress } = useBatchStore();

  if (!isClustering) {
    return null;
  }

  const hasBatchProgress = clusteringProgress && clusteringProgress.totalBatches > 1;
  const progressPercent = hasBatchProgress
    ? Math.round((clusteringProgress.currentBatch / clusteringProgress.totalBatches) * 100)
    : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-blue-200 bg-blue-50/50 p-6",
        "animate-in fade-in duration-300",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="relative">
            <Layers className="h-8 w-8 text-blue-500" />
            <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 text-blue-600 animate-spin" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-blue-900">Clustering Images...</h3>

          {hasBatchProgress ? (
            <>
              <p className="text-sm text-blue-700 mt-1">
                Processing Batch {clusteringProgress.currentBatch} of{" "}
                {clusteringProgress.totalBatches}
                <span className="text-blue-500 ml-2">
                  ({clusteringProgress.totalImages} total images)
                </span>
              </p>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-blue-500 mt-1 text-right">{progressPercent}% complete</p>
            </>
          ) : (
            <p className="text-sm text-blue-700 mt-1">Analyzing images and creating groups...</p>
          )}
        </div>
      </div>
    </div>
  );
}
