import { generateKeyPairSync } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { fulfillPurchase } from "@/lib/server/store-billing";
import { playerDatabase } from "@/lib/server/player-database";
import { initialProgress } from "@/lib/server/player-progress";
import type { BillingConfig } from "@/lib/server/store-config";
import type { VerifiedPurchase } from "@/lib/server/store-contract";

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("store delivery with real Firestore transactions", () => {
  let app: App;
  let db: Firestore;
  const now = Date.parse("2026-10-08T10:00:00Z");
  const uid = "store-emulator-payer";
  const accountToken = "cb2b8aae-33aa-4d8d-8c76-59a16b3c6e34";
  const config: BillingConfig = { mode: "sandbox", testUids: new Set([uid]), google: { packageName: "com.example.app", credentials: { client_email: "unused@example.test", private_key: "unused" } } };
  const purchase: VerifiedPurchase = { store: "google-play", productId: "gems_100", token: "emulator-token", environment: "sandbox", accountToken,
    transactionId: "emulator-order", originalId: "emulator-token", purchasedAt: now - 1000, verifiedAt: now, subscription: false, active: true,
    expiresAt: null, quantity: 1, remainingQuantity: 1, consumed: false, acknowledged: false };
  beforeAll(() => {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? "")) throw new Error("Only a local emulator is allowed.");
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    app = initializeApp({ projectId: "demo-security", credential: cert({ projectId: "demo-security", clientEmail: "emulator@demo-security.iam.gserviceaccount.com", privateKey }) }, "store-tests");
    db = getFirestore(app);
  });
  beforeEach(async () => {
    await db.recursiveDelete(db.collection("storeOrders"));
    await db.recursiveDelete(db.collection("storeSubscriptions"));
    await db.doc(`accountDeletions/${uid}`).delete();
    await db.doc(`billingAccounts/${uid}`).set({ accountToken });
    await db.doc(`playerProgress/${uid}`).set(initialProgress(now));
    await db.doc(`users/${uid}`).set({ displayName: "Store test" });
  });
  afterAll(async () => { await deleteApp(app); });
  const grant = (value = purchase) => fulfillPurchase(playerDatabase(db, "demo-security"), config, uid, value, now);

  it("commits one delivery when client retries and a notification race", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => grant()));
    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect((await db.doc(`playerProgress/${uid}`).get()).data()?.gems).toBe(100);
    expect((await db.doc(`users/${uid}`).get()).data()?.displayName).toBe("Store test");
    expect((await db.collection("storeOrders").get()).size).toBe(1);
  }, 20000);

  it("applies one refund when several identical callbacks arrive", async () => {
    await grant();
    await Promise.all(Array.from({ length: 5 }, () => grant({ ...purchase, remainingQuantity: 0, active: false, verifiedAt: now + 1000 })));
    expect((await db.doc(`playerProgress/${uid}`).get()).data()?.gems).toBe(0);
  }, 20000);

  it("atomically records a renewal and its entitlement without double bonuses", async () => {
    const subscription = { ...purchase, subscription: true, productId: "premium_yearly" as const, expiresAt: now + 365 * 86400000 };
    await Promise.all([grant(subscription), grant(subscription)]);
    const result = (await db.doc(`playerProgress/${uid}`).get()).data();
    expect(result).toMatchObject({ tier: "premium", subscriptionExpiry: subscription.expiresAt, streakFreezes: 3 });
    expect((await db.collection("storeSubscriptions").get()).size).toBe(1);
  }, 20000);

  it("cannot leave purchase data behind when account deletion races delivery", async () => {
    const deletion = async () => {
      await db.runTransaction(async (tx) => {
        const marker = db.doc(`accountDeletions/${uid}`);
        if (!(await tx.get(marker)).exists) tx.create(marker, { status: "pending" });
      });
      await db.doc(`users/${uid}`).delete();
      await db.doc(`playerProgress/${uid}`).delete();
      await db.doc(`billingAccounts/${uid}`).delete();
      await db.doc(`accountDeletions/${uid}`).set({ status: "complete" });
    };
    const [, deleted] = await Promise.allSettled([grant(), deletion()]);
    expect(deleted.status).toBe("fulfilled");
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
    expect((await db.doc(`playerProgress/${uid}`).get()).exists).toBe(false);
    await expect(grant()).rejects.toMatchObject({ code: "account-deleting" });
  }, 20000);
});
