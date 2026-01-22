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
import { ImageDragPreview } from "./DraggableImage";

export interface BatchDndContextProps {
  children: React.ReactNode;
}

export function BatchDndContext({ children }: BatchDndContextProps) {
  const [activeImage, setActiveImage] = useState<LocalImageItem | null>(null);
  const { groups, moveImageToGroup } = useBatchStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const findImageById = (imageId: string): LocalImageItem | null => {
    for (const group of groups) {
      const image = group.images.find((img) => img.id === imageId);
      if (image) return image;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const image = findImageById(active.id as string);
    setActiveImage(image);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveImage(null);

    if (!over) return;

    const imageId = active.id as string;
    const fromGroupId = (active.data.current as { groupId: string })?.groupId;
    const toGroupId = over.id as string;

    if (fromGroupId && fromGroupId !== toGroupId) {
      moveImageToGroup(imageId, fromGroupId, toGroupId);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>
        {activeImage && <ImageDragPreview image={activeImage} />}
      </DragOverlay>
    </DndContext>
  );
}
