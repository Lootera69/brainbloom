import { describe, it, expect } from "vitest";
import {
  mergeGuestProgress,
  hasMeaningfulGuestData,
  guestMergeSummary,
  type GuestMergeData,
} from "./user-merge";

const act = (id: string, timestamp: number) => ({ id, type: "daily" as const, category: "logic", title: id, xp: 10, timestamp });

const base = (over: Partial<GuestMergeData> = {}): GuestMergeData => ({
  xp: 0,
  gems: 0,
  streak: 0,
  streakFreezes: 0,
  level: 1,
  weeklyXp: 0,
  dailyPuzzleStreak: 0,
  cipherSolveCount: 0,
  xpToday: 0,
  puzzlesPlayedToday: 0,
  hearts: 5,
  nextHeartAt: null,
  completedPuzzleIds: [],
  experiencedWonderIds: [],
  questsRewarded: [],
  activeDates: [],
  frozenDays: [],
  brokenDays: [],
  history: [],
  achievements: [],
  ...over,
});

describe("hasMeaningfulGuestData", () => {
  it("returns false for an empty guest", () => {
    expect(hasMeaningfulGuestData(base())).toBe(false);
  });

  it("returns true when XP was earned", () => {
    expect(hasMeaningfulGuestData(base({ xp: 50 }))).toBe(true);
  });

  it("returns true when puzzles were completed", () => {
    expect(hasMeaningfulGuestData(base({ completedPuzzleIds: ["p1"] }))).toBe(true);
  });

  it("returns true when gems were earned", () => {
    expect(hasMeaningfulGuestData(base({ gems: 10 }))).toBe(true);
  });

  it("returns true for achievements and wonders", () => {
    expect(hasMeaningfulGuestData(base({ achievements: [{ id: "a1", unlockedAt: 1 }] }))).toBe(true);
    expect(hasMeaningfulGuestData(base({ experiencedWonderIds: ["w1"] }))).toBe(true);
  });
});

describe("mergeGuestProgress", () => {
  it("keeps the larger value for monotonic counters", () => {
    const local = base({ xp: 300, gems: 80, streak: 9, streakFreezes: 2, level: 4, weeklyXp: 250 });
    const cloud = base({ xp: 500, gems: 40, streak: 3, streakFreezes: 5, level: 5, weeklyXp: 100 });
    const merged = mergeGuestProgress(local, cloud);
    expect(merged.xp).toBe(500);
    expect(merged.gems).toBe(80);
    expect(merged.streak).toBe(9);
    expect(merged.streakFreezes).toBe(5);
    expect(merged.level).toBe(5);
    expect(merged.weeklyXp).toBe(250);
  });

  it("unions id arrays without duplicates", () => {
    const local = base({ completedPuzzleIds: ["a", "b", "c"], experiencedWonderIds: ["w1"] });
    const cloud = base({ completedPuzzleIds: ["b", "c", "d"], experiencedWonderIds: ["w2"] });
    const merged = mergeGuestProgress(local, cloud);
    expect(merged.completedPuzzleIds.sort()).toEqual(["a", "b", "c", "d"]);
    expect(merged.experiencedWonderIds.sort()).toEqual(["w1", "w2"]);
  });

  it("unions date-string arrays", () => {
    const local = base({ activeDates: ["2026-07-01", "2026-07-02"] });
    const cloud = base({ activeDates: ["2026-07-02", "2026-07-03"] });
    expect(mergeGuestProgress(local, cloud).activeDates.sort()).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("unions achievements by id, cloud preferred", () => {
    const local = base({ achievements: [{ id: "a1", unlockedAt: 100 }, { id: "a2", unlockedAt: 200 }] });
    const cloud = base({ achievements: [{ id: "a1", unlockedAt: 900 }] });
    const merged = mergeGuestProgress(local, cloud);
    expect(merged.achievements).toHaveLength(2);
    const a1 = merged.achievements.find((a) => a.id === "a1");
    expect(a1?.unlockedAt).toBe(900);
  });

  it("unions history by id", () => {
    const local = base({ history: [act("h1", 1), act("h2", 2)] });
    const cloud = base({ history: [act("h2", 2), act("h3", 3)] });
    const merged = mergeGuestProgress(local, cloud);
    expect(merged.history.map((h) => h.id).sort()).toEqual(["h1", "h2", "h3"]);
  });

  it("caps hearts at 5 and takes the earlier heart timer", () => {
    const local = base({ hearts: 4, nextHeartAt: 100 });
    const cloud = base({ hearts: 5, nextHeartAt: 300 });
    const merged = mergeGuestProgress(local, cloud);
    expect(merged.hearts).toBe(5);
    expect(merged.nextHeartAt).toBe(100);
  });

  it("handles null timers", () => {
    const merged = mergeGuestProgress(base({ nextHeartAt: 50 }), base({ nextHeartAt: null }));
    expect(merged.nextHeartAt).toBe(50);
    expect(mergeGuestProgress(base(), base()).nextHeartAt).toBeNull();
  });

  it("empty guest + empty cloud stays empty", () => {
    const merged = mergeGuestProgress(base(), base());
    expect(merged.xp).toBe(0);
    expect(merged.completedPuzzleIds).toEqual([]);
  });
});

describe("guestMergeSummary", () => {
  it("summarizes the guest progress", () => {
    const s = guestMergeSummary(
      base({
        xp: 500,
        gems: 30,
        streak: 4,
        completedPuzzleIds: ["a", "b"],
        experiencedWonderIds: ["w"],
        achievements: [{ id: "x", unlockedAt: 1 }],
      }),
    );
    expect(s).toEqual({ xp: 500, gems: 30, streak: 4, puzzles: 2, wonders: 1, achievements: 1 });
  });
});
