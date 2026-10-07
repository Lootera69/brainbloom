import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { initialProgress } from "@/lib/server/player-progress";

const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), cleanup: vi.fn(), subscribe: vi.fn() }));
vi.mock("@/services/user-service", () => ({ loadUserData: mocks.load, saveUserData: mocks.save }));
vi.mock("@/services/notification-service", () => ({ cleanupPushTokens: mocks.cleanup, subscribeToPush: mocks.subscribe }));

let store: typeof import("@/store/user-store").useUserStore;
const verified = (values: Record<string, unknown> = {}) => ({
  ...initialProgress(Date.now(), "Asia/Kolkata"), progressVersion: 1, ...values,
});
const identity = { uid: "owner", displayName: "Auth Name", email: "owner@example.test", photoURL: "https://example.test/avatar.png" };

beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const mock of Object.values(mocks)) mock.mockReset();
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

it("restores existing server balances before allowing profile sync", async () => {
  const cloud = verified({ revision: 8, xp: 1000, gems: 80, hearts: 2, tier: "premium", subscriptionExpiry: 9999999999999,
    completedPuzzleIds: ["cloud-puzzle"], achievements: [{ id: "earned", unlockedAt: 123 }] });
  mocks.load.mockResolvedValue(cloud);
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject(cloud);
  store.getState().setAvatarId("fox");
  await vi.dynamicImportSettled();
  expect(mocks.save).toHaveBeenCalledWith("owner", expect.objectContaining({ avatarId: "fox", xp: 1000, gems: 80 }));
});

it.each([null, { xp: 1000 }, { ...verified(), progressVersion: undefined }, { ...verified(), revision: -1 }])(
  "does not initialize from missing or unverified data %j", async (data) => {
    mocks.load.mockResolvedValue(data);
    await store.getState().loadFromFirestore();
    store.getState().syncToFirestore();
    await vi.dynamicImportSettled();
    expect(store.getState().xp).toBe(300);
    expect(mocks.save).not.toHaveBeenCalled();
  },
);

it("replaces forged cached revisions and never imports local reward claims", async () => {
  store.setState({ revision: 9999999, xp: 9999999, gems: 999999, tier: "premium", updatedAt: 9999999999999,
    completedPuzzleIds: ["forged"], answeredEventTokens: ["forged-event"] });
  mocks.load.mockResolvedValue(verified({ revision: 3, xp: 40, completedPuzzleIds: ["earned"], answeredEventTokens: ["earned-event"] }));
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ revision: 3, xp: 40, gems: 0, tier: "free", cloudRestoreBase: null,
    completedPuzzleIds: ["earned"], answeredEventTokens: ["earned-event"] });
});

it.each([undefined, null, { xp: 500 }, { ...verified(), version: 0 }])("refuses sign-in without verified progress %j", async (cloudData) => {
  const { getUserSessionVersion } = await import("@/store/user-store");
  const version = getUserSessionVersion();
  const before = store.getState();
  expect(() => store.getState().setUser(identity, { cloudData })).toThrow("verified progress");
  expect(store.getState()).toBe(before);
  expect(getUserSessionVersion()).toBe(version);
});

it("sign-in immediately replaces the previous economy and retains the account profile", () => {
  store.setState({ xp: 999999, gems: 999999, tier: "premium", avatarId: "dragon",
    pendingCelebration: { type: "level-up", title: "Forged" } });
  store.getState().setUser(identity, { cloudData: verified({ revision: 4, xp: 1200, gems: 77, tier: "premium",
    displayName: "Cloud Name", avatarId: "fox", theme: "dark", soundEnabled: false, lastEvalDate: "2026-10-07" }) });
  expect(store.getState()).toMatchObject({ userId: "owner", isGuest: false, isAuthenticated: true, xp: 1200, gems: 77,
    revision: 4, tier: "premium", displayName: "Cloud Name", email: identity.email, photoURL: identity.photoURL,
    avatarId: "fox", theme: "dark", soundEnabled: false, pendingCelebration: null, _lastEvalDate: "2026-10-07" });
});

it("uses the auth profile when the server has no editable profile yet", () => {
  store.getState().setUser(identity, { cloudData: verified({ xp: 560 }) });
  expect(store.getState()).toMatchObject({ displayName: "Auth Name", email: identity.email, photoURL: identity.photoURL, xp: 560 });
});

it("anonymous sign-in starts with the server economy instead of the previous account balance", () => {
  store.setState({ xp: 10000, gems: 500, tier: "premium", completedPuzzleIds: ["old-account"] });
  store.getState().setUser({ ...identity, uid: "anonymous", isAnonymous: true, displayName: "Guest", email: null, photoURL: null },
    { cloudData: verified() });
  expect(store.getState()).toMatchObject({ userId: "anonymous", isGuest: true, isAuthenticated: true, xp: 0, gems: 0,
    tier: "free", completedPuzzleIds: [], email: null, photoURL: null });
});

it.each(["logout", "other-account"])("discards a late cloud read after %s", async (action) => {
  let resolve!: (data: object) => void;
  mocks.load.mockReturnValue(new Promise((done) => { resolve = done; }));
  const pending = store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  if (action === "logout") store.getState().logout();
  else store.getState().setUser({ ...identity, uid: "other" }, { cloudData: verified({ xp: 55 }) });
  resolve(verified({ revision: 99, xp: 1000 }));
  await pending;
  expect(store.getState()).toMatchObject(action === "logout" ? { userId: "", xp: 0 } : { userId: "other", xp: 55 });
  expect(mocks.save).not.toHaveBeenCalled();
});

