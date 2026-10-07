import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/player/route";
import { smallJson } from "@/lib/server/player-http";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), execute: vi.fn(), configured: true }));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => mocks.configured ? {} : null }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: mocks.verify }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({}) }));
vi.mock("@/lib/server/player-database", () => ({ playerDatabase: () => ({}) }));
vi.mock("@/lib/server/player-engine", async (original) => ({ ...await original<typeof import("@/lib/server/player-engine")>(), executePlayerCommand: mocks.execute }));
const request = (body: unknown, token: string | null = "valid") => new Request("https://example.test/api/player", {
  method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks(); mocks.configured = true;
  mocks.verify.mockResolvedValue({ uid: "verified-player", firebase: { sign_in_provider: "google.com" } });
  mocks.execute.mockResolvedValue({ progress: { xp: 10 }, serverTime: 1 });
});

it("requires a valid non-revoked Firebase token and never uses a submitted uid", async () => {
  const missing = await POST(request({ action: "snapshot" }, null));
  expect(missing.status).toBe(401);
  expect(missing.headers.get("cache-control")).toBe("no-store");
  mocks.verify.mockRejectedValueOnce(new Error("revoked"));
  expect((await POST(request({ action: "snapshot" }))).status).toBe(401);
  expect((await POST(request({ action: "snapshot", uid: "victim" }))).status).toBe(400);
  expect(mocks.execute).not.toHaveBeenCalled();
  const response = await POST(request({ action: "snapshot" }));
  expect(response.status).toBe(200);
  expect(mocks.verify).toHaveBeenLastCalledWith("valid", true);
  expect(mocks.execute.mock.calls[0][1]).toMatchObject({ uid: "verified-player", anonymous: false });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("rejects excessive bodies even when Content-Length is absent or dishonest", async () => {
  const large = request({ action: "snapshot", padding: "x".repeat(20000) });
  large.headers.set("content-length", "10");
  expect((await POST(large)).status).toBe(400);
  expect(mocks.execute).not.toHaveBeenCalled();
});

it('rejects unverified password accounts while allowing configured anonymous identities', async () => {
  mocks.verify.mockResolvedValueOnce({ uid: 'unverified', email_verified: false, firebase: { sign_in_provider: 'password' } });
  expect((await POST(request({ action: 'snapshot' }))).status).toBe(403);
  expect(mocks.execute).not.toHaveBeenCalled();
  mocks.verify.mockResolvedValueOnce({ uid: 'guest', firebase: { sign_in_provider: 'anonymous' } });
  expect((await POST(request({ action: 'snapshot' }))).status).toBe(200);
  expect(mocks.execute.mock.calls[0][1]).toMatchObject({ uid: 'guest', anonymous: true });
});

it("accepts JSON only and fails closed on server errors", async () => {
  await expect(smallJson(new Request("https://example.test", { method: "POST", body: "{}" }))).rejects.toThrow();
  mocks.execute.mockRejectedValue(new Error("private database details"));
  const response = await POST(request({ action: "snapshot" }));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database details");
});
