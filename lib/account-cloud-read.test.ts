import { beforeEach, expect, it, vi } from "vitest";
import { initialProgress } from "@/lib/server/player-progress";
import type { PlayerResponse } from "@/lib/player-contract";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), send: vi.fn(), ready: vi.fn(), session: 0,
  uid: "owner" as string | null, db: {} as object | null, hasAuth: true,
}));
vi.mock("@/services/firebase", () => ({ getFirebase: () => ({
  db: mocks.db,
  auth: mocks.hasAuth ? {
    get currentUser() { return mocks.uid ? { uid: mocks.uid } : null; },
    authStateReady: mocks.ready,
  } : null,
}) }));
vi.mock("@/store/user-store", () => ({ getUserSessionVersion: () => mocks.session }));
vi.mock("@/services/player-service", () => ({ playerApi: { send: mocks.send } }));
vi.mock("firebase/firestore", () => ({ doc: () => ({}), getDocFromServer: mocks.get, setDoc: vi.fn() }));

let loadUserData: typeof import("@/services/user-service").loadUserData;
const now = Date.parse("2026-10-07T12:00:00Z");

function snapshot(values: Partial<PlayerResponse["progress"]> = {}): PlayerResponse {
  return { progress: { ...initialProgress(now, "Asia/Kolkata"), ...values }, serverTime: now };
}

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.uid = "owner";
  mocks.session = 0;
  mocks.db = {};
  mocks.hasAuth = true;
  mocks.ready.mockResolvedValue(undefined);
  mocks.get.mockResolvedValue({ data: () => ({}) });
  mocks.send.mockResolvedValue(snapshot());
  ({ loadUserData } = await import("@/services/user-service"));
});

it("rejects unavailable server reads instead of reporting a new user", async () => {
  mocks.get.mockRejectedValue(new Error("offline"));
  await expect(loadUserData("owner")).rejects.toThrow("offline");
});

it("restores existing verified balances when the editable profile does not exist", async () => {
  mocks.get.mockResolvedValue({ data: () => undefined });
  mocks.send.mockResolvedValue(snapshot({ xp: 2400, gems: 350, revision: 8, completedPuzzleIds: ["cloud"] }));
  await expect(loadUserData("owner")).resolves.toMatchObject({
    xp: 2400, gems: 350, revision: 8, completedPuzzleIds: ["cloud"], progressVersion: 1,
  });
  expect(mocks.send).toHaveBeenCalledWith({ action: "snapshot", timeZone: expect.any(String) });
});

it("takes rewards and completion history only from the verified snapshot", async () => {
  mocks.get.mockResolvedValue({ data: () => ({
    displayName: "Player", avatarId: "owl", theme: "dark", soundEnabled: false,
    xp: 999999, gems: 999999, hearts: 999999, tier: "premium", revision: 999999,
    completedPuzzleIds: ["forged"], achievements: [{ id: "forged", unlockedAt: now }],
    history: [{ title: "Forged puzzle" }], progressVersion: 999999,
  }) });
  await expect(loadUserData("owner")).resolves.toMatchObject({
    displayName: "Player", avatarId: "owl", theme: "dark", soundEnabled: false,
    xp: 0, gems: 0, hearts: 5, tier: "free", revision: 0, progressVersion: 1,
    completedPuzzleIds: [], achievements: [], history: [],
  });
});

it("does not substitute profile balances when the reward service is unavailable", async () => {
  mocks.get.mockResolvedValue({ data: () => ({ xp: 999999 }) });
  mocks.send.mockRejectedValue(new Error("Reward service unavailable"));
  await expect(loadUserData("owner")).rejects.toThrow("Reward service unavailable");
});

it("waits for Firebase to restore its identity before starting server reads", async () => {
  let finishAuth!: () => void;
  mocks.uid = null;
  mocks.ready.mockReturnValue(new Promise<void>((resolve) => { finishAuth = resolve; }));
  const pending = loadUserData("owner");
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.uid = "owner";
  finishAuth();
  await expect(pending).resolves.toMatchObject({ xp: 0, progressVersion: 1 });
});

it.each([null, "other"])("rejects restored Firebase identity %s before reading an account", async (uid) => {
  mocks.uid = uid;
  await expect(loadUserData("owner")).rejects.toThrow("Sign in to restore progress");
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

it.each(["database", "auth"])("fails closed when Firebase %s is unavailable", async (missing) => {
  if (missing === "database") mocks.db = null;
  else mocks.hasAuth = false;
  await expect(loadUserData("owner")).rejects.toThrow("Sign in to restore progress");
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("rejects a session replaced while Firebase is restoring auth", async () => {
  mocks.ready.mockImplementation(async () => { mocks.session++; });
  await expect(loadUserData("owner")).rejects.toThrow("Sign in to restore progress");
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

it.each(["identity", "session"])("rejects a changed %s while restoring progress", async (changed) => {
  mocks.get.mockImplementation(async () => {
    if (changed === "identity") mocks.uid = "other";
    else mocks.session++;
    return { data: () => ({}) };
  });
  await expect(loadUserData("owner")).rejects.toThrow("sign-in changed");
});

it("retains a newer verified balance when an earlier snapshot finishes late", async () => {
  let finishOlder!: (value: PlayerResponse) => void;
  mocks.send.mockReturnValueOnce(new Promise<PlayerResponse>((resolve) => { finishOlder = resolve; }))
    .mockResolvedValueOnce(snapshot({ xp: 1200, gems: 80, revision: 9 }));
  const older = loadUserData("owner");
  await vi.waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
  await expect(loadUserData("owner")).resolves.toMatchObject({ xp: 1200, gems: 80, revision: 9 });
  finishOlder(snapshot({ xp: 1100, gems: 50, revision: 8 }));
  await expect(older).resolves.toMatchObject({ xp: 1200, gems: 80, revision: 9 });
});

it("keeps verified progress separate for different Firebase identities", async () => {
  mocks.send.mockResolvedValueOnce(snapshot({ xp: 1200, revision: 9 }))
    .mockResolvedValueOnce(snapshot({ xp: 30, revision: 1 }));
  await loadUserData("owner");
  mocks.uid = "other";
  await expect(loadUserData("other")).resolves.toMatchObject({ xp: 30, revision: 1 });
});
