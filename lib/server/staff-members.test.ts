import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/admin/staff/route";

const state = vi.hoisted(() => ({
  app: {} as object | null,
  documents: new Map<string, Record<string, unknown>>(),
  verify: vi.fn(), reads: vi.fn(), updates: vi.fn(), query: vi.fn(),
  beforeTransaction: vi.fn(),
}));

vi.mock("@/lib/push-send", () => ({ getAdminApp: () => state.app }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: state.verify }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => {
  const ref = (path: string) => ({
    path,
    id: path.split("/").at(-1),
    get: async () => {
      state.reads(path);
      return { exists: state.documents.has(path), data: () => state.documents.get(path) };
    },
  });
  const collection = (path: string) => {
    const result = {
      orderBy: (field: string, direction: string) => { state.query("orderBy", field, direction); return result; },
      limit: (count: number) => { state.query("limit", count); return result; },
      get: async () => {
        state.query("get", path);
        return { docs: [...state.documents.entries()]
          .filter(([key]) => key.startsWith(`${path}/`))
          .map(([key, value]) => ({ id: key.split("/").at(-1), data: () => value })) };
      },
    };
    return result;
  };
  return {
    doc: ref, collection,
    runTransaction: async (callback: (transaction: object) => Promise<unknown>) => {
      state.beforeTransaction();
      return callback({
        get: (reference: ReturnType<typeof ref>) => reference.get(),
        update: (reference: ReturnType<typeof ref>, data: Record<string, unknown>) => {
          state.updates(reference.path, data);
          state.documents.set(reference.path, { ...state.documents.get(reference.path), ...data });
        },
      });
    },
  };
} }));

