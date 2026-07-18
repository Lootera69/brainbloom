"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useUserStore } from "@/store/user-store";

export function ThemeSync() {
  const { setTheme } = useTheme();
  const storeTheme = useUserStore((s) => s.theme);
  const hydrated = useUserStore.persist?.hasHydrated?.() ?? true;

  useEffect(() => {
    if (hydrated) {
      setTheme(storeTheme);
    }
  }, [storeTheme, hydrated, setTheme]);

  return null;
}
