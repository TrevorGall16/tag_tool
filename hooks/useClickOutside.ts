"use client";

import { useEffect, useRef, RefObject } from "react";

export interface UseClickOutsideOptions {
  /** Whether to ignore the click if text was selected during the interaction */
  ignoreTextSelection?: boolean;
  /** Whether the hook is currently enabled */
  enabled?: boolean;
}

/**
 * Hook that detects clicks outside a specified element.
 * Distinguishes between regular clicks and drag-and-release (text selection).
 *
 * @param ref - React ref to the element to monitor
 * @param callback - Function to call when a click outside is detected
 * @param options - Configuration options
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  options: UseClickOutsideOptions = {}
): void {
  const { ignoreTextSelection = true, enabled = true } = options;

  // Track mouse position at mousedown to detect drag vs click
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const DRAG_THRESHOLD = 5; // Pixels of movement to consider it a drag

    const handleMouseDown = (event: MouseEvent) => {
      mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
      mouseDownTargetRef.current = event.target;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!ref.current || !mouseDownPosRef.current) {
        mouseDownPosRef.current = null;
        mouseDownTargetRef.current = null;
        return;
      }

      // Check if click started inside the element
      const mouseDownTarget = mouseDownTargetRef.current;
      const startedInside =
        mouseDownTarget instanceof Node && ref.current.contains(mouseDownTarget);

      // Check if click ended inside the element
      const endedInside = event.target instanceof Node && ref.current.contains(event.target);

      // Reset tracking refs
      const startPos = mouseDownPosRef.current;
      mouseDownPosRef.current = null;
      mouseDownTargetRef.current = null;

      // If started or ended inside, not an outside click
      if (startedInside || endedInside) {
        return;
      }

      // Check for text selection (drag) if option is enabled
      if (ignoreTextSelection) {
        // Calculate distance moved
        const deltaX = Math.abs(event.clientX - startPos.x);
        const deltaY = Math.abs(event.clientY - startPos.y);
        const wasDragged = deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD;

        // Check if there's an active text selection
        const selection = window.getSelection();
        const hasTextSelection = selection && selection.toString().length > 0;

        // If user dragged or has text selected, don't close
        if (wasDragged || hasTextSelection) {
          return;
        }
      }

      // This is a genuine outside click
      callback();
    };

    // Use capture phase to ensure we catch the events before they bubble
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
  }, [ref, callback, ignoreTextSelection, enabled]);
}

/**
 * Variant that also handles Escape key to close
 */
export function useClickOutsideOrEscape<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  options: UseClickOutsideOptions = {}
): void {
  const { enabled = true } = options;

  useClickOutside(ref, callback, options);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [callback, enabled]);
}
