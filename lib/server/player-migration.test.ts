import { expect, it } from "vitest";
import { migrateLegacyProgress } from "@/lib/server/player-migration";

const now = Date.parse("2026-10-07T10:00:00Z");

it("preserves existing cloud rewards and completion history while normalizing legacy achievement formats", () => {
  const raw = { xp: 900, gems: 73, hearts: 3, completedPuzzleIds: ["one", "two", "one"], tier: "premium",
    subscriptionExpiry: now + 86400000, timeZone: "Asia/Kolkata", achievements: { first_challenge: 1, injected: 1 } };
  const result = migrateLegacyProgress(raw, now);
  expect(result).toMatchObject({ xp: 900, gems: 73, hearts: 3, tier: "premium", subscriptionExpiry: now + 86400000,
    timeZone: "Asia/Kolkata", completedPuzzleIds: ["one", "two"], achievements: [{ id: "first_challenge", unlockedAt: now }] });
  expect(result.level).toBe(5);
  expect(raw.completedPuzzleIds).toEqual(["one", "two", "one"]);
});

it("does not import client-supplied quest reward amounts or targets", () => {
  const migrated = migrateLegacyProgress({ dailyQuests: [{ id: "earn-xp", progress: 10000, target: 1, reward: 1000000 }], lastQuestRefresh: "Wed Oct 07 2026" }, now);
  expect(migrated.dailyQuests.find((q) => q.id === "earn-xp")).toMatchObject({ target: 50, reward: 20, progress: 50 });
});

it("requires review of malformed or future-dated records instead of silently overwriting them", () => {
  for (const raw of [{ xp: "100" }, { gems: -1 }, { hearts: 200 }, { xp: Infinity }, { lastActiveDate: "Fri Oct 09 2026" }]) {
    expect(() => migrateLegacyProgress(raw, now)).toThrow();
  }
});

it("preserves an array-form achievement timestamp and expires a legacy subscription using server time", () => {
  expect(migrateLegacyProgress({ achievements: [{ id: "first_challenge", unlockedAt: now - 1000 }],
    tier: "premium", subscriptionExpiry: now - 1 }, now)).toMatchObject({ tier: "free", achievements: [{ id: "first_challenge", unlockedAt: now - 1000 }] });
});
