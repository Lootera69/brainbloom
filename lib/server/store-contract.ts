import { createHash } from "node:crypto";
import { z } from "zod";

export const storeProductIds = ["gems_100", "gems_500", "gems_1200", "heart_refill", "streak_freeze_3", "premium_monthly", "premium_yearly"] as const;
export type StoreProductId = typeof storeProductIds[number];
export type Store = "google-play" | "app-store";
export type StoreEnvironment = "sandbox" | "production";

export const purchaseRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), store: z.enum(["google-play", "app-store"]) }).strict(),
  z.object({ action: z.literal("verify"), store: z.enum(["google-play", "app-store"]), productId: z.enum(storeProductIds), token: z.string().min(1).max(8192).regex(/^\S+$/) }).strict(),
  z.object({ action: z.literal("restore"), store: z.enum(["google-play", "app-store"]) }).strict(),
]);

export interface StoreProof {
  store: Store;
  productId: StoreProductId;
  token: string;
  environment?: StoreEnvironment;
}

export interface VerifiedPurchase extends StoreProof {
  environment: StoreEnvironment;
  accountToken: string;
  transactionId: string;
  originalId: string;
  purchasedAt: number;
  verifiedAt: number;
  subscription: boolean;
  active: boolean;
  expiresAt: number | null;
  quantity: number;
  remainingQuantity: number;
  consumed: boolean;
  acknowledged: boolean;
  replaces?: string;
  refunded?: boolean;
  relatedRefund?: { transactionId: string; refunded: boolean };
}

export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}

export const billingKey = (...parts: string[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
export const subscriptionProduct = (productId: string) => productId === "premium_monthly" || productId === "premium_yearly";
export const knownProduct = (productId: unknown): productId is StoreProductId => typeof productId === "string" && storeProductIds.includes(productId as StoreProductId);
export const validAccountToken = (value: unknown): value is string => typeof value === "string" && z.string().uuid().safeParse(value).success;

export function invalidPurchase(): never {
  throw new BillingError("invalid-purchase", "The store could not verify this purchase.", 400);
}
