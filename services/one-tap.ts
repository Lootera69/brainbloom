"use client";

import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import type { User } from "firebase/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_CLIENT_ID;
let _initialized = false;

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
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load GIS script"));
    document.head.appendChild(s);
  });
}

export interface OneTapCallbacks {
  onSuccess: (user: User) => void;
  onError: (error: string) => void;
}

export async function initOneTap(callbacks: OneTapCallbacks): Promise<void> {
  if (_initialized || !CLIENT_ID || typeof window === "undefined") return;

  const { getFirebase } = await import("@/services/firebase");
  const { auth } = getFirebase();
  if (!auth) return;

  try {
    await loadGsiScript();
  } catch {
    return;
  }
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
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

  _initialized = true;
}

/** Call prompt() fresh — each mount triggers a fresh show, even after dismissal. */
export function showOneTap(): void {
  if (typeof window === "undefined") return;
  window.google?.accounts?.id.prompt();
}

export function rePromptOneTap(): void {
  showOneTap();
}

export function cancelOneTap(): void {
  if (typeof window === "undefined") return;
  window.google?.accounts?.id.cancel();
}
