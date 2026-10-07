import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicEvent, publicEventConfig } from "@/lib/events/public-event";
import { SEED_EVENTS as PUBLIC_EVENTS } from "@/lib/events/event-seed";
import { SEED_EVENTS } from "@/lib/server/event-seed";
import { authoredEventConfig } from "@/lib/server/event-config";

describe("Moment answer privacy", () => {
  it("publishes only prompts and options, including for every seeded question", () => {
    expect(PUBLIC_EVENTS).toHaveLength(SEED_EVENTS.length);
    for (const raw of SEED_EVENTS) {
      const projected = publicEvent(raw);
      expect(projected).toEqual(PUBLIC_EVENTS.find((event) => event.id === raw.id));
      expect(projected.question).not.toHaveProperty("correctIndex");
      expect(projected.question).not.toHaveProperty("factoid");
      expect(projected.question?.prompt).toBe(raw.question?.prompt);
      expect(projected.question?.options).toEqual(raw.question?.options);
    }
  });

  it("allowlists nested config fields rather than deleting known secrets", () => {
    const raw = structuredClone(SEED_EVENTS[0]);
    Object.assign(raw, { privateNotes: "secret" });
    Object.assign(raw.question!, { futureAnswerField: "secret" });
    Object.assign(raw.lightPalette, { secret: "secret" });
    Object.assign(raw.schedule, { secret: "secret" });
    const json = JSON.stringify(publicEventConfig({ seasonalThemesEnabled: false, events: [raw], updatedAt: 123 }));
    expect(json).not.toContain("secret");
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("factoid");
    expect(JSON.parse(json).seasonalThemesEnabled).toBe(false);
  });

  it("retains authored answers only in server config and admin seed", () => {
    const changed = structuredClone(SEED_EVENTS[0]);
    changed.question!.correctIndex = 0;
    changed.question!.factoid = "Admin explanation";
    const config = authoredEventConfig({ events: [changed] });
    expect(config.events[0].question?.factoid).toBe("Admin explanation");
    expect(config.events).toHaveLength(SEED_EVENTS.length);
    expect(readFileSync("lib/server/event-seed.ts", "utf8")).toContain('import "server-only"');
    const publicSeed = readFileSync("lib/events/event-seed.ts", "utf8");
    expect(publicSeed).not.toContain("correctIndex");
    expect(publicSeed).not.toContain("factoid");
    expect(publicSeed).not.toContain("lib/server");
  });
});
