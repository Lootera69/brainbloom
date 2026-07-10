"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseLoadingTimeoutResult {
  timedOut: boolean;
  cancel: () => void;
  reset: () => void;
}

export function useLoadingTimeout(ms = 6000): UseLoadingTimeoutResult {
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    setTimedOut(false);
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setTimedOut(true);
      }
    }, ms);
  }, [ms, clear]);

  useEffect(() => {
    mountedRef.current = true;
    start();
    return () => {
      mountedRef.current = false;
      clear();
    };
  }, [start, clear]);

  const reset = useCallback(() => {
    start();
  }, [start]);

  return { timedOut, cancel: clear, reset };
}
