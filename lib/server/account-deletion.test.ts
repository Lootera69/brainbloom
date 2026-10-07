import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/account/route";

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  events: [] as string[],
  authExists: true,
  fail: "",
  verify: vi.fn(),
}));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => ({}) }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({
  verifyIdToken: state.verify,
  deleteUser: async (uid: string) => {
    state.events.push(`auth:${uid}`);
    if (state.fail === "auth") throw new Error("unavailable");
    if (!state.authExists) throw { code: "auth/user-not-found" };
    state.authExists = false;
  },
}) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => {
  const doc = (path: string) => ({ path,
    get: async () => ({ exists: state.docs.has(path), data: () => state.docs.get(path) }),
    set: async (value: Record<string, unknown>) => {
      if (state.fail === "complete") throw new Error("unavailable");
      state.events.push(`complete:${path}`); state.docs.set(path, value);
    },
    delete: async () => { state.events.push(`delete:${path}`); state.docs.delete(path); },
  });
  return {
    doc,
    collection: (name: string) => ({ where: (field: string, op: string, value: string) => ({ get: async () => ({
      docs: [...state.docs].filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
        .map(([path]) => ({ ref: doc(path) })),
    }) }) }),
    recursiveDelete: async (ref: { path: string }) => {
      state.events.push(`recursive:${ref.path}`);
      if (state.fail === "cleanup") throw new Error("unavailable");
      for (const path of state.docs.keys()) if (path === ref.path || path.startsWith(`${ref.path}/`)) state.docs.delete(path);
    },
    runTransaction: async (fn: (tx: object) => Promise<void>) => fn({
      get: (ref: ReturnType<typeof doc>) => ref.get(),
      create: (ref: ReturnType<typeof doc>, value: Record<string, unknown>) => {
        state.events.push(`lock:${ref.path}`); state.docs.set(ref.path, value);
      },
    }),
  };
} }));

const request = (bearer: string | null = "valid", uid = "victim") => new Request(`https://example.test/api/account?uid=${uid}`, {
  method: "DELETE", headers: bearer === null ? {} : { Authorization: `Bearer ${bearer}` }, body: JSON.stringify({ uid }),
});
beforeEach(() => {
  state.docs.clear(); state.events = []; state.authExists = true; state.fail = "";
  state.docs.set("users/owner", { xp: 30 });
  state.docs.set("users/owner/pushTokens/phone", { token: "test" });
  state.docs.set("users/owner/nested/doc/children/child", { retained: false });
  state.docs.set("users/victim", { xp: 900 });
  state.docs.set("staffAccess/owner", { role: "contributor", enabled: true });
  state.docs.set("staffInvites/owner", { email: "owner@example.test" });
  state.docs.set("staffInvites/other", { email: "other@example.test" });
  state.verify.mockReset().mockImplementation(async (_token, revoked) => {
    if (revoked && !state.authExists) throw { code: "auth/user-not-found" };
    return { uid: "owner", email: "owner@example.test", email_verified: true, auth_time: Math.floor(Date.now() / 1000) };
  });
});

describe("account deletion", () => {
  it("does not cancel invitations using an unverified email claim", async () => {
    state.verify.mockResolvedValue({ uid: "owner", email: "owner@example.test", email_verified: false, auth_time: Math.floor(Date.now() / 1000) });
    expect((await DELETE(request())).status).toBe(200);
    expect(state.docs.has("users/owner")).toBe(false);
    expect(state.docs.has("staffInvites/owner")).toBe(true);
  });
  it.each([null, "malformed token"])("rejects missing/malformed authentication: %s", async (token) => {
    expect((await DELETE(request(token))).status).toBe(401);
    expect(state.events).toEqual([]);
  });
  it.each(["forged", "expired", "revoked", "disabled"])("rejects %s tokens before mutation", async (token) => {
    state.verify.mockRejectedValue({ code: `auth/${token}` });
    expect((await DELETE(request(token))).status).toBe(401);
    expect(state.events).toEqual([]);
  });
  it.each([undefined, NaN, 0, Math.floor(Date.now() / 1000) + 3600])("requires recent authentication: %s", async (auth_time) => {
    state.verify.mockResolvedValue({ uid: "owner", auth_time });
    const response = await DELETE(request());
    expect(response.status).toBe(401);
    expect((await response.json()).needsReauth).toBe(true);
    expect(state.events).toEqual([]);
  });
  it("deletes only the token owner and all descendants before deleting authentication", async () => {
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.verify).toHaveBeenCalledWith("valid", true);
    expect(state.events[0]).toBe("lock:accountDeletions/owner");
    expect(state.events.indexOf("recursive:users/owner")).toBeLessThan(state.events.indexOf("auth:owner"));
    expect([...state.docs.keys()].some(path => path.startsWith("users/owner"))).toBe(false);
    expect(state.docs.has("users/victim")).toBe(true);
    expect(state.docs.has("staffAccess/owner")).toBe(false);
    expect(state.docs.has("staffInvites/owner")).toBe(false);
    expect(state.docs.has("staffInvites/other")).toBe(true);
    expect(state.docs.get("accountDeletions/owner")?.status).toBe("complete");
  });
  it("keeps authentication and a retry marker when recursive cleanup fails", async () => {
    state.fail = "cleanup";
    expect((await DELETE(request())).status).toBe(503);
    expect(state.authExists).toBe(true);
    expect(state.events).not.toContain("auth:owner");
    expect(state.docs.get("accountDeletions/owner")?.status).toBe("pending");
    state.fail = "";
    expect((await DELETE(request())).status).toBe(200);
  });
  it("retries after authentication deletion fails", async () => {
    state.fail = "auth";
    expect((await DELETE(request())).status).toBe(503);
    state.fail = "";
    expect((await DELETE(request())).status).toBe(200);
  });
  it("recovers when authentication was deleted but recording completion failed", async () => {
    state.fail = "complete";
    expect((await DELETE(request())).status).toBe(503);
    expect(state.authExists).toBe(false);
    state.fail = "";
    expect((await DELETE(request())).status).toBe(200);
    const events = [...state.events];
    expect((await DELETE(request())).status).toBe(200);
    expect(state.events).toEqual(events);
  });
  it("does not authorize an unknown deleted account without an existing deletion", async () => {
    state.authExists = false;
    expect((await DELETE(request())).status).toBe(401);
    expect(state.events).toEqual([]);
  });
});

it('allows an old anonymous session to delete only its own cloud progress without a password', async () => {
  state.verify.mockResolvedValue({ uid: 'owner', auth_time: 1, firebase: { sign_in_provider: 'anonymous' } });
  expect((await DELETE(request())).status).toBe(200);
  expect(state.verify).toHaveBeenCalledWith('valid', true);
  expect(state.docs.has('users/owner')).toBe(false);
  expect(state.docs.has('users/victim')).toBe(true);
});

it('does not allow a revoked anonymous session to delete data', async () => {
  state.verify.mockImplementation(async (_token, revoked) => {
    if (revoked) throw { code: 'auth/id-token-revoked' };
    return { uid: 'owner', auth_time: 1, firebase: { sign_in_provider: 'anonymous' } };
  });
  expect((await DELETE(request())).status).toBe(401);
  expect(state.events).toEqual([]);
});
