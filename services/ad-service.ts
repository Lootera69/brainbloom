"use client";

// TEMP: Mock ad provider — replace with real ad SDK (AdMob, etc.) when available
export type AdProvider = "mock" | "admob";

let currentProvider: AdProvider = "mock";

export function setAdProvider(p: AdProvider) {
  currentProvider = p;
}

export function getAdProvider(): AdProvider {
  return currentProvider;
}

// TEMP: Mock ad duration — 15 seconds to simulate real ad experience
export const MOCK_AD_DURATION = 15;

// TEMP: Mock rewarded ad — simulates watching a 15s ad
export async function showRewardedAd(): Promise<boolean> {
  if (currentProvider === "admob") {
    console.warn("[AD] AdMob not yet configured — falling back to mock");
  }

  console.log("[MOCK AD] Showing rewarded ad...");

  // TEMP: 15 second delay to simulate real ad
  await new Promise((r) => setTimeout(r, MOCK_AD_DURATION * 1000));

  const rewarded = Math.random() > 0.05;

  if (rewarded) {
    console.log("[MOCK AD] Ad completed — reward granted");
  } else {
    console.log("[MOCK AD] Ad skipped — no reward");
  }

  return rewarded;
}
