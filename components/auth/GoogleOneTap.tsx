"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { initOneTap, showOneTap, cancelOneTap } from "@/services/one-tap";

const firebaseConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0;

const GOOGLE_ONE_TAP_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_CLIENT_ID;

export function GoogleOneTap() {
  const router = useRouter();
  const initRef = useRef(false);
  const setUser = useUserStore((s) => s.setUser);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!firebaseConfigured || !GOOGLE_ONE_TAP_CLIENT_ID || isAuthenticated) return;

    if (!initRef.current) {
      initRef.current = true;
      initOneTap({
        onSuccess: (user) => {
          setUser({
            uid: user.uid,
            displayName: user.displayName ?? "User",
            email: user.email,
            photoURL: user.photoURL,
          });
          router.replace("/");
        },
        onError: () => {},
      });
    }

    // Show One Tap fresh on every mount (every page load / refresh)
    const timer = setTimeout(() => showOneTap(), 500);

    return () => {
      clearTimeout(timer);
      cancelOneTap();
    };
  }, [isAuthenticated, router, setUser]);

  return null;
}
