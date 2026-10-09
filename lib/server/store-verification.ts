import { GoogleAuth } from "google-auth-library";
import { AppStoreServerAPIClient, Environment, SignedDataVerifier, Status, VerificationException, VerificationStatus,
  type JWSTransactionDecodedPayload, type JWSRenewalInfoDecodedPayload, type ResponseBodyV2DecodedPayload } from "@apple/app-store-server-library";
import { z } from "zod";
import { appleRootCertificates } from "@/lib/server/store-apple-roots";
import { type BillingConfig, requireBilling } from "@/lib/server/store-config";
import { BillingError, invalidPurchase, knownProduct, subscriptionProduct, validAccountToken,
  type StoreEnvironment, type StoreProof, type VerifiedPurchase } from "@/lib/server/store-contract";

const positiveTime = (value: unknown) => typeof value === "string" ? Date.parse(value) : NaN;
const tokenSchema = z.string().uuid();
const productResponse = z.object({
  obfuscatedExternalAccountId: tokenSchema,
  purchaseCompletionTime: z.string().optional(),
  orderId: z.string().optional(),
  purchaseStateContext: z.object({ purchaseState: z.enum(["PURCHASED", "PENDING", "CANCELLED"]) }),
  testPurchaseContext: z.object({}).passthrough().optional(),
  acknowledgementState: z.enum(["ACKNOWLEDGEMENT_STATE_PENDING", "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"]),
  productLineItem: z.array(z.object({ productId: z.string(), productOfferDetails: z.object({
    quantity: z.number().int().min(1).max(100), refundableQuantity: z.number().int().min(0).max(100).optional(),
    consumptionState: z.enum(["CONSUMPTION_STATE_YET_TO_BE_CONSUMED", "CONSUMPTION_STATE_CONSUMED"]),
    rentOfferDetails: z.unknown().optional(),
  }) })).length(1),
});

