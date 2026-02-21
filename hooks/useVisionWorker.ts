"use client";

import { useCallback, useRef } from "react";
import { useBatchStore } from "@/store/useBatchStore";
import type { VisionTagsRequest, VisionTagsResponse } from "@/types";

/**
 * A single unit of work dispatched to the vision tags API.
 * The worker resolves with the parsed response data or rejects with an Error.
 */
export interface TagChunk {
  chunkIndex: number;
  totalChunks: number;
  payload: Omit<VisionTagsRequest, "chunkIndex" | "totalChunks">;
}

interface UseVisionWorkerOptions {
  /** Max simultaneous in-flight requests. Default: 3. */
  concurrency?: number;
  /** Max retry attempts per chunk on retryable errors (500/503/504). Default: 3. */
  maxRetries?: number;
}

/** Retryable HTTP status codes from the AI infrastructure layer. */
const RETRYABLE_STATUSES = new Set([500, 503, 504]);

/** Base delay for exponential backoff in ms. Doubles each attempt: 2s → 4s → 8s. */
const BACKOFF_BASE_MS = 2_000;

/**
 * Sleep for `ms` milliseconds. Used for backoff between retries.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatch a single chunk to /api/vision/tags with exponential backoff retry.
 * Throws on non-retryable errors or after exhausting all retries.
 */
async function dispatchChunk(chunk: TagChunk, maxRetries: number): Promise<VisionTagsResponse> {
  const body: VisionTagsRequest = {
    ...chunk.payload,
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.totalChunks,
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s, 8s …
      await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt - 1));
    }

    const res = await fetch("/api/vision/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Unknown API error");
      }
      return json.data as VisionTagsResponse;
    }

    // Non-retryable client errors — fail immediately
    if (!RETRYABLE_STATUSES.has(res.status)) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    // Retryable — log and loop
    if (attempt < maxRetries) {
      console.warn(
        `[useVisionWorker] chunk ${chunk.chunkIndex}/${chunk.totalChunks} got ${res.status}, ` +
          `retrying (attempt ${attempt + 1}/${maxRetries})…`
      );
    } else {
      throw new Error(
        `Chunk ${chunk.chunkIndex} failed after ${maxRetries} retries (HTTP ${res.status})`
      );
    }
  }

  // Should be unreachable, but TypeScript requires a return/throw here.
  throw new Error("Unexpected: retry loop exited without returning");
}

/**
 * useVisionWorker — concurrency-limited orchestrator for the chunked tagging pipeline.
 *
 * Usage:
 * ```ts
 * const { runChunks } = useVisionWorker();
 * const results = await runChunks(chunks);
 * ```
 *
 * - Dispatches up to `concurrency` (default 3) chunks simultaneously.
 * - Retries transient 500/503/504 errors with exponential backoff (2s/4s/8s).
 * - Writes progress to `useBatchStore.taggingProgress` after each chunk completes.
 * - Clears `taggingProgress` when all chunks are done (or on abort).
 * - Aborts remaining work when the component unmounts (via AbortController).
 */
export function useVisionWorker(options: UseVisionWorkerOptions = {}) {
  const { concurrency = 3, maxRetries = 3 } = options;
  const abortRef = useRef<AbortController | null>(null);

  const runChunks = useCallback(
    async (chunks: TagChunk[]): Promise<VisionTagsResponse[]> => {
      // Cancel any previous in-flight run
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const { setTaggingProgress } = useBatchStore.getState();
      const total = chunks.length;
      let completed = 0;

      setTaggingProgress({ current: 0, total });

      // Shared mutable cursor — safe because JS is single-threaded.
      // Each worker increments this to claim the next chunk atomically.
      let nextIndex = 0;
      const results: VisionTagsResponse[] = new Array(total);

      async function worker(): Promise<void> {
        while (true) {
          if (controller.signal.aborted) return;

          const myIndex = nextIndex++;
          if (myIndex >= total) return;

          const chunk = chunks[myIndex]!;

          try {
            results[myIndex] = await dispatchChunk(chunk, maxRetries);
          } catch (err) {
            // Propagate the error to the outer Promise.all so the caller sees it
            throw err;
          }

          if (!controller.signal.aborted) {
            completed++;
            setTaggingProgress({ current: completed, total });
          }
        }
      }

      try {
        // Spin up `concurrency` parallel workers
        await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
      } finally {
        // Always clear progress indicator, even on error
        useBatchStore.getState().setTaggingProgress(null);
      }

      return results;
    },
    [concurrency, maxRetries]
  );

  /** Cancel any in-flight runChunks call. Call this on component unmount if needed. */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    useBatchStore.getState().setTaggingProgress(null);
  }, []);

  return { runChunks, abort };
}
