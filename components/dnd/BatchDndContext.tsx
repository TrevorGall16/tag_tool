"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useBatchStore, type LocalImageItem } from "@/store/useBatchStore";
import { saveBatch, saveGroups } from "@/lib/persistence";
import { ImageDragPreview } from "./DraggableImage";
import { DragContext } from "./DragContext";

export interface BatchDndContextProps {
  children: React.ReactNode;
}

export function BatchDndContext({ children }: BatchDndContextProps) {
  const [activeImage, setActiveImage] = useState<LocalImageItem | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { groups, moveImageToGroup, sessionId, marketplace } = useBatchStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const findImageAndGroup = (
    imageId: string
  ): { image: LocalImageItem; groupId: string } | null => {
    for (const group of groups) {
      const image = group.images.find((img) => img.id === imageId);
      if (image) return { image, groupId: group.id };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const result = findImageAndGroup(active.id as string);
    if (result) {
      setActiveImage(result.image);
      setActiveGroupId(result.groupId);
      console.log(`[DnD] Drag started: image ${active.id} from group ${result.groupId}`);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear drag state immediately
    const fromGroupId = activeGroupId;
    setActiveImage(null);
    setActiveGroupId(null);

    if (!over || !fromGroupId) {
      console.log("[DnD] Drag cancelled: no drop target");
      return;
    }

    const imageId = active.id as string;
    const toGroupId = over.id as string;

    // Don't do anything if dropping on the same group
    if (fromGroupId === toGroupId) {
      console.log("[DnD] Dropped on same group, no change");
      return;
    }

    console.log(`[DnD] Moving image ${imageId} from ${fromGroupId} to ${toGroupId}`);

    // Update Zustand state
    moveImageToGroup(imageId, fromGroupId, toGroupId);

    // Immediately persist to IndexedDB (don't wait for debounce)
    if (sessionId) {
      try {
        const updatedState = useBatchStore.getState();
        await saveBatch(sessionId, marketplace);
        await saveGroups(sessionId, updatedState.groups);
        console.log("[DnD] Persisted move to IndexedDB");
      } catch (err) {
        console.error("[DnD] Failed to persist move:", err);
      }
    }
  };

  const isDragging = activeImage !== null;

  return (
    <DragContext.Provider value={{ isDragging }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {children}
        <DragOverlay dropAnimation={null}>
          {activeImage && <ImageDragPreview image={activeImage} />}
        </DragOverlay>
      </DndContext>
    </DragContext.Provider>
  );
}
