"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useBatchStore } from "@/store/useBatchStore";
import { hydrateSession, sessionExists, saveSessionAtomic, debounce } from "@/lib/persistence";

export interface UsePersistenceResult {
  isRestoring: boolean;
  isHydrated: boolean;
  error: string | null;
  restoredImageCount: number;
  /** Call this to trigger an immediate sync to IndexedDB */
  triggerSync: () => Promise<void>;
}

// Module-level flag to track explicit clear operations
let explicitClearRequested = false;

/**
 * Call this before clearing the batch to allow zero-image saves
 */
export function markExplicitClear(): void {
  explicitClearRequested = true;
  console.log("[Persistence] Explicit clear marked - zero-image save will be allowed");
}

/**
 * Hook to manage IndexedDB persistence for the batch store.
 * - Waits for Zustand persist to finish first
 * - Then hydrates full session data from IndexedDB
 * - Sets up sync subscription to persist changes
 * - CRITICAL: Sync only starts AFTER hydration completes to prevent race conditions
 * - CRITICAL: Zero-image saves are blocked unless explicitly requested via markExplicitClear()
 */
export function usePersistence(): UsePersistenceResult {
  const [isRestoring, setIsRestoring] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredImageCount, setRestoredImageCount] = useState(0);
  const syncSetupRef = useRef(false);
  const hydrationAttemptedRef = useRef(false);

  // Track the image count at hydration time to detect accidental wipes
  const hydratedImageCountRef = useRef<number>(0);
  // Track the last known image count after successful syncs
  const lastKnownImageCountRef = useRef<number>(0);

  const setGroups = useBatchStore((state) => state.setGroups);
  const setMarketplace = useBatchStore((state) => state.setMarketplace);

  const performHydration = useCallback(async () => {
    // Prevent multiple hydration attempts
    if (hydrationAttemptedRef.current) return;
    hydrationAttemptedRef.current = true;

    // Get sessionId directly from the store (after Zustand persist has rehydrated)
    const sessionId = useBatchStore.getState().sessionId;

    if (!sessionId) {
      setIsRestoring(false);
      setIsHydrated(true);
      return;
    }

    try {
      const exists = await sessionExists(sessionId);
      if (!exists) {
        setIsRestoring(false);
        setIsHydrated(true);
        return;
      }

      const session = await hydrateSession(sessionId);
      if (session) {
        // Count total images restored
        const totalImages = session.groups.reduce((acc, g) => acc + g.images.length, 0);
        setRestoredImageCount(totalImages);
        // Store this count to detect accidental wipes during sync
        hydratedImageCountRef.current = totalImages;
        console.log(`[Persistence] Hydrated ${totalImages} images from IndexedDB`);

        // Validate that File objects were properly reconstructed
        let validImages = 0;
        for (const group of session.groups) {
          for (const image of group.images) {
            if (image.file instanceof File && image.file.size > 0) {
              validImages++;
            }
          }
        }

        if (validImages !== totalImages && totalImages > 0) {
          console.warn(
            `[Persistence] Only ${validImages}/${totalImages} images had valid File objects`
          );
        }

        setGroups(session.groups);
        setMarketplace(session.marketplace);
      }

      setIsHydrated(true);
    } catch (err) {
      console.error("[Persistence] Failed to hydrate session:", err);
      setError(err instanceof Error ? err.message : "Failed to restore session");
    } finally {
      setIsRestoring(false);
    }
  }, [setGroups, setMarketplace]);

  // Wait for Zustand persist to complete, then hydrate from IndexedDB
  useEffect(() => {
    // Check if Zustand persist has already hydrated
    const persistApi = useBatchStore.persist;

    if (persistApi.hasHydrated()) {
      // Already hydrated, proceed immediately
      performHydration();
    } else {
      // Wait for Zustand persist to finish
      const unsubFinishHydration = persistApi.onFinishHydration(() => {
        performHydration();
      });

      return () => {
        unsubFinishHydration();
      };
    }
  }, [performHydration]);

  /**
   * Core sync function with count-based safety guards.
   * Returns true if sync was performed, false if blocked.
   */
  const performSync = useCallback(async (): Promise<boolean> => {
    const state = useBatchStore.getState();
    if (!state.sessionId) return false;

    // Count current images in store
    const currentImageCount = state.groups.reduce((acc, g) => acc + g.images.length, 0);

    // COUNT-BASED SYNC GUARD
    // If current count is 0 but we had images before, this is suspicious
    const hadImagesBefore = hydratedImageCountRef.current > 0 || lastKnownImageCountRef.current > 0;

    if (currentImageCount === 0 && hadImagesBefore) {
      // Check if this is an explicit clear
      if (explicitClearRequested) {
        console.log("[Persistence] Zero-image save ALLOWED (explicit clear requested)");
        explicitClearRequested = false; // Reset the flag
      } else {
        console.warn(
          "[Persistence] ABORT SYNC: Store has 0 images but last known count was",
          lastKnownImageCountRef.current,
          "and hydrated count was",
          hydratedImageCountRef.current,
          "- This may be a race condition. Use markExplicitClear() to allow."
        );
        return false;
      }
    }

    try {
      const result = await saveSessionAtomic(state.sessionId, state.marketplace, state.groups);

      // Update last known count on successful sync
      lastKnownImageCountRef.current = currentImageCount;
      console.log(`[Persistence] Sync complete. Last known image count: ${currentImageCount}`);

      return true;
    } catch (err) {
      console.error("[Persistence] Failed to sync to IndexedDB:", err);
      return false;
    }
  }, []);

  // Set up sync subscription ONLY after hydration is FULLY complete
  // CRITICAL: Must check BOTH isHydrated AND !isRestoring to prevent race conditions
  useEffect(() => {
    // Block sync until hydration is completely finished
    if (!isHydrated || isRestoring || syncSetupRef.current) return;
    syncSetupRef.current = true;

    console.log("[Persistence] Hydration complete, starting sync subscription");

    // Initialize last known count from hydration
    lastKnownImageCountRef.current = hydratedImageCountRef.current;

    // Create debounced sync function
    const debouncedSync = debounce(() => {
      performSync();
    }, 300);

    // Subscribe to store changes
    const unsubscribe = useBatchStore.subscribe((state, prevState) => {
      // Only sync if groups, marketplace, or sessionId changed
      if (
        state.groups !== prevState.groups ||
        state.marketplace !== prevState.marketplace ||
        state.sessionId !== prevState.sessionId
      ) {
        debouncedSync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isHydrated, isRestoring, performSync]);

  // Expose a manual sync trigger for immediate saves (e.g., from Lightbox)
  const triggerSync = useCallback(async (): Promise<void> => {
    if (!isHydrated || isRestoring) {
      console.warn("[Persistence] Cannot trigger sync - hydration not complete");
      return;
    }
    await performSync();
  }, [isHydrated, isRestoring, performSync]);

  return { isRestoring, isHydrated, error, restoredImageCount, triggerSync };
}