it("cancels a scheduled profile write when the user signs out", async () => {
  mocks.load.mockResolvedValue(verified({ xp: 1000 }));
  await store.getState().loadFromFirestore();
  mocks.save.mockClear();
  store.getState().syncToFirestore();
  store.getState().logout();
  await vi.dynamicImportSettled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("preserves only editable profile changes when retrying a failed restore", async () => {
  store.setState({ gems: 250, hearts: 5, completedPuzzleIds: ["old"], updatedAt: 1 });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().addXp(25);
  store.getState().addGems(5);
  store.getState().useHeart();
  store.getState().markPuzzleCompleted("offline");
  store.getState().setTheme("dark");
  expect(mocks.save).not.toHaveBeenCalled();
  mocks.load.mockResolvedValue(verified({ revision: 2, xp: 1000, gems: 80, hearts: 3, completedPuzzleIds: ["cloud"], theme: "light" }));
  await store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  expect(store.getState()).toMatchObject({ xp: 1000, gems: 80, hearts: 3, theme: "dark", completedPuzzleIds: ["cloud"], cloudRestoreBase: null });
  expect(mocks.save).toHaveBeenLastCalledWith("owner", expect.objectContaining({ theme: "dark", xp: 1000, gems: 80 }));
});

it("preserves profile edits during a successful read without applying reward deltas", async () => {
  let resolve!: (data: object) => void;
  mocks.load.mockReturnValue(new Promise((done) => { resolve = done; }));
  const pending = store.getState().loadFromFirestore();
  await vi.dynamicImportSettled();
  store.getState().addXp(40);
  store.getState().addGems(3);
  store.getState().setAvatarId("fox");
  resolve(verified({ xp: 700, gems: 90, avatarId: "owl" }));
  await pending;
  await vi.dynamicImportSettled();
  expect(store.getState()).toMatchObject({ xp: 700, gems: 90, avatarId: "fox" });
  expect(mocks.save).toHaveBeenLastCalledWith("owner", expect.objectContaining({ xp: 700, gems: 90, avatarId: "fox" }));
});

it("persists only the profile baseline so reloads retain preferences without economy reconciliation", async () => {
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  store.getState().addXp(25);
  store.getState().setTheme("dark");
  const saved = JSON.parse(vi.mocked(localStorage.setItem).mock.calls.at(-1)![1]).state;
  expect(saved.cloudRestoreBase).toMatchObject({ userId: "owner", theme: "system" });
  expect(saved.cloudRestoreBase).not.toHaveProperty("xp");
  expect(saved.cloudRestoreBase).not.toHaveProperty("gems");
  vi.resetModules();
  store = (await import("@/store/user-store")).useUserStore;
  store.setState(saved);
  mocks.load.mockResolvedValue(verified({ xp: 1000, gems: 80, theme: "light" }));
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 1000, gems: 80, theme: "dark", cloudRestoreBase: null });
});

it("discards old persisted economic reconciliation baselines", async () => {
  store.setState({ cloudRestoreBase: { userId: "owner", xp: 300, gems: 200, theme: "system" }, xp: 400, gems: 0, theme: "dark" });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await store.getState().loadFromFirestore();
  expect(store.getState().cloudRestoreBase).toEqual({ userId: "owner", theme: "system" });
  mocks.load.mockResolvedValue(verified({ xp: 1000, gems: 500, theme: "light" }));
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 1000, gems: 500, theme: "dark" });
});

it("does not roll back progress when a later snapshot has an older server revision", async () => {
  mocks.load.mockResolvedValueOnce(verified({ revision: 5, xp: 900, gems: 60, updatedAt: 10 }));
  await store.getState().loadFromFirestore();
  mocks.load.mockResolvedValueOnce(verified({ revision: 4, xp: 100, gems: 5, updatedAt: 20 }));
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ revision: 5, xp: 900, gems: 60 });
});

it("restores server daily and weekly periods without importing local rollovers", async () => {
  store.setState({ xpToday: 100, weeklyXp: 100, puzzlesPlayedToday: 10, dailySetCompletedIds: ["local"], dailySetHeartLost: false });
  mocks.load.mockResolvedValue(verified({ xp: 5000, xpToday: 40, weeklyXp: 80, puzzlesPlayedToday: 1,
    dailySetCompletedIds: ["cloud"], dailySetHeartLost: true }));
  await store.getState().loadFromFirestore();
  expect(store.getState()).toMatchObject({ xp: 5000, xpToday: 40, weeklyXp: 80, puzzlesPlayedToday: 1,
    dailySetCompletedIds: ["cloud"], dailySetHeartLost: true });
});

it("restores a hydrated account and replaces cached rewards on retry", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ state: { userId: "owner", isGuest: false, isAuthenticated: true, xp: 300, updatedAt: 1 } }),
    setItem: vi.fn(), removeItem: vi.fn(),
  });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  vi.resetModules();
  store = (await import("@/store/user-store")).useUserStore;
  await vi.dynamicImportSettled();
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(store.getState().cloudRestoreBase).toMatchObject({ userId: "owner" });
  expect(store.getState().cloudRestoreBase).not.toHaveProperty("xp");
  store.getState().addXp(25);
  mocks.load.mockResolvedValue(verified({ xp: 1000 }));
  await store.getState().loadFromFirestore();
  expect(store.getState().xp).toBe(1000);
});
