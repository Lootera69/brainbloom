"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { initOneTap, cancelOneTap } from "@/services/one-tap";

const firebaseConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0;

const GOOGLE_ONE_TAP_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_CLIENT_ID;

export function GoogleOneTap() {
  const router = useRouter();
  const calledRef = useRef(false);
  const setUser = useUserStore((s) => s.setUser);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  // Suppress only FedCM / GSI_LOGGER console noise (harmless on localhost)
  useEffect(() => {
    const orig = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && (args[0].includes("FedCM") || args[0].includes("GSI_LOGGER"))) return;
      if (args[0] instanceof Error && (args[0].message?.includes("FedCM") || args[0].message?.includes("GSI_LOGGER"))) return;
      orig.call(console, ...args);
    };
    return () => { console.error = orig; };
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !GOOGLE_ONE_TAP_CLIENT_ID || isAuthenticated || calledRef.current) return;
    calledRef.current = true;

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

    return () => {
      cancelOneTap();
    };
  }, [isAuthenticated, router, setUser]);

  return null;
}
