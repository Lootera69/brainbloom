import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireAdmin } from "./staff-auth";
import { newInvite, inviteId, canRedeemInvite } from "./staff-invites";
import { GET as users } from "@/app/api/admin/users/route";
import { POST as notify } from "@/app/api/notify/route";
import { GET as listInvites, POST as createInvite, DELETE as cancelInvite } from "@/app/api/admin/invites/route";
import { POST as redeem } from "@/app/api/studio/access/route";

const state = vi.hoisted(() => ({
  app: {} as object | null,
  documents: new Map<string, Record<string, unknown>>(),
  transactionTail: Promise.resolve() as Promise<unknown>,
  verify: vi.fn(), read: vi.fn(), create: vi.fn(), update: vi.fn(), query: vi.fn(), send: vi.fn(),
}));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => state.app, sendPushToAll: state.send }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: state.verify }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => {
  const ref = (path: string) => ({ path, id: path.split("/").at(-1),
    get: async () => { state.read(path); return { exists: state.documents.has(path), data: () => state.documents.get(path) }; },
    create: async (data: Record<string, unknown>) => { state.create(path, data); state.documents.set(path, data); },
  });
  const collection = (path: string) => {
    const result = { orderBy: () => result, limit: () => result, get: async () => {
      state.query(); return {
        docs: [...state.documents.entries()].filter(([key]) => key.startsWith(`${path}/`))
          .map(([key, data]) => ({ id: key.split("/").at(-1), data: () => data })),
        forEach: (fn: (doc: object) => void) => fn({ id: "player", data: () => ({ email: "private@example.test" }) }),
      };
    } };
    return result;
  };
  return { doc: ref, collection,
    runTransaction: (fn: (tx: object) => Promise<unknown>) => {
      const operation = state.transactionTail.then(async () => {
        const writes: (() => void)[] = [];
        const result = await fn({
          get: (r: ReturnType<typeof ref>) => r.get(),
          set: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => writes.push(() => { state.create(r.path, data); state.documents.set(r.path, data); }),
          update: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => writes.push(() => { state.update(r.path, data); state.documents.set(r.path, { ...state.documents.get(r.path), ...data }); }),
        });
        for (const write of writes) write();
        return result;
      });
      state.transactionTail = operation.then(() => undefined, () => undefined);
      return operation;
    },
  };
} }));

const request = (path = "/api/admin/users", token: string | null = "valid", body?: unknown, method?: string) => new NextRequest(`https://example.test${path}`, {
  method: method ?? (body === undefined ? "GET" : "POST"),
  headers: token === null ? {} : { authorization: `Bearer ${token}` },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
beforeEach(() => {
  vi.clearAllMocks(); state.documents.clear(); state.app = {};
  state.transactionTail = Promise.resolve();
  state.verify.mockReset().mockResolvedValue({ uid: "admin", email: "owner@example.test", email_verified: true });
  state.read.mockReset(); state.send.mockResolvedValue({ delivered: 1, tokenCount: 1 });
  state.documents.set("staffAccess/admin", { role: "admin", enabled: true });
});

describe("administrator authorization", () => {
  it.each([null, "", "malformed token"])("rejects missing/malformed bearer %s", async (token) => {
    expect((await users(request("/api/admin/users?code=legacy-code", token))).status).toBe(401);
    expect(state.query).not.toHaveBeenCalled(); expect(state.read).not.toHaveBeenCalled();
  });
  it.each(["forged", "expired", "revoked", "disabled-user"])("rejects %s tokens before reading data", async (token) => {
    state.verify.mockRejectedValueOnce(new Error(token));
    expect((await users(request(undefined, token))).status).toBe(401);
    expect(state.verify).toHaveBeenCalledWith(token, true); expect(state.read).not.toHaveBeenCalled();
  });
  it("requires a verified email even with an administrator record", async () => {
    state.verify.mockResolvedValue({ uid: "admin", email: "owner@example.test", email_verified: false });
    expect((await users(request())).status).toBe(403); expect(state.query).not.toHaveBeenCalled();
  });
  it.each([undefined, { role: "admin", enabled: false }, { role: "contributor", enabled: true }, { role: "admin" }])("denies missing, disabled and contributor membership %j", async (access) => {
    state.documents.delete("staffAccess/admin");
    if (access) state.documents.set("staffAccess/admin", access);
    state.verify.mockResolvedValue({ uid: "admin", email: "owner@example.test", email_verified: true, admin: true, role: "admin" });
    expect((await users(request())).status).toBe(403); expect(state.query).not.toHaveBeenCalled();
  });
  it("fails closed when configuration or the permission lookup is unavailable", async () => {
    state.app = null; expect((await users(request())).status).toBe(503);
    state.app = {}; state.read.mockImplementation(() => { throw new Error("offline"); });
    expect((await users(request())).status).toBe(503); expect(state.query).not.toHaveBeenCalled();
  });
  it("checks current membership on every request and never caches personal data", async () => {
    const response = await users(request());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).users[0].email).toBe("private@example.test");
    state.documents.set("staffAccess/admin", { role: "admin", enabled: false });
    expect((await requireAdmin(request())).ok).toBe(false);
  });
});

