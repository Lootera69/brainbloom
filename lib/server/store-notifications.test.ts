import { beforeEach, expect, it, vi } from "vitest";
import { OAuth2Client } from "google-auth-library";
import type { Data, PlayerDatabase } from "@/lib/server/player-engine";
import { initialProgress } from "@/lib/server/player-progress";
import { BillingError, billingKey, type VerifiedPurchase } from "@/lib/server/store-contract";
import { POST as googlePush } from "@/app/api/purchases/google-play/route";
import { POST as applePush } from "@/app/api/purchases/app-store/route";

const state = vi.hoisted(() => ({ docs: new Map<string, Data>(), google: vi.fn(), apple: vi.fn(), verify: vi.fn(), finalize: vi.fn() }));
const accountToken = "cb2b8aae-33aa-4d8d-8c76-59a16b3c6e34";
const config = { mode: "sandbox" as const, testUids: new Set(["payer"]),
  google: { packageName: "com.example.app", credentials: { client_email: "unused@example.test", private_key: "unused" },
    audience: "https://example.test/api/purchases/google-play", pushEmail: "push@example.test", subscription: "projects/example/subscriptions/store" },
  apple: { bundleId: "com.example.app", appId: 1234, issuerId: accountToken, keyId: "TESTKEY", privateKey: "unused" } };

vi.mock("@/lib/push-send", () => ({ getAdminApp: () => ({ options: { projectId: "demo-billing" } }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({ doc: (path: string) => ({
  get: async () => ({ exists: state.docs.has(path) }), set: async (data: Data) => { state.docs.set(path, data); },
}) }) }));
vi.mock("@/lib/server/store-config", async (original) => ({ ...await original<object>(), billingConfig: () => config }));
vi.mock("@/lib/server/store-verification", () => ({ StoreVerifier: class {
  googleNotificationPurchase = state.google;
  appleNotification = state.apple;
  verify = state.verify;
  finalize = state.finalize;
} }));
vi.mock("@/lib/server/player-database", () => ({ playerDatabase: (): PlayerDatabase => ({ transaction: async (work) => {
  const writes: { path: string; data: Data }[] = [];
  const result = await work({ get: async (path) => structuredClone(state.docs.get(path)),
    getAll: async (paths) => paths.map((path) => path ? structuredClone(state.docs.get(path)) : undefined), publishedPuzzles: async () => [],
    put: (path, data, merge) => { writes.push({ path, data: structuredClone(merge ? { ...state.docs.get(path), ...data } : data) }); } });
  for (const { path, data } of writes) state.docs.set(path, data);
  return result;
} }) }));

const purchase = (store: "google-play" | "app-store" = "google-play"): VerifiedPurchase => ({ store, productId: "gems_100", token: "store-token",
  environment: "sandbox", accountToken, transactionId: "order-1", originalId: "store-token", purchasedAt: Date.now() - 1000, verifiedAt: Date.now(),
  subscription: false, active: true, expiresAt: null, quantity: 1, remainingQuantity: 1, consumed: false, acknowledged: false });
const googleRequest = (event: Record<string, unknown> = { oneTimeProductNotification: { purchaseToken: "store-token" } }, id = "push-1", subscription = config.google.subscription) =>
  new Request(config.google.audience, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer google-token" },
    body: JSON.stringify({ subscription, message: { messageId: id, data: Buffer.from(JSON.stringify({ packageName: config.google.packageName, ...event })).toString("base64") } }) });
const appleRequest = () => new Request("https://example.test/api/purchases/app-store", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ signedPayload: "verified-by-store-verifier" }) });
const marker = (store = "google-play", id = "push-1") => `storeNotifications/${billingKey(store, id)}`;

beforeEach(() => {
  vi.restoreAllMocks();
  state.docs.clear();
  state.docs.set("billingAccounts/payer", { accountToken });
  state.docs.set(`billingTokens/${accountToken}`, { uid: "payer" });
  state.docs.set("playerProgress/payer", initialProgress(Date.now()) as unknown as Data);
  vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({ getPayload: () => ({ email: config.google.pushEmail, email_verified: true }) } as never);
  state.google.mockReset().mockImplementation(async () => purchase());
  state.verify.mockReset().mockImplementation(async () => purchase("app-store"));
  state.finalize.mockReset().mockResolvedValue(undefined);
  state.apple.mockReset().mockResolvedValue({ environment: "sandbox", notification: { notificationUUID: "apple-1", notificationType: "ONE_TIME_CHARGE" },
    transaction: { transactionId: "order-1", productId: "gems_100", appAccountToken: accountToken } });
});

