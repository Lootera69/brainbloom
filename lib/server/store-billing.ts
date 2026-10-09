import { randomUUID } from "node:crypto";
import type { PlayerProgress } from "@/lib/player-contract";
import type { Data, PlayerDatabase } from "@/lib/server/player-engine";
import { initialProgress, refreshProgress } from "@/lib/server/player-progress";
import { BillingError, billingKey, validAccountToken, type Store, type StoreProof, type VerifiedPurchase } from "@/lib/server/store-contract";
import { requireBilling, type BillingConfig } from "@/lib/server/store-config";

type Subscription = { store: Store; environment: "sandbox" | "production"; productId: StoreProof["productId"]; token: string; expiresAt: number; active: boolean; verifiedAt: number };
type Account = Data & { accountToken: string; subscriptions?: Record<string, Subscription>; legacyPremiumExpiry?: number; legacyLifetime?: boolean };

export async function prepareBilling(database: PlayerDatabase, config: BillingConfig, uid: string, store: Store, selling: boolean, now = Date.now()) {
  requireBilling(config, store, uid);
  const freshToken = randomUUID();
  return database.transaction(async (tx) => {
    const [saved, deletion, settings] = await tx.getAll([`billingAccounts/${uid}`, `accountDeletions/${uid}`, selling && config.mode === "production" ? "settings/player-security" : null]);
    if (deletion) throw new BillingError("account-deleting", "Account deletion is in progress.", 403);
    if (selling && config.mode === "production" && settings?.paymentsEnabled !== true) {
      throw new BillingError("billing-unavailable", "Paid checkout is not available yet.", 503);
    }
    const startedAt = typeof saved?.windowStartedAt === "number" && now - saved.windowStartedAt < 600000 ? saved.windowStartedAt : now;
    const count = startedAt === saved?.windowStartedAt && typeof saved?.requests === "number" ? saved.requests : 0;
    if (count >= 40) throw new BillingError("billing-rate-limit", "Please wait a few minutes before retrying purchases.", 429);
    const accountToken = validAccountToken(saved?.accountToken) ? saved.accountToken : freshToken;
    tx.put(`billingAccounts/${uid}`, { ...saved, accountToken, requests: count + 1, windowStartedAt: startedAt });
    if (!saved) tx.put(`billingTokens/${accountToken}`, { uid, createdAt: now });
    return { accountToken };
  });
}

export async function purchaseOwner(database: PlayerDatabase, token: string) {
  if (!validAccountToken(token)) return null;
  return database.transaction(async (tx) => {
    const record = await tx.get(`billingTokens/${token.toLowerCase()}`);
    return typeof record?.uid === "string" ? record.uid : null;
  });
}

export async function storedSubscriptions(database: PlayerDatabase, uid: string, store: Store, now = Date.now()): Promise<StoreProof[]> {
  return database.transaction(async (tx) => {
    const account = await tx.get(`billingAccounts/${uid}`) as Account | undefined;
    return Object.values(account?.subscriptions ?? {}).filter((item) => item.store === store && item.expiresAt > now - 45 * 86400000)
      .slice(0, 12).map(({ store, productId, token, environment }) => ({ store, productId, token, environment }));
  });
}