const subscriptionResponse = z.object({
  externalAccountIdentifiers: z.object({ obfuscatedExternalAccountId: tokenSchema }).optional(),
  outOfAppPurchaseContext: z.object({ expiredPurchaseToken: z.string(), expiredExternalAccountIdentifiers: z.object({ obfuscatedExternalAccountId: tokenSchema }).optional() }).optional(),
  startTime: z.string().optional(),
  subscriptionState: z.enum(["SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_PAUSED", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_CANCELED", "SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED"]),
  acknowledgementState: z.enum(["ACKNOWLEDGEMENT_STATE_PENDING", "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"]),
  testPurchase: z.object({}).passthrough().optional(),
  linkedPurchaseToken: z.string().optional(),
  lineItems: z.array(z.object({ productId: z.string(), expiryTime: z.string().optional(), latestSuccessfulOrderId: z.string().optional() })).min(1).max(10),
});

export function googleProduct(value: unknown, proof: StoreProof, now: number): VerifiedPurchase {
  const parsed = productResponse.safeParse(value);
  if (!parsed.success) return invalidPurchase();
  const data = parsed.data;
  const line = data.productLineItem[0];
  if (line.productId !== proof.productId || subscriptionProduct(proof.productId) || line.productOfferDetails.rentOfferDetails) return invalidPurchase();
  if (data.purchaseStateContext.purchaseState === "PENDING") throw new BillingError("purchase-pending", "Your payment is awaiting approval from Google Play.");
  const purchasedAt = positiveTime(data.purchaseCompletionTime);
  if (!Number.isFinite(purchasedAt) || purchasedAt <= 0 || purchasedAt > now + 300000) return invalidPurchase();
  const active = data.purchaseStateContext.purchaseState === "PURCHASED";
  const quantity = line.productOfferDetails.quantity;
  const remainingQuantity = active ? line.productOfferDetails.refundableQuantity ?? quantity : 0;
  if (remainingQuantity > quantity) return invalidPurchase();
  return { ...proof, environment: data.testPurchaseContext ? "sandbox" : "production", accountToken: data.obfuscatedExternalAccountId.toLowerCase(),
    originalId: proof.token, transactionId: data.orderId ?? proof.token, purchasedAt, verifiedAt: now, subscription: false,
    active, expiresAt: null, quantity, remainingQuantity,
    consumed: line.productOfferDetails.consumptionState === "CONSUMPTION_STATE_CONSUMED",
    acknowledged: data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED" };
}

export function googleSubscription(value: unknown, proof: StoreProof, now: number): VerifiedPurchase {
  const parsed = subscriptionResponse.safeParse(value);
  if (!parsed.success) return invalidPurchase();
  const data = parsed.data;
  if (["SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED"].includes(data.subscriptionState)) {
    throw new BillingError("purchase-pending", "This subscription payment has not completed.");
  }
  const purchased = data.lineItems.filter((line) => line.latestSuccessfulOrderId && line.expiryTime);
  const line = purchased.sort((a, b) => positiveTime(b.expiryTime) - positiveTime(a.expiryTime))[0];
  const accountToken = data.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? data.outOfAppPurchaseContext?.expiredExternalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (!line || !knownProduct(line.productId) || !subscriptionProduct(line.productId) || !validAccountToken(accountToken)) return invalidPurchase();
  if (!subscriptionProduct(proof.productId)) return invalidPurchase();
  const expiresAt = positiveTime(line.expiryTime);
  const purchasedAt = positiveTime(data.startTime);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(purchasedAt) || expiresAt <= 0 || purchasedAt <= 0 || purchasedAt > now + 300000) return invalidPurchase();
  const active = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_CANCELED", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"].includes(data.subscriptionState) && expiresAt > now;
  return { ...proof, productId: line.productId, environment: data.testPurchase ? "sandbox" : "production", accountToken: accountToken.toLowerCase(),
    originalId: proof.token, transactionId: line.latestSuccessfulOrderId!, purchasedAt, verifiedAt: now,
    subscription: true, active, expiresAt, quantity: 1, remainingQuantity: active ? 1 : 0,
    consumed: false, acknowledged: data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    ...(data.linkedPurchaseToken || data.outOfAppPurchaseContext?.expiredPurchaseToken ? { replaces: data.linkedPurchaseToken ?? data.outOfAppPurchaseContext!.expiredPurchaseToken } : {}) };
}

export function applePurchase(transaction: JWSTransactionDecodedPayload, proof: StoreProof, now: number,
  status?: number, renewal?: JWSRenewalInfoDecodedPayload): VerifiedPurchase {
  if (!knownProduct(transaction.productId) || !transaction.transactionId || !transaction.originalTransactionId || !validAccountToken(transaction.appAccountToken)
    || !Number.isSafeInteger(transaction.purchaseDate) || transaction.purchaseDate! <= 0 || transaction.purchaseDate! > now + 300000
    || (transaction.environment !== Environment.PRODUCTION && transaction.environment !== Environment.SANDBOX)
    || transaction.inAppOwnershipType !== "PURCHASED") return invalidPurchase();
  const subscription = subscriptionProduct(transaction.productId);
  if (subscription !== subscriptionProduct(proof.productId) || (!subscription && transaction.productId !== proof.productId)
    || transaction.type !== (subscription ? "Auto-Renewable Subscription" : "Consumable")) return invalidPurchase();
  const quantity = transaction.quantity ?? 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return invalidPurchase();
  let expiresAt: number | null = null;
  let active = !transaction.revocationDate && transaction.isUpgraded !== true;
  if (subscription) {
    expiresAt = status === Status.BILLING_GRACE_PERIOD ? renewal?.gracePeriodExpiresDate ?? null : transaction.expiresDate ?? null;
    if (!Number.isSafeInteger(expiresAt) || expiresAt! <= 0) return invalidPurchase();
    active = active && (status === Status.ACTIVE || status === Status.BILLING_GRACE_PERIOD) && expiresAt! > now;
  }
  return { ...proof, token: transaction.transactionId, productId: transaction.productId,
    environment: transaction.environment === Environment.SANDBOX ? "sandbox" : "production", accountToken: transaction.appAccountToken.toLowerCase(),
    originalId: transaction.originalTransactionId, transactionId: transaction.transactionId, purchasedAt: transaction.purchaseDate!, verifiedAt: now,
    subscription, active, expiresAt, quantity, remainingQuantity: active ? quantity : 0, consumed: false, acknowledged: true,
    refunded: !!transaction.revocationDate || status === Status.REVOKED };
}

function unavailable(): never {
  throw new BillingError("store-unavailable", "Your purchase is waiting for verification. Please retry; you do not need to buy it again.", 503);
}

async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BillingError("store-unavailable", "The store is taking a moment. Please retry.", 503)), 15000); })]); }
  finally { clearTimeout(timer); }
}

export class StoreVerifier {
  private googleAuth?: GoogleAuth;
  private appleClients = new Map<StoreEnvironment, { client: AppStoreServerAPIClient; verifier: SignedDataVerifier }>();
  constructor(readonly config: BillingConfig) {}

  private apple(environment: StoreEnvironment) {
    let instance = this.appleClients.get(environment);
    if (instance) return instance;
    const config = this.config.apple;
    if (!config) return unavailable();
    const target = environment === "sandbox" ? Environment.SANDBOX : Environment.PRODUCTION;
    instance = { client: new AppStoreServerAPIClient(config.privateKey, config.keyId, config.issuerId, config.bundleId, target),
      verifier: new SignedDataVerifier(appleRootCertificates, true, target, config.bundleId, config.appId) };
    this.appleClients.set(environment, instance);
    return instance;
  }

