"use client";

// Event "Moments" — the single hook the player UI watches. Returns the Moment
// that should style the app right now (or null on an ordinary day) together
// with the palette for the current light/dark theme.

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { getEventConfig } from "@/services/event-service";
import { resolveActiveEvent, paletteFor } from "@/lib/events/event-runtime";
import type { EventTheme, EventPalette } from "@/lib/events/event-theme";

export interface ActiveMoment {
  event: EventTheme | null;
  palette: EventPalette | null;
  isDark: boolean;
}

export function useActiveMoment(): ActiveMoment {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [event, setEvent] = useState<EventTheme | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await getEventConfig();
      if (cancelled) return;
      // Debug preview override (mirrors Flutter `debugEventOverrideProvider`):
      // `?moment=<id>` forces that Moment regardless of date / master switch.
      const forced = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("moment")
        : null;
      if (forced) {
        setEvent(cfg.events.find((e) => e.id === forced) ?? null);
        return;
      }
      setEvent(cfg.seasonalThemesEnabled ? resolveActiveEvent(cfg.events, new Date()) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const palette = event ? paletteFor(event, isDark) : null;
  return { event, palette, isDark };
}
