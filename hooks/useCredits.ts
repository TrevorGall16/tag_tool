"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useBatchStore } from "@/store/useBatchStore";

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
  const { data: session, status } = useSession();
  const [state, setState] = useState<CreditsState>({
    balance: session?.user?.creditsBalance ?? 0,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  // Stable ref so fetchCredits can read auth state without it being a dep.
  const isAuthRef = useRef(status === "authenticated");
  // Emergency stop: set to true on non-retriable server errors.
  const hasStoppedPollingRef = useRef(false);

  const isAuthenticated = status === "authenticated";

  // Keep the auth ref in sync without causing fetchCredits to be recreated.
  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Fetch latest credit balance.
  //
  // ⚠️  LOOP PREVENTION — do NOT add session, updateSession, or creditsBalance
  // to the dependency array.  The previous implementation called updateSession()
  // when the balance changed, which mutated the session object, which changed
  // the `session?.user?.creditsBalance` dep, which recreated fetchCredits, which
  // restarted the setInterval, which fetched again — an infinite loop at ~300 ms.
  //
  // The JWT balance is refreshed explicitly by the payment success page; this
  // hook's only job is to keep the local UI in sync with the DB.
  const fetchCredits = useCallback(async () => {
    if (!isAuthRef.current || hasStoppedPollingRef.current) return;

    // Zustand stutter guard: if another component already fired a server fetch
    // in this render cycle (e.g. fetchProjects reacting to the same status
    // change), skip rather than pile on.
    const storeState = useBatchStore.getState();
    if (storeState.isFetchingServerData) return;
    storeState.setFetchingServerData(true);

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch("/api/account");
      if (!res.ok) {
        // Emergency stop: a 4xx/5xx from the account API (e.g. Stripe 404 in
        // test mode) is not a transient error — retrying would just spam logs.
        // Surface the error once and halt the polling loop for this mount.
        hasStoppedPollingRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        throw new Error(`Account API error ${res.status} — polling stopped`);
      }

      const data = await res.json();
      if (isMountedRef.current) {
        setState({
          balance: data.user?.creditsBalance ?? 0,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
        // NOTE: updateSession() is intentionally absent here — see loop
        // prevention note above.  The session JWT is refreshed by the payment
        // success page; we only need to update local display state.
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    } finally {
      useBatchStore.getState().setFetchingServerData(false);
    }
  }, []); // ← stable: empty deps.  fetchCredits is created once per mount.

  // Manual refresh function - call this after payments or AI tagging
  const refresh = useCallback(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Sync with session on initial load and session changes.
  // Strict comparison: only update local state if the value actually changed,
  // preventing a redundant setState from triggering downstream re-renders.
  useEffect(() => {
    const sessionBalance = session?.user?.creditsBalance;
    if (sessionBalance !== undefined && sessionBalance !== state.balance) {
      setState((prev) => ({ ...prev, balance: sessionBalance }));
    }
    // state.balance deliberately omitted: we only want to react to session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.creditsBalance]);

  // Set up polling.
  // fetchCredits is stable (empty deps above), so this effect only re-runs when
  // isAuthenticated, enablePolling, or pollInterval genuinely change — not on
  // every session object mutation.
  useEffect(() => {
    isMountedRef.current = true;
    hasStoppedPollingRef.current = false; // reset emergency stop on remount

    if (isAuthenticated && enablePolling) {
      fetchCredits(); // initial fetch
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
