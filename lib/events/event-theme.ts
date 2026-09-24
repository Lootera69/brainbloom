// Event "Moments" — TypeScript model + helpers.
//
// Mirror of the Flutter model (`lib/core/events/event_theme.dart`) and its JSON
// codec (`lib/core/events/event_theme_codec.dart`). The Puzzle Studio authors
// these definitions and publishes them to Firestore `settings/events`; the
// Flutter app reads them back through the exact wire format below.
//
// Colours are ARGB ints (0xAARRGGBB, the Dart `Color.toARGB32()` form).

export type EventTier = "hero" | "accent";

export type EventParticle =
  | "none"
  | "bats"
  | "snow"
  | "petals"
  | "sparkles"
  | "diyas"
  | "confetti"
  | "leaves"
  | "hearts"
  | "stars"
  | "piDigits"
  | "jigsaw"
  | "fireworks";

export const EVENT_PARTICLES: EventParticle[] = [
  "none", "bats", "snow", "petals", "sparkles", "diyas", "confetti",
  "leaves", "hearts", "stars", "piDigits", "jigsaw", "fireworks",
];

export type ComputedKind = "fridayThe13th";

export interface EventPalette {
  orb1: number;
  orb2: number;
  orb3: number;
  accent: number;
  onAccent: number;
  bannerFrom: number;
  bannerTo: number;
}

export interface EventDay {
  y: number;
  m: number;
  d: number;
}

export type EventSchedule =
  | { type: "fixedDate"; month: number; day: number; leadDays: number; trailDays: number }
  | { type: "nthWeekday"; month: number; weekday: number; ordinal: number }
  | { type: "dateWindow"; startMonth: number; startDay: number; endMonth: number; endDay: number }
  | { type: "perYearDates"; ranges: Record<string, { start: EventDay; end: EventDay }> }
  | { type: "computed"; kind: ComputedKind };

export type ScheduleType = EventSchedule["type"];

// A themed multiple-choice question surfaced on Home during a Moment. Optional
// on the wire (the Flutter app currently carries these hard-coded); publishing
// it here makes the Studio the source of truth going forward.
export interface EventQuestion {
  kicker: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  xp: number;
  factoid: string;
}

export interface EventTheme {
  id: string;
  title: string;
  short: string;
  emoji: string;
  tier: EventTier;
  schedule: EventSchedule;
  lightPalette: EventPalette;
  darkPalette: EventPalette;
  bannerCopy: string;
  bannerSubtitle?: string;
  particle: EventParticle;
  puzzleCategory?: string;
  pinnedPuzzleId?: string;
  priority: number;
  question?: EventQuestion;
}

