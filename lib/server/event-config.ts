import "server-only";
import { SEED_EVENTS } from "./event-seed";
import type { AuthoredEventTheme, EventConfigDoc } from "@/lib/events/event-theme";

export function authoredEventConfig(value?: Partial<EventConfigDoc>): EventConfigDoc {
  const events = new Map<string, AuthoredEventTheme>(SEED_EVENTS.map((event) => [event.id, event]));
  if (Array.isArray(value?.events)) for (const event of value.events) {
    const question = event.question ?? events.get(event.id)?.question;
    events.set(event.id, { ...event, ...(question ? { question } : {}) });
  }
  return { seasonalThemesEnabled: value?.seasonalThemesEnabled !== false,
    updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : 0, events: [...events.values()] };
}
