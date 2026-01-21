"use client";

import { cn } from "@/lib/utils";

export interface GroupSkeletonProps {
  className?: string;
  count?: number;
}

function SkeletonCard() {
  return (
    <div
      className={cn("border border-slate-200 bg-white rounded-xl shadow-sm p-4", "animate-pulse")}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-5 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-slate-100 rounded-lg" />
          <div className="h-8 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Image grid skeleton */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-slate-100 border border-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function GroupSkeleton({ className, count = 3 }: GroupSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
        <h2 className="text-xl font-semibold text-slate-900">Clustering images...</h2>
      </div>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
