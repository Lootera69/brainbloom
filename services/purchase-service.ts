"use client";

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

  console.log(`[MOCK PURCHASE] Processing purchase: ${productId}`);

  await new Promise((r) => setTimeout(r, 1500));

  const purchase = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    productId,
    timestamp: Date.now(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem("brainbloom-purchases") || "[]");
    existing.push(purchase);
    localStorage.setItem("brainbloom-purchases", JSON.stringify(existing));
  } catch {
    console.warn("Failed to save purchase to localStorage");
  }

  console.log(`[MOCK PURCHASE] Completed: ${productId}`);
  return { success: true, productId };
}

export async function restorePurchases(): Promise<PurchaseResult[]> {
  if (currentProvider === "stripe") {
    return [];
  }

  try {
    const raw = localStorage.getItem("brainbloom-purchases");
    if (!raw) return [];
    return JSON.parse(raw).map((p: { productId: string }) => ({
      success: true,
      productId: p.productId,
    }));
  } catch {
    return [];
  }
}