// The published document at Firestore `settings/events`.
export interface EventConfigDoc {
  seasonalThemesEnabled: boolean;
  events: EventTheme[];
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Colour helpers (ARGB int <-> #RRGGBB / alpha)
// ---------------------------------------------------------------------------

export function argbToHex(argb: number): string {
  const rgb = (argb >>> 0) & 0x00ffffff;
  return "#" + rgb.toString(16).padStart(6, "0");
}

export function argbAlpha(argb: number): number {
  return ((argb >>> 24) & 0xff) / 255;
}

export function hexAndAlphaToArgb(hex: string, alpha: number): number {
  const clean = hex.replace("#", "");
  const rgb = parseInt(clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean, 16) & 0x00ffffff;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return ((a << 24) | rgb) >>> 0;
}

/** CSS `rgba(...)` for previewing an ARGB int (alpha preserved). */
export function argbToCss(argb: number): string {
  const a = argbAlpha(argb);
  const r = (argb >>> 16) & 0xff;
  const g = (argb >>> 8) & 0xff;
  const b = argb & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// ---------------------------------------------------------------------------
// Schedule resolution — 1:1 with the Dart `occursOn`.
// ---------------------------------------------------------------------------

function eventDayToDate(d: EventDay): Date {
  return new Date(d.y, d.m - 1, d.d);
}

function dateToEventDay(dt: Date): EventDay {
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

/** Nth weekday of a month, or null when it doesn't exist (e.g. a 5th). */
export function nthWeekdayDate(year: number, month: number, weekday: number, ordinal: number): Date | null {
  // weekday: 1=Mon..7=Sun (Dart convention). JS getDay(): 0=Sun..6=Sat.
  const jsTarget = weekday === 7 ? 0 : weekday;
  if (ordinal === -1) {
    const lastDay = new Date(year, month, 0); // day 0 of next month = last of this
    const diff = (lastDay.getDay() - jsTarget + 7) % 7;
    return new Date(year, month - 1, lastDay.getDate() - diff);
  }
  const first = new Date(year, month - 1, 1);
  const firstDiff = (jsTarget - first.getDay() + 7) % 7;
  const dayNum = 1 + firstDiff + (ordinal - 1) * 7;
  const candidate = new Date(year, month - 1, dayNum);
  if (candidate.getMonth() !== month - 1) return null;
  return candidate;
}

export function scheduleOccursOn(s: EventSchedule, day: EventDay): boolean {
  const target = eventDayToDate(day);
  switch (s.type) {
    case "fixedDate": {
      for (const y of [day.y - 1, day.y, day.y + 1]) {
        const anchor = new Date(y, s.month - 1, s.day);
        const start = new Date(anchor); start.setDate(start.getDate() - s.leadDays);
        const end = new Date(anchor); end.setDate(end.getDate() + s.trailDays);
        if (target >= start && target <= end) return true;
      }
      return false;
    }
    case "nthWeekday": {
      const d = nthWeekdayDate(day.y, s.month, s.weekday, s.ordinal);
      return !!d && d.getMonth() === day.m - 1 && d.getDate() === day.d;
    }
    case "dateWindow": {
      const wraps = s.endMonth < s.startMonth ||
        (s.endMonth === s.startMonth && s.endDay < s.startDay);
      for (const y of [day.y - 1, day.y]) {
        const start = new Date(y, s.startMonth - 1, s.startDay);
        const end = wraps
          ? new Date(y + 1, s.endMonth - 1, s.endDay)
          : new Date(y, s.endMonth - 1, s.endDay);
        if (target >= start && target <= end) return true;
      }
      return false;
    }
    case "perYearDates": {
      const r = s.ranges[String(day.y)];
      if (!r) return false;
      return target >= eventDayToDate(r.start) && target <= eventDayToDate(r.end);
    }
    case "computed":
      // fridayThe13th
      return day.d === 13 && eventDayToDate(day).getDay() === 5;
  }
}

/** The next local-midnight date on which the event is active, from `from`
 *  (inclusive), scanning up to `horizonDays`. Null if none within the horizon. */
export function nextOccurrence(e: EventTheme, from: Date = new Date(), horizonDays = 366): Date | null {
  for (let i = 0; i <= horizonDays; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (scheduleOccursOn(e.schedule, dateToEventDay(d))) return d;
  }
  return null;
}

/** Whether the event is active exactly today. */
export function isActiveToday(e: EventTheme, now: Date = new Date()): boolean {
  return scheduleOccursOn(e.schedule, dateToEventDay(now));
}

// ---------------------------------------------------------------------------
// Human-readable schedule summary (for the Studio list).
// ---------------------------------------------------------------------------

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", [-1]: "last" };

export function scheduleSummary(s: EventSchedule): string {
  switch (s.type) {
    case "fixedDate": {
      const base = `${MONTHS[s.month]} ${s.day}`;
      const window = s.leadDays || s.trailDays
        ? ` (±${Math.max(s.leadDays, s.trailDays)}d)` : "";
      return `${base}${window}, yearly`;
    }
    case "nthWeekday":
      return `${ORDINALS[s.ordinal] ?? s.ordinal} ${WEEKDAYS[s.weekday]} of ${MONTHS[s.month]}`;
    case "dateWindow":
      return `${MONTHS[s.startMonth]} ${s.startDay} → ${MONTHS[s.endMonth]} ${s.endDay}`;
    case "perYearDates": {
      const years = Object.keys(s.ranges).sort();
      return `Per-year dates (${years.length ? years.join(", ") : "none set"})`;
    }
    case "computed":
      return s.kind === "fridayThe13th" ? "Every Friday the 13th" : s.kind;
  }
}

/** True when a PerYearDates schedule is missing a mapping for `year`. */
export function perYearMissing(s: EventSchedule, year: number): boolean {
  return s.type === "perYearDates" && !s.ranges[String(year)];
}
