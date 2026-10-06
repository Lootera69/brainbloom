import { beforeEach, afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("@/services/user-service", () => ({ loadUserData: mocks.load, saveUserData: mocks.save }));

let store: typeof import("@/store/user-store").useUserStore;
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.load.mockReset(); mocks.save.mockReset();
  store = (await import("@/store/user-store")).useUserStore;
  store.getState().logout();
  store.setState({ userId: "owner", isGuest: false, isAuthenticated: true, xp: 300 });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("blocks sync until the account has a confirmed server read", async () => {
  store.getState().syncToFirestore();
  await vi.dynamicImportSettled();
  expect(mocks.save).not.toHaveBeenCalled();
  mocks.load.mockRejectedValue(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().syncToFirestore();
  await vi.dynamicImportSettled();
  expect(store.getState().xp).toBe(300);
  expect(mocks.save).not.toHaveBeenCalled();
});

it("loads real cloud progress before allowing subsequent writes", async () => {
  mocks.load.mockResolvedValue({ xp: 1000, gems: 80 });
  await store.getState().loadFromFirestore();
  expect(store.getState().xp).toBe(1000);
  store.getState().syncToFirestore();
  await vi.dynamicImportSettled();
  expect(mocks.save).toHaveBeenCalledWith("owner", expect.objectContaining({ xp: 1000, gems: 80 }));
});

it("initializes a profile only when the server confirms it does not exist", async () => {
  mocks.load.mockResolvedValue(null);
  await store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  expect(mocks.save).toHaveBeenCalledWith("owner", expect.objectContaining({ xp: 300 }));
});

it("does not apply a late cloud read after logout", async () => {
  let resolve!: (data: object) => void;
  mocks.load.mockReturnValue(new Promise(r => { resolve = r; }));
  const pending = store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  store.getState().logout();
  resolve({ xp: 1000 });
  await pending;
  expect(store.getState().userId).toBe("");
  expect(store.getState().xp).toBe(0);
  expect(mocks.save).not.toHaveBeenCalled();
});

it("cancels a scheduled cloud write when the user signs out", async () => {
  mocks.load.mockResolvedValue({ xp: 1000 });
  await store.getState().loadFromFirestore();
  mocks.save.mockClear();
  store.getState().syncToFirestore();
  store.getState().logout();
  await vi.dynamicImportSettled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("keeps only new local progress when retrying a failed read against a newer cloud profile", async () => {
  store.setState({ gems: 20, hearts: 5, completedPuzzleIds: ["old"], updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().addXp(25);
  store.getState().addGems(5);
  store.getState().useHeart();
  store.getState().markPuzzleCompleted("offline");
  store.getState().setTheme("dark");
  expect(mocks.save).not.toHaveBeenCalled();

  mocks.load.mockResolvedValue({ xp: 1000, gems: 80, hearts: 3, completedPuzzleIds: ["cloud"], theme: "light", updatedAt: 2 });
  await store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  expect(store.getState()).toMatchObject({ xp: 1025, gems: 85, hearts: 2, theme: "dark", cloudRestoreBase: null });
  expect(store.getState().completedPuzzleIds).toEqual(["cloud", "offline"]);
  expect(mocks.save).toHaveBeenLastCalledWith("owner", expect.objectContaining({ xp: 1025, gems: 85, hearts: 2 }));
});

it("preserves changes made while a successful read is in flight", async () => {
  let resolve!: (data: object) => void;
  mocks.load.mockReturnValue(new Promise(r => { resolve = r; }));
  const pending = store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  store.getState().addXp(40);
  store.getState().addGems(3);
  store.getState().setAvatarId("fox");
  resolve({ xp: 700, gems: 90, avatarId: "owl", updatedAt: 2 });
  await pending;
  await vi.dynamicImportSettled();
  expect(store.getState()).toMatchObject({ xp: 740, gems: 93, avatarId: "fox" });
  expect(mocks.save).toHaveBeenLastCalledWith("owner", expect.objectContaining({ xp: 740, gems: 93 }));
});

it("does not let a local rollover timestamp replace a newer cloud profile", async () => {
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  store.setState({ lastActiveDate: yesterday, gems: 20, updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().checkStreak(false);
  store.getState().setTheme("dark");
  expect(store.getState().updatedAt).toBeGreaterThan(2);
  mocks.load.mockResolvedValue({ xp: 1000, gems: 80, theme: "light", lastActiveDate: new Date().toDateString(), updatedAt: 2 });
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 1000, gems: 80, theme: "dark" });
});

it("persists the failed-read baseline so a reload can still reconcile pending changes", async () => {
  store.setState({ gems: 20, updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().addXp(25);
  const saved = JSON.parse(vi.mocked(localStorage.setItem).mock.calls.at(-1)![1]).state;
  expect(saved.cloudRestoreBase.xp).toBe(300);
  vi.resetModules();
  store = (await import("@/store/user-store")).useUserStore;
  store.setState(saved);
  mocks.load.mockResolvedValue({ xp: 1000, gems: 80, updatedAt: 2 });
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 1025, gems: 80, cloudRestoreBase: null });
});

it("applies pending spending as a delta and retains cloud-only completion records", async () => {
  store.setState({ gems: 250, streakFreezes: 1, completedPuzzleIds: ["old"], updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  expect(store.getState().buyStreakFreeze()).toBe(true);
  mocks.load.mockResolvedValue({ xp: 1000, gems: 500, streakFreezes: 4, completedPuzzleIds: ["cloud"], updatedAt: 2 });
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ gems: 300, streakFreezes: 5, completedPuzzleIds: ["cloud"] });
});

it("retains existing reconciliation for a local snapshot already newer before the read", async () => {
  store.setState({ xp: 900, gems: 60, updatedAt: 20 });
  mocks.load.mockResolvedValue({ xp: 100, gems: 5, updatedAt: 10 });
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 900, gems: 60, cloudRestoreBase: null });
});

it("applies daily and weekly progress to the matching period without subtracting expired progress", async () => {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  store.setState({ lastActiveDate: yesterday, xpToday: 100, lastQuestRefresh: yesterday,
    puzzlesPlayedToday: 1, puzzlesPlayedDate: yesterday, weeklyXp: 100,
    weeklyStartDate: Date.now() - 7 * 86400000, updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().checkStreak(false);
  store.getState().checkWeeklyReset();
  store.getState().addXp(20);
  store.getState().incrementPuzzlePlayed();
  mocks.load.mockResolvedValue({ xp: 5000, lastActiveDate: today, lastQuestRefresh: today,
    xpToday: 40, weeklyStartDate: Date.now(), weeklyXp: 80,
    puzzlesPlayedDate: today, puzzlesPlayedToday: 1, updatedAt: 2 });
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 5020, xpToday: 60, weeklyXp: 100, puzzlesPlayedToday: 2 });
});

it("retains a repeated daily puzzle ID after the day changes and preserves a cloud heart-loss flag", async () => {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  store.setState({ dailySetDate: yesterday, dailySetCompletedIds: ["daily"], dailySetHeartLost: false, updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().recordDailySetProgress("daily");
  mocks.load.mockResolvedValue({ dailySetDate: today, dailySetCompletedIds: ["cloud"], dailySetHeartLost: true, updatedAt: 2 });
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ dailySetCompletedIds: ["cloud", "daily"], dailySetHeartLost: true });
});

it("starts cloud restoration during synchronous storage hydration before app mutations", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ state: { userId: "owner", isGuest: false, isAuthenticated: true, xp: 300, updatedAt: 1 } }),
    setItem: vi.fn(), removeItem: vi.fn(),
  });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  vi.resetModules();
  store = (await import("@/store/user-store")).useUserStore;
  await vi.dynamicImportSettled();
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(store.getState().cloudRestoreBase).toMatchObject({ userId: "owner", xp: 300, updatedAt: 1 });
  store.getState().addXp(25);
  mocks.load.mockResolvedValue({ xp: 1000, updatedAt: 2 });
  await store.getState().loadFromFirestore();
  expect(store.getState().xp).toBe(1025);
});
