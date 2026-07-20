"use client";

import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import type { User } from "firebase/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_CLIENT_ID;
let _scriptLoaded = false;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (momentListener?: (moment: string) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id || _scriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-use_fedcm", "false");
    s.onload = () => { _scriptLoaded = true; resolve(); };
    s.onerror = () => reject(new Error("Failed to load GIS script"));
    document.head.appendChild(s);
  });
}

export interface OneTapCallbacks {
  onSuccess: (user: User) => void;
  onError: (error: string) => void;
}

export async function initOneTap(callbacks: OneTapCallbacks): Promise<void> {
  if (!CLIENT_ID || typeof window === "undefined") return;

  const { getFirebase } = await import("@/services/firebase");
  const { auth } = getFirebase();
  if (!auth) return;

  try {
    await loadGsiScript();
  } catch {
    return;
  }

  // Initialize is safe to call multiple times — GIS makes subsequent calls no-ops
  window.google?.accounts?.id.initialize({
    client_id: CLIENT_ID,
    callback: async (response) => {
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        const result = await signInWithCredential(auth, credential);
        callbacks.onSuccess(result.user);
      } catch {
        callbacks.onError("One Tap sign-in failed");
      }
    },
    cancel_on_tap_outside: false,
    use_fedcm_for_prompt: false,
  });

  // Reset the legacy cooldown so a previously-dismissed prompt reappears
  clearOneTapCooldown();

  // Show the One Tap dialog
  window.google?.accounts?.id.prompt();
}

export function cancelOneTap(): void {
  if (typeof window === "undefined") return;
  window.google?.accounts?.id.cancel();
}

/**
 * In legacy (non-FedCM) mode, GIS records a dismissal/cooldown in the `g_state`
 * cookie. Clearing it lets the One Tap prompt reappear on the next load instead
 * of staying suppressed after the user closed it.
 */
export function clearOneTapCooldown(): void {
  if (typeof document === "undefined") return;
  document.cookie = "g_state=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

/** Re-trigger the One Tap dialog (e.g. after user clicked the Google button). */
export function rePromptOneTap(): void {
  if (typeof window === "undefined") return;
  window.google?.accounts?.id.prompt();
}
