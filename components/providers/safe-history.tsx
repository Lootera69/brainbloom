"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __brainbloomSafeHistory?: boolean;
  }
}

function warnBlocked(api: string, e: unknown): void {
  console.warn(`[BrainBloom] ${api} was blocked (browser extension?):`, e);
}

function installSafeHistory(): void {
  if (typeof window === "undefined") return;
  if (window.__brainbloomSafeHistory) return;
  window.__brainbloomSafeHistory = true;

  try {
    const history = window.history;
    if (!history) return;

    const originalPush = history.pushState?.bind(history);
    const originalReplace = history.replaceState?.bind(history);

    const safePush = ((data: unknown, unused: string, url?: string | URL | null) => {
      try {
        if (originalPush) return originalPush(data, unused, url);
      } catch (e) {
        warnBlocked("history.pushState", e);
      }
    }) as typeof history.pushState;

    const safeReplace = ((data: unknown, unused: string, url?: string | URL | null) => {
      try {
        if (originalReplace) return originalReplace(data, unused, url);
      } catch (e) {
        warnBlocked("history.replaceState", e);
      }
    }) as typeof history.replaceState;

    history.pushState = safePush;
    history.replaceState = safeReplace;

    try {
      const proto = window.History?.prototype;
      if (proto) {
        proto.pushState = safePush;
        proto.replaceState = safeReplace;
      }
    } catch {
      // Prototype patch is optional — instance patch covers the app router
    }
  } catch {
    // History patching unavailable — the app still runs
  }
}

installSafeHistory();

export function SafeHistory() {
  useEffect(() => {
    installSafeHistory();
  }, []);

  return null;
}