describe("broadcasts", () => {
  it("rejects legacy credentials without sending anything", async () => {
    expect((await notify(request("/api/notify", null, { code: "legacy-code", password: "exposed", title: "test" }))).status).toBe(401);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("rejects contributors even when they forge a body role", async () => {
    state.documents.set("staffAccess/admin", { role: "contributor", enabled: true });
    expect((await notify(request("/api/notify", "valid", { title: "test", role: "admin" }))).status).toBe(403);
    expect(state.send).not.toHaveBeenCalled();
  });
  it.each(["//external.test", "/\\external.test", "https://external.test"])("rejects unsafe link %s", async (url) => {
    expect((await notify(request("/api/notify", "valid", { title: "test", url }))).status).toBe(400);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("accepts an authenticated administrator", async () => {
    expect((await notify(request("/api/notify", "valid", { title: "test", message: "body", url: "/learn" }))).status).toBe(200);
    expect(state.send).toHaveBeenCalledWith("test", "body", "/learn");
  });
});

describe("invitation permissions", () => {
  it.each([undefined, { role: "contributor", enabled: true }, { role: "reviewer", enabled: true }, { role: "admin", enabled: false }])("blocks invitation listing, generation and cancellation for %j", async (access) => {
    state.documents.delete("staffAccess/admin"); if (access) state.documents.set("staffAccess/admin", access);
    expect((await listInvites(request("/api/admin/invites"))).status).toBe(403);
    expect((await createInvite(request("/api/admin/invites", "valid", { email: "person@example.test", role: "admin" }))).status).toBe(403);
    expect((await cancelInvite(request(`/api/admin/invites?id=${"a".repeat(64)}`, "valid", undefined, "DELETE"))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled(); expect(state.query).not.toHaveBeenCalled();
  });
  it("defaults new invitations to contributor and stores only a code hash", async () => {
    const response = await createInvite(request("/api/admin/invites", "valid", { email: " Person@Example.test " }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.json(); const stored = state.documents.get(`staffInvites/${inviteId(data.code)}`);
    expect(stored).toMatchObject({ email: "person@example.test", role: "contributor", enabled: true });
    expect(JSON.stringify(stored)).not.toContain(data.code);
  });
  it("allows an administrator to explicitly invite another administrator", async () => {
    const response = await createInvite(request("/api/admin/invites", "valid", { email: "second@example.test", role: "admin" }));
    expect(response.status).toBe(200);
    const data = await response.json(); expect(state.documents.get(`staffInvites/${inviteId(data.code)}`)?.role).toBe("admin");
  });
  it("allows an administrator to issue a reviewer invitation", async () => {
    const response = await createInvite(request("/api/admin/invites", "valid", { email: "reviewer@example.test", role: "reviewer" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(state.documents.get(`staffInvites/${inviteId(data.code)}`)).toMatchObject({ email: "reviewer@example.test", role: "reviewer", enabled: true });
  });
  it("cancels unused invitations but does not pretend cancellation revokes joined members", async () => {
    const id = "a".repeat(64); state.documents.set(`staffInvites/${id}`, { enabled: true });
    expect((await cancelInvite(request(`/api/admin/invites?id=${id}`, "valid", undefined, "DELETE"))).status).toBe(200);
    state.documents.set(`staffInvites/${id}`, { enabled: true, redeemedBy: "member" });
    expect((await cancelInvite(request(`/api/admin/invites?id=${id}`, "valid", undefined, "DELETE"))).status).toBe(409);
  });
  it("lists previously redeemed invites as disabled even if their legacy enabled field is true", async () => {
    state.documents.set(`staffInvites/${"a".repeat(64)}`, { enabled: true, redeemedBy: "member", role: "contributor", email: "member@example.test" });
    const response = await listInvites(request("/api/admin/invites"));
    expect(response.status).toBe(200);
    expect((await response.json()).invites).toEqual([expect.objectContaining({ enabled: false, redeemed: true })]);
  });
});

describe("invite redemption", () => {
  function setup(changes = {}) {
    state.documents.delete("staffAccess/admin");
    const invite = newInvite("owner@example.test", "contributor", "issuer");
    state.documents.set(`staffInvites/${invite.id}`, { ...invite.data, ...changes });
    return invite;
  }
  it("generates independent 192-bit codes, binds email and enforces expiry", () => {
    const a = newInvite(" Person@Example.test ", "contributor", "issuer", 100);
    const b = newInvite("person@example.test", "contributor", "issuer", 100);
    expect(a.code).toMatch(/^[\w-]{32}$/); expect(a.code).not.toBe(b.code); expect(a.id).toMatch(/^[a-f0-9]{64}$/);
    expect(canRedeemInvite(a.data, "person@example.test", "person", 101)).toBe(true);
    expect(canRedeemInvite(a.data, "other@example.test", "other", 101)).toBe(false);
    expect(canRedeemInvite(a.data, "person@example.test", "person", a.data.expiresAt)).toBe(false);
  });
  it.each([{ email: "someone@example.test" }, { enabled: false }, { expiresAt: 1 }, { redeemedBy: "other" }, { role: "owner" }])("rejects invalid invitations %j", async (changes) => {
    const invite = setup(changes);
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.documents.get(`staffInvites/${invite.id}`)?.enabled).toBe("enabled" in changes ? changes.enabled : true);
  });
  it("takes role only from the private invite and rejects replay", async () => {
    const invite = setup();
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code, role: "admin" }))).status).toBe(200);
    expect(state.documents.get("staffAccess/admin")).toMatchObject({ role: "contributor", enabled: true });
    expect(state.documents.get(`staffInvites/${invite.id}`)).toMatchObject({ enabled: false, redeemedBy: "admin" });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
  });
  it("does not revive revoked membership with any invitation", async () => {
    const invite = setup(); state.documents.set("staffAccess/admin", { role: "admin", enabled: false });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("rejects same-account replay of a legacy enabled invite even with no membership record", async () => {
    const invite = setup({ enabled: true, redeemedBy: "admin" });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });
  it("concurrent redemption and later retries create only one membership", async () => {
    const invite = setup();
    const responses = await Promise.all([
      redeem(request("/api/studio/access", "valid", { code: invite.code })),
      redeem(request("/api/studio/access", "valid", { code: invite.code })),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 403]);
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(state.update).toHaveBeenCalledTimes(1);
    expect(state.documents.get(`staffInvites/${invite.id}`)).toMatchObject({ enabled: false, redeemedBy: "admin" });
    state.documents.delete("staffAccess/admin");
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(state.update).toHaveBeenCalledTimes(1);
  });
  it("a failed redemption leaves an unused invitation enabled", async () => {
    const invite = setup();
    state.documents.set("staffAccess/admin", { role: "contributor", enabled: false, status: "frozen" });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.documents.get(`staffInvites/${invite.id}`)).toMatchObject({ enabled: true });
    expect(state.documents.get(`staffInvites/${invite.id}`)?.redeemedBy).toBeUndefined();
    expect(state.update).not.toHaveBeenCalled();
  });
  it.each([false, true])("frozen members cannot redeem a new invitation (enabled: %s)", async (enabled) => {
    const invite = setup({ role: "reviewer" });
    state.documents.set("staffAccess/admin", { role: "contributor", enabled, status: "frozen" });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });
  it.each(["older", "same-time", "already-redeemed"])("removed members cannot rejoin using an %s invitation", async (kind) => {
    const removedAt = Date.now() - 1000;
    const invite = setup({
      createdAt: kind === "older" ? removedAt - 1 : kind === "same-time" ? removedAt : removedAt + 1,
      ...(kind === "already-redeemed" ? { redeemedBy: "admin" } : {}),
    });
    state.documents.set("staffAccess/admin", { role: "contributor", enabled: false, status: "removed", removedAt });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });
  it("allows a removed member to rejoin with a newly issued, unused reviewer invitation", async () => {
    const removedAt = Date.now() - 1000;
    const invite = setup({ createdAt: removedAt + 1, role: "reviewer" });
    state.documents.set("staffAccess/admin", { role: "contributor", enabled: false, status: "removed", removedAt });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code, role: "admin" }))).status).toBe(200);
    expect(state.documents.get("staffAccess/admin")).toMatchObject({ role: "reviewer", enabled: true, status: "active" });
    expect(state.documents.get(`staffInvites/${invite.id}`)?.redeemedBy).toBe("admin");
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
  });
  it("denies redemption during account deletion, including a fresh re-invitation", async () => {
    const removedAt = Date.now() - 1000;
    const invite = setup({ createdAt: removedAt + 1, role: "reviewer" });
    state.documents.set("staffAccess/admin", { role: "contributor", enabled: false, status: "removed", removedAt });
    state.documents.set("accountDeletions/admin", { status: "started" });
    expect((await redeem(request("/api/studio/access", "valid", { code: invite.code }))).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });
  it("rejects old short invite codes and unsigned requests", async () => {
    expect((await redeem(request("/api/studio/access", "valid", { code: "alpha-2026" }))).status).toBe(403);
    expect((await redeem(request("/api/studio/access", null, { code: "a".repeat(32) }))).status).toBe(401);
  });
});
