"use client";

import { createContext, useContext } from "react";

interface DragContextValue {
  isDragging: boolean;
}

export const DragContext = createContext<DragContextValue>({ isDragging: false });

export function useDragContext() {
  return useContext(DragContext);
}
