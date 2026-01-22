"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useDragContext } from "./DragContext";

export interface DroppableGroupProps {
  groupId: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableGroup({ groupId, children, className }: DroppableGroupProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: groupId,
  });
  const { isDragging } = useDragContext();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-150",
        // Only show ring when dragging AND hovering over this group
        isOver && "ring-2 ring-blue-400 ring-offset-2 rounded-xl",
        className
      )}
    >
      {children}

      {/* Subtle dashed outline only visible during active drag */}
      {isDragging && !isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-xl pointer-events-none" />
      )}

      {/* Drop indicator when hovering */}
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
