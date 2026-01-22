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

  // Only show drop indicators when actively dragging
  const showDropZone = isDragging;
  const showDropHere = isDragging && isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-150",
        // Only show ring when actively dragging AND hovering over this group
        showDropHere && "ring-2 ring-blue-400 ring-offset-2 rounded-xl",
        className
      )}
    >
      {children}

      {/* Subtle dashed outline only visible during active drag (not when hovering) */}
      {showDropZone && !isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-xl pointer-events-none" />
      )}

      {/* Drop indicator overlay - only when dragging AND hovering */}
      {showDropHere && (
        <div className="absolute inset-0 bg-blue-100/50 rounded-xl pointer-events-none flex items-center justify-center">
          <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
            Drop here
          </span>
        </div>
      )}
    </div>
  );
}
