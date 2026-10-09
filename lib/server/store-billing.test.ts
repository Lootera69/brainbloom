import { beforeEach, describe, expect, it } from "vitest";
import { Environment, Status } from "@apple/app-store-server-library";
import type { Data, PlayerDatabase } from "@/lib/server/player-engine";
import { initialProgress } from "@/lib/server/player-progress";
import { billingConfig, requireBilling, type BillingConfig } from "@/lib/server/store-config";
import { billingKey, purchaseRequestSchema, type VerifiedPurchase } from "@/lib/server/store-contract";
import { fulfillPurchase, prepareBilling, purchaseOwner } from "@/lib/server/store-billing";
import { applePurchase, googleProduct, googleSubscription, StoreVerifier } from "@/lib/server/store-verification";

const now = Date.parse("2026-10-08T10:00:00Z");
const owner = "payer";
const accountToken = "cb2b8aae-33aa-4d8d-8c76-59a16b3c6e34";
const config: BillingConfig = { mode: "production", testUids: new Set([owner]),
  google: { packageName: "com.example.app", credentials: { client_email: "test@example.test", private_key: "unused" } },
  apple: { bundleId: "com.example.app", appId: 1234, issuerId: accountToken, keyId: "TESTKEY", privateKey: "unused" } };

const consumable = (patch: Partial<VerifiedPurchase> = {}): VerifiedPurchase => ({ store: "google-play", productId: "gems_100", token: "store-token",
  environment: "production", accountToken, transactionId: "order-1", originalId: "store-token", purchasedAt: now - 1000, verifiedAt: now,
  subscription: false, active: true, expiresAt: null, quantity: 1, remainingQuantity: 1, consumed: false, acknowledged: false, ...patch });
const subscription = (patch: Partial<VerifiedPurchase> = {}) => consumable({ productId: "premium_yearly", subscription: true,
  expiresAt: now + 365 * 86400000, ...patch });