it("authenticates and delivers a Google callback once before marking it complete", async () => {
  state.finalize.mockImplementation(async () => {
    expect(state.docs.get("playerProgress/payer")?.gems).toBe(100);
    expect(state.docs.has(marker())).toBe(false);
  });
  expect((await googlePush(googleRequest())).status).toBe(200);
  expect(state.docs.has(marker())).toBe(true);
  expect((await googlePush(googleRequest())).status).toBe(200);
  expect(state.google).toHaveBeenCalledTimes(1);
  expect(state.finalize).toHaveBeenCalledTimes(1);
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(100);
});

it("rejects an unauthenticated, wrong-subscription or wrong-package Google callback", async () => {
  const unauthenticated = googleRequest();
  unauthenticated.headers.delete("authorization");
  expect((await googlePush(unauthenticated)).status).toBe(401);
  expect((await googlePush(googleRequest({}, "push-1", "projects/attacker/subscriptions/store"))).status).toBe(403);
  expect((await googlePush(googleRequest({ packageName: "another.app" }))).status).toBe(403);
  expect(state.google).not.toHaveBeenCalled();
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(0);
});

it("lets Pub/Sub retry an acknowledgment outage without granting twice", async () => {
  state.finalize.mockRejectedValueOnce(new BillingError("store-unavailable", "Retry.", 503));
  expect((await googlePush(googleRequest())).status).toBe(503);
  expect(state.docs.has(marker())).toBe(false);
  expect((await googlePush(googleRequest())).status).toBe(200);
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(100);
});

it("applies a full Google refund once even if the purchase lookup still says purchased", async () => {
  await googlePush(googleRequest());
  const event = { voidedPurchaseNotification: { purchaseToken: "store-token", orderId: "order-1", productType: 2, refundType: 1 } };
  expect((await googlePush(googleRequest(event, "refund-1"))).status).toBe(200);
  expect((await googlePush(googleRequest(event, "refund-2"))).status).toBe(200);
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(0);
});

it("retries partial refunds until the verified refundable quantity has changed", async () => {
  await googlePush(googleRequest());
  const event = { voidedPurchaseNotification: { purchaseToken: "store-token", orderId: "order-1", productType: 2, refundType: 2 } };
  expect((await googlePush(googleRequest(event, "partial"))).status).toBe(503);
  expect(state.docs.has(marker("google-play", "partial"))).toBe(false);
  state.google.mockImplementation(async () => ({ ...purchase(), remainingQuantity: 0 }));
  expect((await googlePush(googleRequest(event, "partial"))).status).toBe(200);
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(0);
});

it("does not recreate a deleted account or deliver an unbound store notification", async () => {
  state.docs.set("accountDeletions/payer", { status: "complete" });
  state.docs.delete("playerProgress/payer");
  expect((await googlePush(googleRequest())).status).toBe(200);
  expect(state.docs.has("playerProgress/payer")).toBe(false);
  expect(state.finalize).not.toHaveBeenCalled();
  state.docs.delete(`billingTokens/${accountToken}`);
  expect((await applePush(appleRequest())).status).toBe(200);
  expect(state.verify).not.toHaveBeenCalled();
});

it("verifies Apple notification and current purchase before delivering once", async () => {
  expect((await applePush(appleRequest())).status).toBe(200);
  expect(state.verify).toHaveBeenCalledWith({ store: "app-store", productId: "gems_100", token: "order-1", environment: "sandbox" });
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(100);
  expect(state.docs.has(marker("app-store", "apple-1"))).toBe(true);
  expect((await applePush(appleRequest())).status).toBe(200);
  expect(state.verify).toHaveBeenCalledTimes(1);
});

it("rejects a bad Apple signature before database delivery", async () => {
  state.apple.mockRejectedValue(new BillingError("invalid-purchase", "Invalid signature.", 400));
  expect((await applePush(appleRequest())).status).toBe(400);
  expect(state.verify).not.toHaveBeenCalled();
  expect(state.docs.get("playerProgress/payer")?.gems).toBe(0);
});

it("leaves Apple verification outages retryable and accepts store test notifications", async () => {
  state.verify.mockRejectedValueOnce(new BillingError("store-unavailable", "Retry.", 503));
  expect((await applePush(appleRequest())).status).toBe(503);
  expect(state.docs.has(marker("app-store", "apple-1"))).toBe(false);
  expect((await applePush(appleRequest())).status).toBe(200);
  expect((await googlePush(googleRequest({ testNotification: { version: "1.0" } }))).status).toBe(200);
  state.apple.mockResolvedValue({ environment: "sandbox", notification: { notificationType: "TEST" } });
  expect((await applePush(appleRequest())).status).toBe(200);
});
