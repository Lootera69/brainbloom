"use client";

import type { PricingConfig } from "@/lib/subscription";
import { DEFAULT_PRICING } from "@/lib/subscription";
import { getFirebase } from "@/services/firebase";
import type { Firestore } from "firebase/firestore";

const STORAGE_KEY = "brainbloom-pricing-config";

let pricingCache: { data: PricingConfig; ts: number } | null = null;
const CACHE_TTL = 600_000; // 10 minutes — pricing changes rarely

let firestore: Firestore | null = null;

function getFs() {
  if (firestore) return firestore;
  try {
    const f = getFirebase();
    firestore = f.db;
    return firestore;
  } catch {
    return null;
  }
}

export async function getPricingConfig(): Promise<PricingConfig> {
  if (pricingCache && Date.now() - pricingCache.ts < CACHE_TTL) {
    return pricingCache.data;
  }

  const db = getFs();
  if (db) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const ref = doc(db, "settings", "pricing");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const config = { ...DEFAULT_PRICING, ...snap.data() } as PricingConfig;
        pricingCache = { data: config, ts: Date.now() };
        return config;
      }
    } catch {
      // Firestore unavailable — fall through to localStorage
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const config = { ...DEFAULT_PRICING, ...JSON.parse(raw) };
      pricingCache = { data: config, ts: Date.now() };
      return config;
    }
  } catch {
    // ignore
  }

  const config = DEFAULT_PRICING;
  pricingCache = { data: config, ts: Date.now() };
  return config;
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  pricingCache = null;

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
