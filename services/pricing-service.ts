"use client";

import type { PricingConfig } from "@/lib/subscription";
import { DEFAULT_PRICING } from "@/lib/subscription";

const STORAGE_KEY = "brainbloom-pricing-config";

let firestore: any = null;

function getFs() {
  if (firestore) return firestore;
  try {
    const f = require("./firebase").getFirebase();
    firestore = f.db;
    return firestore;
  } catch {
    return null;
  }
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const db = getFs();
  if (db) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const ref = doc(db, "settings", "pricing");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { ...DEFAULT_PRICING, ...snap.data() } as PricingConfig;
      }
    } catch {
      // Firestore unavailable — fall through to localStorage
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PRICING, ...JSON.parse(raw) };
  } catch {
    // ignore
  }

  return DEFAULT_PRICING;
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    console.warn("Failed to save pricing to localStorage");
  }

  const db = getFs();
  if (db) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "settings", "pricing"), config, { merge: true });
    } catch {
      // Firestore unavailable
    }
  }
}
