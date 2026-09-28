// Event "Moments" — player-facing runtime: which Moment is active today, its
// palette, and the small localStorage-backed dismissal/answered state.
//
// Mirrors the Flutter `event_provider.dart` resolver (hero beats accent, then
// higher priority, then earlier calendar order) and its per-day token stores.

import {
  type EventTheme,
  type EventPalette,
  isActiveToday,
  scheduleOccursOn,
} from "./event-theme";

/** Picks the event active on `now`: hero beats accent, then higher priority,
 *  then earlier calendar order. Null when nothing matches. 1:1 with Flutter
 *  `resolveActiveEvent` + `_beats`. */
export function resolveActiveEvent(
  events: EventTheme[],
  now: Date = new Date(),
): EventTheme | null {
  let best: EventTheme | null = null;
  for (const e of events) {
    if (!isActiveToday(e, now)) continue;
    if (best === null || beats(e, best)) best = e;
  }
  return best;
}

function beats(a: EventTheme, b: EventTheme): boolean {
  const aHero = a.tier === "hero";
  const bHero = b.tier === "hero";
  if (aHero !== bHero) return aHero;
  if (a.priority !== b.priority) return a.priority > b.priority;
  return false;
}

/** The next local-midnight date on which a *different* Moment becomes active. */
export function nextEventStart(
  events: EventTheme[],
  now: Date = new Date(),
  horizonDays = 366,
): { event: EventTheme; start: Date } | null {
  let prev = resolveActiveEvent(events, now);
  for (let i = 1; i <= horizonDays; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const active = resolveActiveEvent(events, day);
    if (active && active.id !== prev?.id) return { event: active, start: day };
    prev = active;
  }
  return null;
}

/** Silences the unused-import lint if a caller only needs the schedule check. */
export function occursOn(e: EventTheme, day: Date): boolean {
  return scheduleOccursOn(e.schedule, { y: day.getFullYear(), m: day.getMonth() + 1, d: day.getDate() });
}

export function paletteFor(e: EventTheme, isDark: boolean): EventPalette {
  return isDark ? e.darkPalette : e.lightPalette;
}

/** A per-day dismissal/answered token — distinct per calendar day so a
 *  multi-day window re-shows the next morning. */
export function eventDayToken(id: string, day: Date): string {
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${id}@${day.getFullYear()}-${m}-${d}`;
}

// ── localStorage token sets (dismissed banners / answered questions) ─────────
// Keep only the most recent 12 tokens — old day-tokens are dead weight. Matches
// the Flutter `DismissedEventBanners` / `AnsweredEventPuzzles` notifiers.

export const BANNER_DISMISSED_KEY = "brainbloom-event-banner-dismissed";
export const SPECIAL_ANSWERED_KEY = "brainbloom-event-answered";

export function readTokenSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function addToken(key: string, token: string): Set<string> {
  const set = readTokenSet(key);
  if (set.has(token)) return set;
  set.add(token);
  let kept = [...set];
  if (kept.length > 12) kept = kept.slice(kept.length - 12);
  try {
    localStorage.setItem(key, JSON.stringify(kept));
  } catch {
    // ignore
  }
  return new Set(kept);
}
