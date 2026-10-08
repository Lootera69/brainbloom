import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/player/route";
import { smallJson } from "@/lib/server/player-http";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), appCheck: vi.fn(), execute: vi.fn(), configured: true }));
vi.mock("@/lib/push-send", () => ({ getAdminApp: () => mocks.configured ? { options: { projectId: 'demo-security' } } : null }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: mocks.verify }) }));
vi.mock('firebase-admin/app-check', () => ({ getAppCheck: () => ({ verifyToken: mocks.appCheck }) }));
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
afterEach(() => vi.unstubAllEnvs());

it('rejects forged or expired attestation and never accepts it as a replacement for login', async () => {
  const checked = request({ action: 'snapshot' });
  checked.headers.set('x-firebase-appcheck', 'forged-proof');
  mocks.appCheck.mockRejectedValueOnce(new Error('Invalid signature'));
  expect((await POST(checked)).status).toBe(403);
  expect(mocks.execute).not.toHaveBeenCalled();
  checked.headers.delete('authorization');
  expect((await POST(checked)).status).toBe(401);
  expect(mocks.appCheck).toHaveBeenCalledTimes(1);
});

it('assigns shared guest budgets from trusted headers and cryptographically verified attestation only', async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('PLAYER_ABUSE_SECRET', 'private-test-secret-which-is-at-least-32-characters');
  mocks.verify.mockResolvedValue({ uid: 'guest', firebase: { sign_in_provider: 'anonymous' } });
  const checked = request({ action: 'snapshot' });
  checked.headers.set('x-vercel-forwarded-for', '192.0.2.17');
  checked.headers.set('x-client-platform', 'android');
  expect((await POST(checked.clone())).status).toBe(200);
  const first = mocks.execute.mock.calls[0][1].network;
  expect(first).toEqual({ key: expect.stringMatching(/^[a-f0-9]{64}$/), attested: false });
  checked.headers.set('x-firebase-appcheck', 'valid-proof');
  mocks.appCheck.mockResolvedValue({ appId: 'registered-app' });
  expect((await POST(checked)).status).toBe(200);
  expect(mocks.appCheck).toHaveBeenLastCalledWith('valid-proof');
  expect(mocks.execute.mock.calls[1][1].network).toEqual({ ...first, attested: true });
});

it('supports strict attestation without a platform-header bypass and fails closed on missing limiter setup', async () => {
  vi.stubEnv('PLAYER_APP_CHECK_MODE', 'required');
  const checked = request({ action: 'snapshot' });
  checked.headers.set('x-client-platform', 'android');
  expect((await POST(checked)).status).toBe(403);
  checked.headers.set('x-firebase-appcheck', 'valid-proof');
  mocks.appCheck.mockResolvedValue({ appId: 'registered-app' });
  expect((await POST(checked)).status).toBe(200);
  vi.stubEnv('PLAYER_APP_CHECK_MODE', 'compatible');
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('PLAYER_ABUSE_SECRET', '');
  mocks.verify.mockResolvedValue({ uid: 'guest', firebase: { sign_in_provider: 'anonymous' } });
  expect((await POST(checked)).status).toBe(503);
});

it('returns actionable retry timing without leaking network identifiers', async () => {
  const { PlayerError } = await import('@/lib/server/player-engine');
  mocks.execute.mockRejectedValue(new PlayerError('guest-creation-limit', 'Try again later or sign in with Google.', 429, 3600));
  const response = await POST(request({ action: 'snapshot' }));
  expect(response.status).toBe(429);
  expect(response.headers.get('retry-after')).toBe('3600');
  expect(await response.json()).toEqual({ code: 'guest-creation-limit', error: 'Try again later or sign in with Google.' });
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
  expect(response.headers.get("server-timing")).toMatch(/^auth;dur=\d+\.\d, database;dur=\d+\.\d, total;dur=\d+\.\d$/);
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