const request = (method: string, body?: unknown, token: string | null = "valid", uid = "member") =>
  new NextRequest(`https://example.test/api/admin/staff?uid=${encodeURIComponent(uid)}`, {
    method,
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

beforeEach(() => {
  vi.resetAllMocks();
  state.app = {};
  state.documents.clear();
  state.verify.mockResolvedValue({ uid: "admin", email: "admin@example.test", email_verified: true, role: "admin" });
  state.documents.set("staffAccess/admin", { role: "admin", enabled: true, email: "admin@example.test", createdAt: 1 });
  state.documents.set("staffAccess/member", { role: "contributor", enabled: true, email: "member@example.test", createdAt: 2 });
  state.documents.set("users/member", { xp: 500, gems: 20, tier: "premium" });
  state.documents.set("users/member/pushTokens/device", { token: "device" });
});

describe("staff management authorization", () => {
  const endpoints = [
    { method: "GET", invoke: GET },
    { method: "PATCH", invoke: PATCH },
    { method: "DELETE", invoke: DELETE },
  ];
  for (const { method, invoke } of endpoints) {
    it.each([null, "forged"])(`${method} rejects unauthenticated requests (%s)`, async (token) => {
      state.verify.mockRejectedValue(new Error("invalid"));
      const response = await invoke(request(method, method === "PATCH" ? { uid: "member", action: "freeze" } : undefined, token));
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(state.updates).not.toHaveBeenCalled();
      expect(state.query).not.toHaveBeenCalled();
    });
    it.each([
      undefined,
      { role: "contributor", enabled: true },
      { role: "reviewer", enabled: true },
      { role: "admin", enabled: false },
      { role: "admin", enabled: true, status: "frozen" },
    ])(`${method} requires current administrator membership (%j)`, async (access) => {
      state.documents.delete("staffAccess/admin");
      if (access) state.documents.set("staffAccess/admin", access);
      const response = await invoke(request(method, method === "PATCH" ? { uid: "member", action: "freeze", role: "admin" } : undefined));
      expect(response.status).toBe(403);
      expect(state.updates).not.toHaveBeenCalled();
      expect(state.query).not.toHaveBeenCalled();
    });
  }

  it("lists only Studio membership fields with accurate active/frozen/removed status", async () => {
    state.documents.set("staffAccess/frozen", { role: "reviewer", enabled: false, status: "frozen", email: "frozen@example.test", inviteId: "private-invite" });
    state.documents.set("staffAccess/removed", { role: "contributor", enabled: false, status: "removed" });
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result.members).toEqual(expect.arrayContaining([
      expect.objectContaining({ uid: "admin", status: "active" }),
      expect.objectContaining({ uid: "frozen", status: "frozen", role: "reviewer" }),
      expect.objectContaining({ uid: "removed", status: "removed" }),
    ]));
    expect(JSON.stringify(result)).not.toContain("private-invite");
    expect(state.query).toHaveBeenCalledWith("get", "staffAccess");
    expect(state.query).toHaveBeenCalledWith("limit", 200);
  });

  it("fails closed when membership listing fails", async () => {
    state.query.mockImplementation(() => { throw new Error("offline"); });
    expect((await GET(request("GET"))).status).toBe(503);
  });
});

describe("staff management mutations", () => {
  it.each(["contributor", "reviewer"])("freezes and unfreezes a %s without changing their player account", async (role) => {
    state.documents.set("staffAccess/member", { role, enabled: true, status: "active" });
    const profile = structuredClone(state.documents.get("users/member"));
    const token = structuredClone(state.documents.get("users/member/pushTokens/device"));
    for (const [action, enabled, status] of [["freeze", false, "frozen"], ["unfreeze", true, "active"]] as const) {
      const response = await PATCH(request("PATCH", { uid: "member", action, role: "admin", enabled: true }));
      expect(response.status).toBe(200);
      expect(state.documents.get("staffAccess/member")).toMatchObject({ role, enabled, status, updatedBy: "admin" });
    }
    expect(state.updates.mock.calls.every(([path]) => path === "staffAccess/member")).toBe(true);
    expect(state.documents.get("users/member")).toEqual(profile);
    expect(state.documents.get("users/member/pushTokens/device")).toEqual(token);
  });

  it.each(["freeze", "unfreeze", "remove"])("rejects self-targeted %s", async (action) => {
    expect((await PATCH(request("PATCH", { uid: "admin", action }))).status).toBe(403);
    expect(state.updates).not.toHaveBeenCalled();
  });

  it.each(["freeze", "unfreeze", "remove"])("protects administrator targets from %s", async (action) => {
    state.documents.set("staffAccess/member", { role: "admin", enabled: false });
    expect((await PATCH(request("PATCH", { uid: "member", action }))).status).toBe(403);
    expect(state.updates).not.toHaveBeenCalled();
  });

  it("protects self/admin targets through DELETE too", async () => {
    expect((await DELETE(request("DELETE", undefined, "valid", "admin"))).status).toBe(403);
    state.documents.set("staffAccess/member", { role: "admin", enabled: true });
    expect((await DELETE(request("DELETE"))).status).toBe(403);
    expect(state.updates).not.toHaveBeenCalled();
  });

  it("removes Studio access idempotently without deleting player data", async () => {
    const response = await DELETE(request("DELETE"));
    expect(response.status).toBe(200);
    expect(state.documents.get("staffAccess/member")).toMatchObject({ enabled: false, status: "removed", removedAt: expect.any(Number) });
    expect(state.documents.get("users/member")).toEqual({ xp: 500, gems: 20, tier: "premium" });
    expect((await DELETE(request("DELETE"))).status).toBe(200);
    expect(state.updates).toHaveBeenCalledTimes(1);
    expect((await PATCH(request("PATCH", { uid: "member", action: "unfreeze" }))).status).toBe(409);
    expect(state.updates).toHaveBeenCalledTimes(1);
  });

  it("refuses changes while the target account is being deleted", async () => {
    state.documents.set("accountDeletions/member", { status: "started" });
    expect((await PATCH(request("PATCH", { uid: "member", action: "freeze" }))).status).toBe(409);
    expect((await DELETE(request("DELETE"))).status).toBe(409);
    expect(state.updates).not.toHaveBeenCalled();
  });

  it.each(["revoked", "deleting"])("rechecks an administrator who becomes %s during the request", async (condition) => {
    state.beforeTransaction.mockImplementation(() => {
      if (condition === "revoked") state.documents.set("staffAccess/admin", { role: "contributor", enabled: true });
      else state.documents.set("accountDeletions/admin", { status: "started" });
    });
    expect((await PATCH(request("PATCH", { uid: "member", action: "freeze" }))).status).toBe(403);
    expect(state.updates).not.toHaveBeenCalled();
  });

  it.each(["", "a/b", "a\u0000b", "x".repeat(129)])("rejects unsafe target IDs %j", async (uid) => {
    expect((await PATCH(request("PATCH", { uid, action: "freeze" }))).status).toBe(400);
    expect(state.updates).not.toHaveBeenCalled();
  });

  it("rejects malformed actions and unknown members", async () => {
    expect((await PATCH(request("PATCH", { uid: "member", action: "promote" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { uid: "missing", action: "freeze" }))).status).toBe(404);
    expect(state.updates).not.toHaveBeenCalled();
  });
});
