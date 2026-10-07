import type { EventConfigDoc, EventTheme, EventPalette, EventSchedule } from "./event-theme";

function palette(value: EventPalette): EventPalette {
  return { orb1: value.orb1, orb2: value.orb2, orb3: value.orb3, accent: value.accent,
    onAccent: value.onAccent, bannerFrom: value.bannerFrom, bannerTo: value.bannerTo };
}

function schedule(value: EventSchedule): EventSchedule {
  switch (value.type) {
    case "fixedDate": return { type: value.type, month: value.month, day: value.day, leadDays: value.leadDays, trailDays: value.trailDays };
    case "nthWeekday": return { type: value.type, month: value.month, weekday: value.weekday, ordinal: value.ordinal };
    case "dateWindow": return { type: value.type, startMonth: value.startMonth, startDay: value.startDay, endMonth: value.endMonth, endDay: value.endDay };
    case "perYearDates": return { type: value.type, ranges: Object.fromEntries(Object.entries(value.ranges).map(([year, range]) => [year, {
      start: { y: range.start.y, m: range.start.m, d: range.start.d }, end: { y: range.end.y, m: range.end.m, d: range.end.d },
    }])) };
    case "computed": return { type: value.type, kind: value.kind };
  }
}

export function publicEvent(value: EventTheme): EventTheme {
  return {
    id: value.id, title: value.title, short: value.short, emoji: value.emoji, tier: value.tier,
    schedule: schedule(value.schedule), lightPalette: palette(value.lightPalette), darkPalette: palette(value.darkPalette),
    bannerCopy: value.bannerCopy, particle: value.particle, priority: value.priority,
    ...(value.bannerSubtitle !== undefined ? { bannerSubtitle: value.bannerSubtitle } : {}),
    ...(value.puzzleCategory !== undefined ? { puzzleCategory: value.puzzleCategory } : {}),
    ...(value.pinnedPuzzleId !== undefined ? { pinnedPuzzleId: value.pinnedPuzzleId } : {}),
    ...(value.question ? { question: { kicker: value.question.kicker, prompt: value.question.prompt,
      options: value.question.options.map((option) => String(option)), xp: value.question.xp } } : {}),
  };
}

export type PublicEventConfig = Omit<EventConfigDoc, "events"> & { events: EventTheme[] };

export function publicEventConfig(value: PublicEventConfig): PublicEventConfig {
  return { seasonalThemesEnabled: value.seasonalThemesEnabled, updatedAt: value.updatedAt, events: value.events.map(publicEvent) };
}