export async function fulfillPurchase(database: PlayerDatabase, config: BillingConfig, uid: string, purchase: VerifiedPurchase, now = Date.now()) {
  requireBilling(config, purchase.store, uid, purchase.environment);
  const orderKey = billingKey(purchase.store, purchase.environment, purchase.subscription ? purchase.transactionId : purchase.originalId);
  const sourceKey = billingKey(purchase.store, purchase.environment, purchase.originalId);
  const replacedKey = purchase.replaces ? billingKey(purchase.store, purchase.environment, purchase.replaces) : null;
  const relatedKey = purchase.subscription && purchase.relatedRefund && purchase.relatedRefund.transactionId !== purchase.transactionId
    ? billingKey(purchase.store, purchase.environment, purchase.relatedRefund.transactionId) : null;
  return database.transaction(async (tx) => {
    const [deletion, rawAccount, saved, order, source, replaced, related] = await tx.getAll([
      `accountDeletions/${uid}`, `billingAccounts/${uid}`, `playerProgress/${uid}`, `storeOrders/${orderKey}`,
      purchase.subscription ? `storeSubscriptions/${sourceKey}` : null, replacedKey ? `storeSubscriptions/${replacedKey}` : null,
      relatedKey ? `storeOrders/${relatedKey}` : null,
    ]);
    if (deletion) throw new BillingError("account-deleting", "Account deletion is in progress.", 403);
    const account = rawAccount as Account | undefined;
    if (!account || account.accountToken !== purchase.accountToken || [order, source, replaced, related].some((record) => record && record.uid !== uid)
      || (related && (related.accountToken !== purchase.accountToken || related.originalId !== purchase.originalId))) {
      throw new BillingError("purchase-account-mismatch", "Sign in to the account used for this purchase, then restore purchases.", 403);
    }
    if (saved && saved.version !== 1) throw new BillingError("progress-version", "Update the app before restoring purchases.");
    if (!order && purchase.consumed && !purchase.subscription) {
      throw new BillingError("purchase-already-consumed", "This purchase has already been delivered. Contact support if items are missing.");
    }
    if (order && (order.productId !== purchase.productId || order.accountToken !== purchase.accountToken)) {
      throw new BillingError("purchase-conflict", "This purchase could not be matched to your account.");
    }
    let state = refreshProgress(saved as unknown as PlayerProgress ?? initialProgress(now), now);
    const previousQuantity = typeof order?.deliveredQuantity === "number" ? order.deliveredQuantity : 0;
    const orderStale = typeof order?.verifiedAt === "number" && order.verifiedAt > purchase.verifiedAt;
    const stale = orderStale || (typeof source?.verifiedAt === "number" && source.verifiedAt > purchase.verifiedAt) || !!source?.supersededBy;
    const subscriptionRefunded = purchase.subscription && (orderStale ? order?.refunded === true : purchase.refunded ?? order?.refunded === true);
    const active = purchase.active && !subscriptionRefunded;
    const reinstated = purchase.refunded === false && order?.refunded === true;
    const quantity = orderStale ? previousQuantity : purchase.subscription
      ? subscriptionRefunded ? 0 : reinstated ? purchase.quantity : stale ? previousQuantity : Math.max(previousQuantity, active ? 1 : 0)
      : purchase.store === "google-play" && order ? Math.min(previousQuantity, purchase.remainingQuantity) : purchase.remainingQuantity;
    const refunded = purchase.subscription ? subscriptionRefunded : quantity < purchase.quantity;
    const delta = quantity - previousQuantity;
    const gems = { gems_100: 100, gems_500: 500, gems_1200: 1200 }[purchase.productId as "gems_100"];
    if (gems) state.gems += gems * delta;
    if (purchase.productId === "streak_freeze_3" || purchase.productId === "premium_yearly") state.streakFreezes += 3 * delta;
    if (purchase.productId === "heart_refill" && delta !== 0) {
      state.hearts = delta > 0 ? 5 : Math.max(0, state.hearts + 5 * delta);
      state.nextHeartAt = state.hearts === 5 ? null : state.nextHeartAt ?? now + 5 * 3600000;
    }
    if (related && relatedKey && purchase.relatedRefund && !(typeof related.verifiedAt === "number" && related.verifiedAt > purchase.verifiedAt)) {
      const previous = typeof related.deliveredQuantity === "number" ? related.deliveredQuantity : 0;
      const next = purchase.relatedRefund.refunded ? 0 : related.refunded === true && typeof related.quantity === "number" ? related.quantity : previous;
      if (related.productId === "premium_yearly") state.streakFreezes += 3 * (next - previous);
      tx.put(`storeOrders/${relatedKey}`, { ...related, deliveredQuantity: next, remainingQuantity: next,
        refunded: purchase.relatedRefund.refunded, verifiedAt: purchase.verifiedAt });
    }
    if (purchase.subscription && !stale) {
      const subscriptions = { ...(account.subscriptions ?? {}) };
      if (account.legacyPremiumExpiry === undefined) {
        account.legacyPremiumExpiry = state.tier === "premium" ? state.subscriptionExpiry ?? 0 : 0;
        account.legacyLifetime = state.tier === "premium" && state.subscriptionExpiry === null;
      }
      if (replacedKey && replacedKey !== sourceKey) {
        if (subscriptions[replacedKey]) subscriptions[replacedKey] = { ...subscriptions[replacedKey], active: false };
        tx.put(`storeSubscriptions/${replacedKey}`, { ...replaced, uid, supersededBy: sourceKey, verifiedAt: purchase.verifiedAt });
      }
      for (const [key, item] of Object.entries(subscriptions)) {
        if (item.expiresAt < now - 45 * 86400000 && key !== sourceKey) delete subscriptions[key];
      }
      if (!subscriptions[sourceKey] && Object.keys(subscriptions).length >= 12) {
        throw new BillingError("subscription-limit", "Contact support to restore this subscription.");
      }
      subscriptions[sourceKey] = { store: purchase.store, environment: purchase.environment, productId: purchase.productId, token: purchase.token,
        expiresAt: purchase.expiresAt ?? 0, active, verifiedAt: purchase.verifiedAt };
      const expiry = Math.max(account.legacyPremiumExpiry ?? 0, ...Object.values(subscriptions).map((item) => item.active ? item.expiresAt : 0));
      state.tier = account.legacyLifetime || expiry > now ? "premium" : "free";
      state.subscriptionExpiry = account.legacyLifetime ? null : expiry || now;
      account.subscriptions = subscriptions;
      tx.put(`storeSubscriptions/${sourceKey}`, { uid, accountToken: purchase.accountToken, transactionId: purchase.transactionId,
        productId: purchase.productId, expiresAt: purchase.expiresAt, active, verifiedAt: purchase.verifiedAt, supersededBy: null });
      tx.put(`billingAccounts/${uid}`, account);
    }
    if (!orderStale) tx.put(`storeOrders/${orderKey}`, { uid, accountToken: purchase.accountToken, store: purchase.store, environment: purchase.environment,
      productId: purchase.productId, transactionId: purchase.transactionId, originalId: purchase.originalId, token: purchase.token,
      quantity: purchase.quantity, remainingQuantity: quantity, deliveredQuantity: quantity, purchasedAt: purchase.purchasedAt, verifiedAt: purchase.verifiedAt,
      createdAt: order?.createdAt ?? now, refunded });
    state = refreshProgress(state, now);
    state.revision++;
    tx.put(`playerProgress/${uid}`, state as unknown as Data);
    tx.put(`users/${uid}`, { ...state, progressVersion: 1 }, true);
    return { progress: state, serverTime: now, productId: purchase.productId, delivered: purchase.subscription ? active && !stale : quantity > 0,
      replayed: !!order, refunded };
  });
}

export async function billingSnapshot(database: PlayerDatabase, uid: string, now = Date.now()) {
  return database.transaction(async (tx) => {
    const [saved, deletion] = await tx.getAll([`playerProgress/${uid}`, `accountDeletions/${uid}`]);
    if (deletion) throw new BillingError("account-deleting", "Account deletion is in progress.", 403);
    if (!saved || saved.version !== 1) throw new BillingError("progress-unavailable", "Sign in again before restoring purchases.", 409);
    const progress = refreshProgress(saved as unknown as PlayerProgress, now);
    progress.revision++;
    tx.put(`playerProgress/${uid}`, progress as unknown as Data);
    tx.put(`users/${uid}`, { ...progress, progressVersion: 1 }, true);
    return { progress, serverTime: now };
  });
}
