import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), transaction: vi.fn(), weekly: vi.fn() }));
vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ db: {} }) }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => `${collection}/${id}`,
  getDoc: mocks.read, setDoc: mocks.write, runTransaction: mocks.transaction, Timestamp: { fromMillis: (n: number) => n },
}));
vi.mock("@/services/player-content", () => ({
  getPublishedPuzzles: async () => [{ id: "daily", type: "riddle", published: true }, { id: "cipher", type: "cipher", published: true }],
  getPuzzle: async (id: string) => ({ id, type: id === "cipher" ? "cipher" : "riddle", published: true }),
  getWeeklyContent: mocks.weekly,
}));
let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); storage = new Map();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  mocks.read.mockResolvedValue({ exists: () => false });
  mocks.weekly.mockResolvedValue({ puzzle: { id: "cipher", type: "cipher", published: true },
    weekStart: "2026-10-04", phase: "active", setBy: "auto", serverTime: Date.parse("2026-10-07T00:00:00Z") });
});
afterEach(() => vi.unstubAllGlobals());
it("players can pick daily and weekly puzzles and retain history without global writes", async () => {
  const daily = await import("@/services/daily-puzzle");
  const weekly = await import("@/services/weekly-cipher");
  expect((await daily.getDailyPuzzle())?.id).toBe("daily");
  expect((await weekly.getWeeklyCipher())?.id).toBe("cipher");
  expect(await weekly.getCipherHistory()).toHaveLength(1);
  expect(storage.size).toBe(3);
  expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
});
it("server-authored pins remain readable without writing them back", async () => {
  const weekly = await import("@/services/weekly-cipher");
  mocks.weekly.mockResolvedValue({ puzzle: { id: "cipher", type: "cipher", published: true },
    weekStart: "2026-10-04", phase: "hint", setBy: "admin", serverTime: Date.parse("2026-10-09T00:00:00Z") });
  expect((await weekly.getWeeklyCipher())?.id).toBe("cipher");
  expect(weekly.getCipherPhase()).toBe("hint");
  expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
});