function memoryDatabase() {
  const docs = new Map<string, Data>();
  let queue = Promise.resolve();
  const database: PlayerDatabase = {
    transaction<T>(work: Parameters<PlayerDatabase["transaction"]>[0]): Promise<T> {
      const result = queue.then(async () => {
        const writes = new Map<string, Data>();
        const value = await work({ get: async (path) => structuredClone(docs.get(path)),
          getAll: async (paths) => paths.map((path) => path ? structuredClone(docs.get(path)) : undefined), publishedPuzzles: async () => [],
          put: (path, data, merge) => writes.set(path, structuredClone(merge ? { ...docs.get(path), ...data } : data)) });
        for (const [path, data] of writes) docs.set(path, data);
        return value as T;
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return { docs, database };
}

describe("verified purchase delivery", () => {
  let store: ReturnType<typeof memoryDatabase>;
  beforeEach(() => {
    store = memoryDatabase();
    store.docs.set(`billingAccounts/${owner}`, { accountToken });
    store.docs.set(`billingTokens/${accountToken}`, { uid: owner });
    store.docs.set(`playerProgress/${owner}`, initialProgress(now) as unknown as Data);
    store.docs.set("settings/player-security", { paymentsEnabled: true });
  });
  const grant = (purchase: VerifiedPurchase, actor = owner) => fulfillPurchase(store.database, config, actor, purchase, now);

  it("delivers one consumable exactly once across simultaneous and repeated requests", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => grant(consumable())));
    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect(store.docs.get(`playerProgress/${owner}`)?.gems).toBe(100);
    expect(store.docs.get(`users/${owner}`)?.gems).toBe(100);
    expect([...store.docs.keys()].filter((path) => path.startsWith("storeOrders/"))).toHaveLength(1);
  });

  it("requires the exact account bound to the store transaction", async () => {
    store.docs.set("billingAccounts/other", { accountToken: "940e962c-1f18-4e92-9b02-5544e08dbb94" });
    await expect(grant(consumable(), "other")).rejects.toMatchObject({ code: "purchase-account-mismatch" });
    expect(store.docs.get("playerProgress/other")).toBeUndefined();
    await grant(consumable());
    store.docs.set("billingAccounts/other", { accountToken });
    await expect(grant(consumable(), "other")).rejects.toMatchObject({ code: "purchase-account-mismatch" });
  });

  it("cannot change the SKU while replaying a purchase token", async () => {
    await grant(consumable());
    await expect(grant(consumable({ productId: "gems_1200" }))).rejects.toMatchObject({ code: "purchase-conflict" });
    expect(store.docs.get(`playerProgress/${owner}`)?.gems).toBe(100);
  });

  it("does not claim an already consumed token without an existing delivery record", async () => {
    await expect(grant(consumable({ consumed: true }))).rejects.toMatchObject({ code: "purchase-already-consumed" });
    await grant(consumable());
    expect((await grant(consumable({ consumed: true }))).progress.gems).toBe(100);
  });

  it("uses store quantities and reverses a partial refund once", async () => {
    await grant(consumable({ quantity: 3, remainingQuantity: 3 }));
    await grant(consumable({ quantity: 3, remainingQuantity: 1, verifiedAt: now + 1000 }));
    expect((await grant(consumable({ quantity: 3, remainingQuantity: 1, verifiedAt: now + 2000 }))).progress.gems).toBe(100);
    expect((await grant(consumable({ quantity: 3, remainingQuantity: 3, verifiedAt: now }))).progress.gems).toBe(100);
  });

  it("does not let spent refunded gems become free currency", async () => {
    await grant(consumable());
    store.docs.get(`playerProgress/${owner}`)!.gems = 0;
    expect((await grant(consumable({ remainingQuantity: 0, active: false, verifiedAt: now + 1 }))).progress.gems).toBe(-100);
    expect((await grant(consumable({ token: "next-token", originalId: "next-token", transactionId: "next-order" }))).progress.gems).toBe(0);
  });

  it("can reinstate a consumable when the store reverses its refund", async () => {
    await grant(consumable({ store: "app-store" }));
    await grant(consumable({ store: "app-store", remainingQuantity: 0, active: false, verifiedAt: now + 1 }));
    expect((await grant(consumable({ store: "app-store", verifiedAt: now + 2 }))).progress.gems).toBe(100);
  });

  it("keeps a confirmed Google refund when the store lookup temporarily lags", async () => {
    await grant(consumable());
    await grant(consumable({ remainingQuantity: 0, active: false, refunded: true, verifiedAt: now + 1 }));
    const retry = await grant(consumable({ verifiedAt: now + 2 }));
    expect(retry.progress.gems).toBe(0);
    expect(retry.refunded).toBe(true);
  });

  it("uses the exact store expiry and gives the annual bonus once per renewal", async () => {
    const first = await grant(subscription());
    expect(first.progress.subscriptionExpiry).toBe(now + 365 * 86400000);
    expect(first.progress.streakFreezes).toBe(3);
    const replay = await grant(subscription());
    expect(replay.progress.subscriptionExpiry).toBe(first.progress.subscriptionExpiry);
    expect(replay.progress.streakFreezes).toBe(3);
    const renewal = await grant(subscription({ transactionId: "order-2", expiresAt: now + 730 * 86400000, verifiedAt: now + 1000 }));
    expect(renewal.progress.subscriptionExpiry).toBe(now + 730 * 86400000);
    expect(renewal.progress.streakFreezes).toBe(6);
  });

  it("revokes subscription access without subtracting an expired annual gift", async () => {
    await grant(subscription());
    const revoked = await grant(subscription({ active: false, verifiedAt: now + 1000 }));
    expect(revoked.progress.tier).toBe("free");
    expect(revoked.progress.streakFreezes).toBe(3);
    expect((await grant(subscription())).progress.tier).toBe("free");
  });

  it("reverses a refunded annual bonus once and keeps a later restore from regranting it", async () => {
    await grant(subscription());
    const refunded = await grant(subscription({ active: false, refunded: true, verifiedAt: now + 1 }));
    expect(refunded.progress).toMatchObject({ tier: "free", streakFreezes: 0 });
    const replay = await grant(subscription({ verifiedAt: now + 2 }));
    expect(replay.progress).toMatchObject({ tier: "free", streakFreezes: 0 });
    const reversed = await grant(subscription({ refunded: false, verifiedAt: now + 3 }));
    expect(reversed.progress).toMatchObject({ tier: "premium", streakFreezes: 3 });
  });

  it("refunds an earlier annual term without revoking a paid renewal", async () => {
    await grant(subscription());
    const renewal = subscription({ transactionId: "order-2", expiresAt: now + 730 * 86400000, verifiedAt: now + 1 });
    await grant(renewal);
    const refund = { ...renewal, verifiedAt: now + 2, relatedRefund: { transactionId: "order-1", refunded: true } };
    expect((await grant(refund)).progress).toMatchObject({ tier: "premium", streakFreezes: 3, subscriptionExpiry: renewal.expiresAt });
    expect((await grant(refund)).progress.streakFreezes).toBe(3);
    const reversed = await grant({ ...renewal, verifiedAt: now + 3, relatedRefund: { transactionId: "order-1", refunded: false } });
    expect(reversed.progress.streakFreezes).toBe(6);
  });

  it("cannot use a refund event to change an unrelated subscription's gift", async () => {
    await grant(subscription());
    await expect(grant(subscription({ token: "other", originalId: "other", transactionId: "other-order", verifiedAt: now + 1,
      relatedRefund: { transactionId: "order-1", refunded: true } }))).rejects.toMatchObject({ code: "purchase-account-mismatch" });
    expect(store.docs.get(`playerProgress/${owner}`)?.streakFreezes).toBe(3);
  });

  it("reverses a refunded gift from a replaced subscription without changing its successor", async () => {
    await grant(subscription());
    await grant(subscription({ token: "replacement", originalId: "replacement", transactionId: "next-order", replaces: "store-token", expiresAt: now + 10000, verifiedAt: now + 1 }));
    const refunded = await grant(subscription({ active: false, refunded: true, verifiedAt: now + 2 }));
    expect(refunded.progress).toMatchObject({ tier: "premium", streakFreezes: 3, subscriptionExpiry: now + 10000 });
  });

  it("retains another valid store subscription when one subscription is refunded", async () => {
    await grant(subscription());
    await grant(subscription({ store: "app-store", originalId: "apple-original", transactionId: "apple-order", expiresAt: now + 10000 }));
    const revoked = await grant(subscription({ active: false, verifiedAt: now + 1 }));
    expect(revoked.progress.tier).toBe("premium");
    expect(revoked.progress.subscriptionExpiry).toBe(now + 10000);
  });

  it("preserves an existing free-mode entitlement during the transition", async () => {
    Object.assign(store.docs.get(`playerProgress/${owner}`)!, { tier: "premium", subscriptionExpiry: now + 100000 });
    await grant(subscription());
    expect((await grant(subscription({ active: false, verifiedAt: now + 1 }))).progress.subscriptionExpiry).toBe(now + 100000);
  });

  it("never reactivates a replaced Google subscription from a late event", async () => {
    await grant(subscription());
    await grant(subscription({ token: "replacement", originalId: "replacement", transactionId: "next-order", replaces: "store-token", expiresAt: now + 10000, verifiedAt: now + 1 }));
    expect((await grant(subscription({ verifiedAt: now + 2 }))).progress.subscriptionExpiry).toBe(now + 10000);
  });

  it("cannot resurrect a deleted account from a store notification", async () => {
    store.docs.set(`accountDeletions/${owner}`, { status: "complete" });
    const before = structuredClone(store.docs);
    await expect(grant(consumable())).rejects.toMatchObject({ code: "account-deleting" });
    expect(store.docs).toEqual(before);
  });

  it("keeps a stable opaque account token and a private notification mapping", async () => {
    const a = await prepareBilling(store.database, config, owner, "google-play", true, now);
    const b = await prepareBilling(store.database, config, owner, "app-store", true, now);
    expect(a).toEqual({ accountToken });
    expect(b).toEqual(a);
    expect(await purchaseOwner(store.database, accountToken)).toBe(owner);
    expect(billingKey("google-play", "production", "token")).not.toContain("token");
  });

  it("blocks production checkout while the free shop is still enabled", async () => {
    store.docs.set("settings/player-security", { paymentsEnabled: false });
    await expect(prepareBilling(store.database, config, owner, "google-play", true, now)).rejects.toMatchObject({ code: "billing-unavailable" });
    await expect(prepareBilling(store.database, config, owner, "google-play", false, now)).resolves.toEqual({ accountToken });
  });

  it("limits repeated store verification requests independently of play", async () => {
    for (let i = 0; i < 40; i++) await prepareBilling(store.database, config, owner, "google-play", false, now);
    await expect(prepareBilling(store.database, config, owner, "google-play", false, now)).rejects.toMatchObject({ status: 429 });
    await expect(prepareBilling(store.database, config, owner, "google-play", false, now + 600001)).resolves.toEqual({ accountToken });
  });
});

describe("store verification boundaries", () => {
  const proof = { store: "google-play" as const, productId: "gems_100" as const, token: "token" };
  const product = () => ({ obfuscatedExternalAccountId: accountToken, purchaseCompletionTime: new Date(now - 1000).toISOString(), orderId: "order",
    purchaseStateContext: { purchaseState: "PURCHASED" }, acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    productLineItem: [{ productId: "gems_100", productOfferDetails: { quantity: 1, refundableQuantity: 1, consumptionState: "CONSUMPTION_STATE_YET_TO_BE_CONSUMED" } }] });
  const sub = () => ({ externalAccountIdentifiers: { obfuscatedExternalAccountId: accountToken }, startTime: new Date(now - 1000).toISOString(),
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    lineItems: [{ productId: "premium_monthly", expiryTime: new Date(now + 10000).toISOString(), latestSuccessfulOrderId: "order" }] });
  const apple = () => ({ productId: "premium_monthly", transactionId: "123", originalTransactionId: "122", appAccountToken: accountToken,
    bundleId: "com.example.app", purchaseDate: now - 1000, expiresDate: now + 10000, environment: Environment.SANDBOX, inAppOwnershipType: "PURCHASED", type: "Auto-Renewable Subscription" });

  it("rejects client supplied rewards, account ids and expiry dates", () => {
    for (const extra of [{ uid: "victim" }, { gems: 999999 }, { expiresAt: now + 1000 }, { active: true }]) {
      expect(purchaseRequestSchema.safeParse({ action: "verify", ...proof, ...extra }).success).toBe(false);
    }
  });
  it("requires a purchased state, matching SKU, valid time and account binding", () => {
    expect(googleProduct(product(), proof, now)).toMatchObject({ active: true, quantity: 1, accountToken });
    for (const patch of [{ obfuscatedExternalAccountId: undefined }, { purchaseCompletionTime: "bad" }, { productLineItem: [] }]) {
      expect(() => googleProduct({ ...product(), ...patch }, proof, now)).toThrow();
    }
    expect(() => googleProduct(product(), { ...proof, productId: "gems_500" }, now)).toThrow();
    expect(() => googleProduct({ ...product(), purchaseStateContext: { purchaseState: "PENDING" } }, proof, now)).toThrow(/awaiting/);
    expect(googleProduct({ ...product(), purchaseStateContext: { purchaseState: "CANCELLED" } }, proof, now).remainingQuantity).toBe(0);
  });
  it.each(["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_CANCELED", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"])("retains paid access for %s until the store expiry", (subscriptionState) => {
    expect(googleSubscription({ ...sub(), subscriptionState }, { ...proof, productId: "premium_monthly" }, now).active).toBe(true);
  });
  it.each(["SUBSCRIPTION_STATE_PAUSED", "SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_EXPIRED"])("removes access for %s even if an old expiry is in the future", (subscriptionState) => {
    expect(googleSubscription({ ...sub(), subscriptionState }, { ...proof, productId: "premium_monthly" }, now).active).toBe(false);
  });
  it("does not deliver an unpaid pending subscription", () => {
    expect(() => googleSubscription({ ...sub(), subscriptionState: "SUBSCRIPTION_STATE_PENDING" }, { ...proof, productId: "premium_monthly" }, now)).toThrow(/not completed/);
  });
  it("uses Apple grace-period expiry only when Apple reports grace status", () => {
    const input = { store: "app-store" as const, productId: "premium_monthly" as const, token: "123" };
    expect(applePurchase(apple(), input, now, Status.ACTIVE).expiresAt).toBe(now + 10000);
    expect(applePurchase(apple(), input, now, Status.BILLING_GRACE_PERIOD, { gracePeriodExpiresDate: now + 30000 }).expiresAt).toBe(now + 30000);
    expect(applePurchase(apple(), input, now, Status.REVOKED).active).toBe(false);
    expect(applePurchase({ ...apple(), revocationDate: now }, input, now, Status.ACTIVE).active).toBe(false);
    expect(() => applePurchase({ ...apple(), appAccountToken: undefined }, input, now, Status.ACTIVE)).toThrow();
    expect(() => applePurchase({ ...apple(), inAppOwnershipType: "FAMILY_SHARED" }, input, now, Status.ACTIVE)).toThrow();
  });
  it("rejects unsigned Apple webhook payloads using the actual signature verifier", async () => {
    const verifier = new StoreVerifier({ ...config, mode: "sandbox" });
    const forged = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ notificationType: "DID_RENEW" })).toString("base64url")}.`;
    await expect(verifier.appleNotification(forged)).rejects.toMatchObject({ code: "invalid-purchase" });
  });
  it("requires explicit setup and isolates sandbox accounts", () => {
    expect(billingConfig({}).mode).toBe("disabled");
    expect(() => requireBilling(billingConfig({}), "google-play", owner)).toThrow();
    expect(() => requireBilling(config, "google-play", "not-a-tester", "sandbox")).toThrow();
    expect(() => requireBilling({ ...config, mode: "sandbox" }, "google-play", owner, "production")).toThrow();
    expect(() => billingConfig({ NATIVE_BILLING_MODE: "typo" })).toThrow();
  });
});
