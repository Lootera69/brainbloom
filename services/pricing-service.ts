"use client";

import type { PricingConfig } from "@/lib/subscription";
import { DEFAULT_PRICING } from "@/lib/subscription";
import { getFirebase } from "@/services/firebase";
import type { Firestore } from "firebase/firestore";

const STORAGE_KEY = "brainbloom-pricing-config";
const CACHE_TTL = 600_000; // 10 minutes — pricing changes rarely
const FS_TIMEOUT = 3_000; // don't block UI on slow Firestore

let pricingCache: { data: PricingConfig; ts: number } | null = null;

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

function readLocalPricing(): PricingConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PRICING, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return null;
}

function writeLocalPricing(config: PricingConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

async function fetchFromFirestore(): Promise<PricingConfig | null> {
  const db = getFs();
  if (!db) return null;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await Promise.race([
      getDoc(doc(db, "settings", "pricing")),
      new Promise<null>((r) => setTimeout(() => r(null), FS_TIMEOUT)),
    ]);
    if (snap && snap.exists()) {
      return { ...DEFAULT_PRICING, ...snap.data() } as PricingConfig;
    }
  } catch {
    // Firestore unavailable — fall through
  }
  return null;
}

export async function getPricingConfig(): Promise<PricingConfig> {
  if (pricingCache && Date.now() - pricingCache.ts < CACHE_TTL) {
    return pricingCache.data;
  }

  const local = readLocalPricing();
  if (local) {
    pricingCache = { data: local, ts: Date.now() };
    void fetchFromFirestore().then((remote) => {
      if (remote) {
        pricingCache = { data: remote, ts: Date.now() };
        writeLocalPricing(remote);
      }
    });
    return local;
  }

  const remote = await fetchFromFirestore();
  if (remote) {
    pricingCache = { data: remote, ts: Date.now() };
    writeLocalPricing(remote);
    return remote;
  }

  const config = DEFAULT_PRICING;
  pricingCache = { data: config, ts: Date.now() };
  return config;
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  pricingCache = { data: config, ts: Date.now() };
  writeLocalPricing(config);

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
