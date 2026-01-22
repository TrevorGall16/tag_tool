"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useBatchStore } from "@/store/useBatchStore";
import { hydrateSession, sessionExists, saveBatch, saveGroups, debounce } from "@/lib/persistence";

export interface UsePersistenceResult {
  isRestoring: boolean;
  isHydrated: boolean;
  error: string | null;
  restoredImageCount: number;
}

/**
 * Hook to manage IndexedDB persistence for the batch store.
 * - Waits for Zustand persist to finish first
 * - Then hydrates full session data from IndexedDB
 * - Sets up sync subscription to persist changes
 */
export function usePersistence(): UsePersistenceResult {
  const [isRestoring, setIsRestoring] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredImageCount, setRestoredImageCount] = useState(0);
  const syncSetupRef = useRef(false);
  const hydrationAttemptedRef = useRef(false);

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

  // Set up sync subscription after hydration is complete
  useEffect(() => {
    if (!isHydrated || syncSetupRef.current) return;
    syncSetupRef.current = true;

    // Create debounced sync function
    const debouncedSync = debounce(async () => {
      const state = useBatchStore.getState();
      if (!state.sessionId) return;

      try {
        await saveBatch(state.sessionId, state.marketplace);
        await saveGroups(state.sessionId, state.groups);
      } catch (err) {
        console.error("[Persistence] Failed to sync to IndexedDB:", err);
      }
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
  }, [isHydrated]);

  return { isRestoring, isHydrated, error, restoredImageCount };
}
