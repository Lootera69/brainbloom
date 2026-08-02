import { describe, it, expect } from "vitest";
import {
  dailyCount,
  remainingFreePlays,
  canPlayPuzzleFree,
  isPremiumActive,
} from "@/lib/daily-limit";

const TODAY = "2026-08-01";

describe("dailyCount", () => {
  it("returns playedToday when the date matches", () => {
    expect(dailyCount(2, TODAY, TODAY)).toBe(2);
  });

  it("returns 0 when the date is stale", () => {
    expect(dailyCount(2, "2026-07-31", TODAY)).toBe(0);
  });

  it("returns 0 when the date is null", () => {
    expect(dailyCount(2, null, TODAY)).toBe(0);
  });
});

describe("remainingFreePlays", () => {
  it("starts at the full daily limit", () => {
    expect(remainingFreePlays(0, null, TODAY)).toBe(3);
  });

  it("counts down as puzzles are played", () => {
    expect(remainingFreePlays(2, TODAY, TODAY)).toBe(1);
  });

  it("clamps at zero", () => {
    expect(remainingFreePlays(5, TODAY, TODAY)).toBe(0);
  });

  it("resets on a new day", () => {
    expect(remainingFreePlays(5, "2026-07-31", TODAY)).toBe(3);
  });
});

describe("canPlayPuzzleFree", () => {
  it("allows play under the limit", () => {
    expect(canPlayPuzzleFree(2, TODAY, TODAY)).toBe(true);
  });

  it("blocks at the limit", () => {
    expect(canPlayPuzzleFree(3, TODAY, TODAY)).toBe(false);
  });

  it("allows play after a new day", () => {
    expect(canPlayPuzzleFree(3, "2026-07-31", TODAY)).toBe(true);
  });
});

describe("isPremiumActive", () => {
  it("is false for free tier", () => {
    expect(isPremiumActive("free", null)).toBe(false);
    expect(isPremiumActive("free", Date.now() + 86400000)).toBe(false);
  });

  it("is true for premium without expiry", () => {
    expect(isPremiumActive("premium", null)).toBe(true);
  });

  it("is true for premium with a future expiry", () => {
    expect(isPremiumActive("premium", Date.now() + 86400000)).toBe(true);
  });

  it("is false for an expired premium subscription", () => {
    expect(isPremiumActive("premium", Date.now() - 1000)).toBe(false);
  });
});
