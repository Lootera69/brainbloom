"use client";

import { playerCommand, refreshPlayerProgress } from "@/services/player-progress";

export interface PurchaseResult {
  success: boolean;
  productId: string;
  error?: string;
}

export type PurchaseProvider = "mock" | "stripe";

let currentProvider: PurchaseProvider = "mock";

export function setPurchaseProvider(p: PurchaseProvider) {
  currentProvider = p;
}

export function getPurchaseProvider(): PurchaseProvider {
  return currentProvider;
}

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (currentProvider === "stripe") {
    return { success: false, productId, error: "Stripe not yet configured" };
  }

  try {
    const reply = await playerCommand({ action: 'shop', productId });
    if (reply.productId !== productId) throw new Error('The purchase could not be confirmed. Please retry.');
    return { success: true, productId };
  } catch (error) {
    return { success: false, productId, error: error instanceof Error ? error.message : 'Connect and retry.' };
  }
}

export async function restorePurchases(): Promise<PurchaseResult[]> {
  await refreshPlayerProgress();
  return [];
}
