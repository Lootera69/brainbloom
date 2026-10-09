import { beforeEach, expect, it, vi } from "vitest";
import type { Data, PlayerDatabase } from "@/lib/server/player-engine";
import type { VerifiedPurchase } from "@/lib/server/store-contract";
import { BillingError } from "@/lib/server/store-contract";
import { initialProgress } from "@/lib/server/player-progress";
import { POST } from "@/app/api/purchases/route";
import { authenticatePlayPush, notificationJson } from "@/lib/server/store-http";
import { OAuth2Client } from "google-auth-library";

const state = vi.hoisted(() => ({ docs: new Map<string, Data>(), anonymous: false, authenticated: true, finalizeFails: false,
  calls: [] as string[], verify: vi.fn(), finalize: vi.fn() }));
const accountToken = "cb2b8aae-33aa-4d8d-8c76-59a16b3c6e34";
const config = { mode: "sandbox" as const, testUids: new Set(["payer"]), google: {
  packageName: "com.example.app", credentials: { client_email: "unused@example.test", private_key: "unused" },
  audience: "https://example.test/api/purchases/google-play", pushEmail: "store-push@example.test", subscription: "projects/example/subscriptions/store" } };

vi.mock("@/lib/server/player-http", () => ({
  requirePlayer: async () => state.authenticated ? { ok: true, uid: "payer", anonymous: state.anonymous, app: { options: { projectId: "demo-billing" } } }
    : { ok: false, response: new Response(null, { status: 401 }) },
  smallJson: (request: Request) => request.json(),
}));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({}) }));
vi.mock("@/lib/server/store-config", async (importOriginal) => ({ ...await importOriginal<object>(), billingConfig: () => config }));
vi.mock("@/lib/server/store-verification", () => ({ StoreVerifier: class {
  verify = state.verify;
  finalize = state.finalize;
} }));
vi.mock("@/lib/server/player-database", () => ({ playerDatabase: (): PlayerDatabase => ({ transaction: async (work) => {
  const writes: { path: string; data: Data }[] = [];
  const result = await work({ get: async (path) => structuredClone(state.docs.get(path)), getAll: async (paths) => paths.map((path) => path ? structuredClone(state.docs.get(path)) : undefined),
    publishedPuzzles: async () => [], put: (path, data, merge) => { writes.push({ path, data: structuredClone(merge ? { ...state.docs.get(path), ...data } : data) }); } });
  for (const { path, data } of writes) state.docs.set(path, data);
  return result;
} }) }));

const request = (extra: Record<string, unknown> = {}) => new Request("https://example.test/api/purchases", { method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer firebase-token" },
  body: JSON.stringify({ action: "verify", store: "google-play", productId: "gems_100", token: "store-token", ...extra }) });

beforeEach(() => {
  vi.restoreAllMocks();
  state.docs.clear(); state.anonymous = false; state.authenticated = true; state.finalizeFails = false; state.calls = [];
  state.docs.set("billingAccounts/payer", { accountToken });
  state.docs.set("playerProgress/payer", initialProgress(Date.now()) as unknown as Data);
  state.verify.mockReset().mockImplementation(async () => {
    state.calls.push("verify");
    return { store: "google-play", productId: "gems_100", token: "store-token", environment: "sandbox", accountToken,
      transactionId: "order-1", originalId: "store-token", purchasedAt: Date.now() - 1000, verifiedAt: Date.now(), subscription: false,
      active: true, expiresAt: null, quantity: 1, remainingQuantity: 1, consumed: false, acknowledged: false } satisfies VerifiedPurchase;
  });
  state.finalize.mockReset().mockImplementation(async () => {
    expect(state.docs.get("playerProgress/payer")?.gems).toBe(100);
    expect([...state.docs.keys()].some((path) => path.startsWith("storeOrders/"))).toBe(true);
    state.calls.push("finalize");
    if (state.finalizeFails) throw new BillingError("store-unavailable", "Retry delivery.", 503);
  });
});

it("durably grants the purchase before acknowledging or consuming it", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, delivered: true, progress: { gems: 100 } });
  expect(state.calls).toEqual(["verify", "finalize"]);
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it("recovers a finalization outage without granting the purchase twice", async () => {
  state.finalizeFails = true;
  expect((await POST(request())).status).toBe(503);
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(100);
  state.finalizeFails = false;
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ replayed: true, progress: { gems: 100 } });
});

it("never delivers or completes an unverified receipt", async () => {
  state.verify.mockRejectedValue(new BillingError("invalid-purchase", "Invalid receipt.", 400));
  expect((await POST(request())).status).toBe(400);
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(0);
  expect(state.finalize).not.toHaveBeenCalled();
});

it("requires authentication and a recoverable account for paid checkout", async () => {
  state.authenticated = false;
  expect((await POST(request())).status).toBe(401);
  state.authenticated = true;
  state.anonymous = true;
  const response = await POST(request());
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "purchase-sign-in-required" });
  expect(state.verify).not.toHaveBeenCalled();
});

it("does not allow choosing another account or an arbitrary reward in the API", async () => {
  expect((await POST(request({ uid: "victim" }))).status).toBe(400);
  expect((await POST(request({ gems: 999999 }))).status).toBe(400);
  expect((await POST(request({ productId: "unknown" }))).status).toBe(400);
  expect(state.verify).not.toHaveBeenCalled();
});

it("rejects replaying somebody else's verified store transaction", async () => {
  const purchase = await state.verify();
  state.verify.mockResolvedValue({ ...purchase, accountToken: "940e962c-1f18-4e92-9b02-5544e08dbb94" });
  expect((await POST(request())).status).toBe(403);
  expect(state.finalize).not.toHaveBeenCalled();
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(0);
});

it("requires a Google-verified push token with the exact audience and service-account identity", async () => {
  const verify = vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({ getPayload: () => ({ email: "store-push@example.test", email_verified: true }) } as never);
  const push = new Request("https://example.test/api/purchases/google-play", { headers: { Authorization: "Bearer google-signed-jwt" } });
  await authenticatePlayPush(push, config);
  expect(verify).toHaveBeenCalledWith({ idToken: "google-signed-jwt", audience: config.google.audience });
  verify.mockResolvedValue({ getPayload: () => ({ email: "attacker@example.test", email_verified: true }) } as never);
  await expect(authenticatePlayPush(push, config)).rejects.toMatchObject({ status: 401 });
  verify.mockResolvedValue({ getPayload: () => ({ email: config.google.pushEmail, email_verified: false }) } as never);
  await expect(authenticatePlayPush(push, config)).rejects.toMatchObject({ status: 401 });
  verify.mockRejectedValue(new Error("Invalid signature"));
  await expect(authenticatePlayPush(push, config)).rejects.toMatchObject({ status: 401 });
});

it("rejects unauthenticated pushes before certificate or database work", async () => {
  const verify = vi.spyOn(OAuth2Client.prototype, "verifyIdToken");
  await expect(authenticatePlayPush(new Request("https://example.test"), config)).rejects.toMatchObject({ status: 401 });
  expect(verify).not.toHaveBeenCalled();
});

it("bounds notification bodies and rejects malformed JSON", async () => {
  const json = (body: string) => new Request("https://example.test", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  await expect(notificationJson(json("x".repeat(65537)))).rejects.toMatchObject({ status: 413 });
  await expect(notificationJson(json("{"))).rejects.toMatchObject({ status: 400 });
  await expect(notificationJson(json('{"signedPayload":"test"}'))).resolves.toEqual({ signedPayload: "test" });
});
