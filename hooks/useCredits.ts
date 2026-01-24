"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface CreditsState {
  balance: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseCreditsOptions {
  /** Polling interval in milliseconds. Default: 30000 (30 seconds) */
  pollInterval?: number;
  /** Whether to enable polling. Default: true */
  enablePolling?: boolean;
}

export function useCredits(options: UseCreditsOptions = {}) {
  const { pollInterval = 30000, enablePolling = true } = options;
  const { data: session, status, update: updateSession } = useSession();
  const [state, setState] = useState<CreditsState>({
    balance: session?.user?.creditsBalance ?? 0,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const isAuthenticated = status === "authenticated";

  // Fetch latest credit balance
  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch("/api/account");
      if (!res.ok) {
        throw new Error("Failed to fetch credits");
      }
      const data = await res.json();

      if (isMountedRef.current) {
        const newBalance = data.user?.creditsBalance ?? 0;
        setState({
          balance: newBalance,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });

        // Also update the session if balance changed
        if (session?.user?.creditsBalance !== newBalance) {
          await updateSession();
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    }
  }, [isAuthenticated, session?.user?.creditsBalance, updateSession]);

  // Manual refresh function - call this after payments or AI tagging
  const refresh = useCallback(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Sync with session on initial load and session changes
  useEffect(() => {
    const sessionBalance = session?.user?.creditsBalance;
    if (sessionBalance !== undefined) {
      setState((prev) => ({
        ...prev,
        balance: sessionBalance,
      }));
    }
  }, [session?.user?.creditsBalance]);

  // Set up polling
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && enablePolling) {
      // Initial fetch
      fetchCredits();

      // Set up interval
      intervalRef.current = setInterval(fetchCredits, pollInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, enablePolling, pollInterval, fetchCredits]);

  return {
    balance: state.balance,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refresh,
    isAuthenticated,
  };
}

// Export a global refresh trigger for use after payments
let globalRefreshCallback: (() => void) | null = null;

export function setCreditsRefreshCallback(callback: () => void) {
  globalRefreshCallback = callback;
}

export function triggerCreditsRefresh() {
  if (globalRefreshCallback) {
    globalRefreshCallback();
  }
}
