"use client";

export type AdProvider = "mock" | "admob";

let currentProvider: AdProvider = "mock";

export function setAdProvider(p: AdProvider) {
  currentProvider = p;
}

export function getAdProvider(): AdProvider {
  return currentProvider;
}

export async function showRewardedAd(): Promise<boolean> {
  if (currentProvider === "admob") {
    console.warn("[AD] AdMob not yet configured — falling back to mock");
  }

  console.log("[MOCK AD] Showing rewarded ad...");

  await new Promise((r) => setTimeout(r, 3000));

  const rewarded = Math.random() > 0.05;

  if (rewarded) {
    console.log("[MOCK AD] Ad completed — reward granted");
  } else {
    console.log("[MOCK AD] Ad skipped — no reward");
  }

  return rewarded;
}
