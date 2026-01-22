"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export interface DroppableGroupProps {
  groupId: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableGroup({ groupId, children, className }: DroppableGroupProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: groupId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-150",
        isOver && "ring-2 ring-blue-400 ring-offset-2 rounded-xl",
        className
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-blue-100/40 rounded-xl pointer-events-none z-10 flex items-center justify-center">
          <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
            Drop here
          </span>
        </div>
      )}
    </div>
  );
}