  private async google(path: string, method: "GET" | "POST" = "GET") {
    if (!this.config.google) return unavailable();
    this.googleAuth ??= new GoogleAuth({ credentials: this.config.google.credentials, scopes: ["https://www.googleapis.com/auth/androidpublisher"] });
    const client = await this.googleAuth.getClient();
    try {
      return (await client.request({ url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(this.config.google.packageName)}/purchases/${path}`,
        method, timeout: 10000, retry: false, ...(method === "POST" ? { data: {} } : {}) })).data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (method === "GET" && (status === 404 || status === 410 || status === 400)) return invalidPurchase();
      return unavailable();
    }
  }

  async verify(proof: StoreProof, now = Date.now()): Promise<VerifiedPurchase> {
    requireBilling(this.config, proof.store);
    if (proof.store === "google-play") {
      const encoded = encodeURIComponent(proof.token);
      return subscriptionProduct(proof.productId)
        ? googleSubscription(await this.google(`subscriptionsv2/tokens/${encoded}`), proof, now)
        : googleProduct(await this.google(`productsv2/tokens/${encoded}`), proof, now);
    }
    if (!/^\d{1,40}$/.test(proof.token)) return invalidPurchase();
    const environments: StoreEnvironment[] = proof.environment ? [proof.environment] : this.config.mode === "sandbox" ? ["sandbox"] : ["production", "sandbox"];
    for (const environment of environments) {
      const { client, verifier } = this.apple(environment);
      try {
        const response = await bounded(client.getTransactionInfo(proof.token));
        if (!response.signedTransactionInfo) return invalidPurchase();
        let transaction = await bounded(verifier.verifyAndDecodeTransaction(response.signedTransactionInfo));
        if (transaction.transactionId !== proof.token || transaction.productId !== proof.productId) return invalidPurchase();
        if (subscriptionProduct(proof.productId)) {
          const original = transaction;
          const subscriptions = await bounded(client.getAllSubscriptionStatuses(proof.token));
          const current = subscriptions.data?.flatMap((group) => group.lastTransactions ?? []).find((item) => item.originalTransactionId === transaction.originalTransactionId);
          if (!current?.signedTransactionInfo) return invalidPurchase();
          const initialAccount = transaction.appAccountToken;
          transaction = await bounded(verifier.verifyAndDecodeTransaction(current.signedTransactionInfo));
          if (transaction.appAccountToken !== initialAccount || transaction.originalTransactionId !== current.originalTransactionId) return invalidPurchase();
          const renewal = current.signedRenewalInfo ? await bounded(verifier.verifyAndDecodeRenewalInfo(current.signedRenewalInfo)) : undefined;
          if (renewal && renewal.originalTransactionId !== transaction.originalTransactionId) return invalidPurchase();
          const purchase = applePurchase(transaction, proof, now, current.status, renewal);
          if (original.transactionId !== purchase.transactionId) {
            purchase.relatedRefund = { transactionId: original.transactionId!, refunded: !!original.revocationDate };
          }
          return purchase;
        }
        return applePurchase(transaction, proof, now);
      } catch (error) {
        if (error instanceof BillingError) throw error;
        if ((error as { httpStatusCode?: number }).httpStatusCode === 404) continue;
        if (error instanceof VerificationException && error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) return invalidPurchase();
        return unavailable();
      }
    }
    return invalidPurchase();
  }

  async finalize(purchase: VerifiedPurchase) {
    if (purchase.store !== "google-play" || !purchase.active) return;
    const product = encodeURIComponent(purchase.productId);
    const token = encodeURIComponent(purchase.token);
    if (purchase.subscription) {
      if (!purchase.acknowledged) await this.google(`subscriptions/${product}/tokens/${token}:acknowledge`, "POST");
    } else if (!purchase.consumed) {
      try { await this.google(`products/${product}/tokens/${token}:consume`, "POST"); }
      catch (error) {
        const fresh = await this.verify(purchase);
        if (!fresh.consumed) throw error;
      }
    }
  }

  async googleNotificationPurchase(token: string, subscription: boolean, now = Date.now()) {
    requireBilling(this.config, "google-play");
    if (!token || token.length > 8192 || /\s/.test(token)) return invalidPurchase();
    const encoded = encodeURIComponent(token);
    if (subscription) return googleSubscription(await this.google(`subscriptionsv2/tokens/${encoded}`), { store: "google-play", token, productId: "premium_monthly" }, now);
    const data = await this.google(`productsv2/tokens/${encoded}`);
    const parsed = productResponse.safeParse(data);
    const productId = parsed.success ? parsed.data.productLineItem[0].productId : null;
    if (!knownProduct(productId)) return invalidPurchase();
    return googleProduct(data, { store: "google-play", token, productId }, now);
  }

  async appleNotification(signedPayload: string): Promise<{ notification: ResponseBodyV2DecodedPayload; transaction?: JWSTransactionDecodedPayload; environment: StoreEnvironment }> {
    requireBilling(this.config, "app-store");
    const environments: StoreEnvironment[] = this.config.mode === "sandbox" ? ["sandbox"] : ["production", "sandbox"];
    for (const environment of environments) {
      const { verifier } = this.apple(environment);
      try {
        const notification = await bounded(verifier.verifyAndDecodeNotification(signedPayload));
        const transaction = notification.data?.signedTransactionInfo ? await bounded(verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo)) : undefined;
        return { notification, transaction, environment };
      } catch (error) {
        if (error instanceof BillingError) throw error;
        if (error instanceof VerificationException && [VerificationStatus.INVALID_ENVIRONMENT, VerificationStatus.INVALID_APP_IDENTIFIER].includes(error.status)) continue;
        if (error instanceof VerificationException && error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) return unavailable();
        return invalidPurchase();
      }
    }
    return invalidPurchase();
  }
}
