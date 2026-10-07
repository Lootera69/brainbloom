import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { signInStaff, staffHeaders, watchStaffSession } from "@/services/staff-session";
const mocks = vi.hoisted(() => ({
  user: { uid: "person", displayName: "Ada", email: "ada@example.test", emailVerified: true, getIdToken: vi.fn(async () => "signed-token") },
  data: undefined as Record<string, unknown> | undefined,
  onAuth: vi.fn(), onSnapshot: vi.fn(), unsubscribeAuth: vi.fn(), unsubscribeAccess: vi.fn(), fetch: vi.fn(),
}));
vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ db: {}, auth: { currentUser: mocks.user } }) }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {}, signInWithEmailAndPassword: async () => ({ user: mocks.user }),
  signInWithPopup: async () => ({ user: mocks.user }), signOut: vi.fn(), onIdTokenChanged: mocks.onAuth,
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, name: string, uid: string) => `${name}/${uid}`,
  getDoc: async () => ({ exists: () => mocks.data !== undefined, data: () => mocks.data }), onSnapshot: mocks.onSnapshot,
}));
beforeEach(() => {
  vi.clearAllMocks(); mocks.data = undefined; mocks.user.emailVerified = true;
  mocks.fetch.mockReset();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());
it("does not grant an ordinary signed-in account Studio access without an invitation", async () => {
  await expect(signInStaff("person@example.test", "password", "")).rejects.toThrow("invitation code");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("requires verified email before membership lookup or API calls", async () => {
  mocks.user.emailVerified = false; mocks.data = { role: "admin", enabled: true };
  await expect(signInStaff("person@example.test", "password", "code")).rejects.toThrow("Verify your email");
  await expect(staffHeaders()).rejects.toThrow("verified email");
});
it("restores a joined account's actual role", async () => {
  mocks.data = { role: "contributor", enabled: true };
  expect(await signInStaff("person@example.test", "password", "")).toEqual({ uid: "person", role: "contributor", displayName: "Ada" });
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("does not redeem invitations to reactivate a frozen member", async () => {
  mocks.data = { role: "admin", enabled: false };
  await expect(signInStaff("person@example.test", "password", "another-code")).rejects.toThrow("frozen");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("restores a reviewer's actual role without another invitation", async () => {
  mocks.data = { role: "reviewer", enabled: true, status: "active" };
  expect(await signInStaff("person@example.test", "password", "")).toEqual({ uid: "person", role: "reviewer", displayName: "Ada" });
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("blocks frozen membership even when a stale enabled flag remains true", async () => {
  mocks.data = { role: "reviewer", enabled: true, status: "frozen" };
  await expect(signInStaff("person@example.test", "password", "new-code")).rejects.toThrow("frozen");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("requires a fresh invitation for a removed member", async () => {
  mocks.data = { role: "contributor", enabled: false, status: "removed" };
  await expect(signInStaff("person@example.test", "password", "")).rejects.toThrow("invitation code");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("accepts a removed member only after server redemption and a confirmed membership read", async () => {
  mocks.data = { role: "contributor", enabled: false, status: "removed" };
  mocks.fetch.mockImplementation(async () => {
    mocks.data = { role: "reviewer", enabled: true, status: "active" };
    return { ok: true, json: async () => ({ ok: true }) };
  });
  expect(await signInStaff("person@example.test", "password", "fresh-code")).toEqual({ uid: "person", role: "reviewer", displayName: "Ada" });
  expect(mocks.fetch).toHaveBeenCalledWith("/api/studio/access", expect.objectContaining({ body: JSON.stringify({ code: "fresh-code" }) }));
});
it("does not trust redemption success until active access can be read", async () => {
  mocks.data = { role: "contributor", enabled: false, status: "removed" };
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  await expect(signInStaff("person@example.test", "password", "fresh-code")).rejects.toThrow("could not be confirmed");
});
it("sends a real Firebase token for redemption and respects rejection", async () => {
  mocks.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: "Invitation rejected" }) });
  await expect(signInStaff("person@example.test", "password", "random-code")).rejects.toThrow("Invitation rejected");
  expect(mocks.fetch).toHaveBeenCalledWith("/api/studio/access", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer signed-token" }) }));
});
it("clears UI authority on token changes and registry revocation and unsubscribes", () => {
  let changed: (user: typeof mocks.user | null) => void = () => {};
  let snapshot: (snap: { data: () => object }) => void = () => {};
  mocks.onAuth.mockImplementation((_auth, fn) => { changed = fn; return mocks.unsubscribeAuth; });
  mocks.onSnapshot.mockImplementation((_ref, fn) => { snapshot = fn; return mocks.unsubscribeAccess; });
  const callback = vi.fn(); const stop = watchStaffSession(callback);
  changed(mocks.user); expect(callback).toHaveBeenLastCalledWith(null);
  snapshot({ data: () => ({ role: "admin", enabled: true }) }); expect(callback).toHaveBeenLastCalledWith({ uid: "person", role: "admin", displayName: "Ada" });
  snapshot({ data: () => ({ role: "admin", enabled: false }) }); expect(callback).toHaveBeenLastCalledWith(null);
  snapshot({ data: () => ({ role: "reviewer", enabled: true, status: "active" }) }); expect(callback).toHaveBeenLastCalledWith({ uid: "person", role: "reviewer", displayName: "Ada" });
  snapshot({ data: () => ({ role: "reviewer", enabled: true, status: "frozen" }) }); expect(callback).toHaveBeenLastCalledWith(null);
  snapshot({ data: () => ({ role: "reviewer", enabled: true, status: "removed" }) }); expect(callback).toHaveBeenLastCalledWith(null);
  changed(null); expect(mocks.unsubscribeAccess).toHaveBeenCalled();
  stop(); expect(mocks.unsubscribeAuth).toHaveBeenCalled();
});
