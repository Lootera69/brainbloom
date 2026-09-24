"use client";

import { getFirebase } from "@/services/firebase";
import type { Firestore } from "firebase/firestore";
import { SEED_EVENTS } from "@/lib/events/event-seed";
import type { EventConfigDoc, EventTheme } from "@/lib/events/event-theme";

const STORAGE_KEY = "brainbloom-event-config";
const CACHE_TTL = 300_000; // 5 min — events change rarely
const FS_TIMEOUT = 5_000;

interface CachedConfig {
  seasonalThemesEnabled: boolean;
  events: EventTheme[];
  updatedAt: number;
}

let configCache: { data: CachedConfig; ts: number } | null = null;
let firestore: Firestore | null = null;

function getFs(): Firestore | null {
  if (firestore) return firestore;
  try {
    firestore = getFirebase().db;
    return firestore;
  } catch {
    return null;
  }
}

/** The always-available default: every bundled Moment, seasonal theming on. */
export function seedConfig(): CachedConfig {
  return {
    seasonalThemesEnabled: true,
    events: SEED_EVENTS,
    updatedAt: 0,
  };
}

/** Union published events over the seed by id, so the Studio always manages the
 *  full calendar even if an older/partial document was published. Published
 *  rows win; seed-only events are appended so nothing silently disappears. */
function mergeWithSeed(published: EventTheme[]): EventTheme[] {
  const byId = new Map<string, EventTheme>();
  for (const e of SEED_EVENTS) byId.set(e.id, e);
  for (const e of published) byId.set(e.id, e);
  return [...byId.values()];
}

function readLocal(): CachedConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedConfig>;
    if (!Array.isArray(parsed.events)) return null;
    return {
      seasonalThemesEnabled: parsed.seasonalThemesEnabled ?? true,
      events: mergeWithSeed(parsed.events),
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(config: CachedConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

async function fetchFromFirestore(): Promise<CachedConfig | null> {
  const db = getFs();
  if (!db) return null;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await Promise.race([
      getDoc(doc(db, "settings", "events")),
      new Promise<null>((r) => setTimeout(() => r(null), FS_TIMEOUT)),
    ]);
    if (snap && snap.exists()) {
      const data = snap.data() as Partial<EventConfigDoc>;
      const events = Array.isArray(data.events) ? data.events : [];
      return {
        seasonalThemesEnabled: data.seasonalThemesEnabled ?? true,
        events: mergeWithSeed(events),
        updatedAt: data.updatedAt ?? 0,
      };
    }
  } catch {
    // Firestore unavailable — fall through
  }
  return null;
}

/** Reads the current config: local cache first (instant), then refreshes from
 *  Firestore in the background. Falls back to the bundled seed. */
export async function getEventConfig(): Promise<CachedConfig> {
  if (configCache && Date.now() - configCache.ts < CACHE_TTL) {
    return configCache.data;
  }

  const local = readLocal();
  if (local) {
    configCache = { data: local, ts: Date.now() };
    void fetchFromFirestore().then((remote) => {
      if (remote) {
        configCache = { data: remote, ts: Date.now() };
        writeLocal(remote);
      }
    });
    return local;
  }

  const remote = await fetchFromFirestore();
  if (remote) {
    configCache = { data: remote, ts: Date.now() };
    writeLocal(remote);
    return remote;
  }

  const seed = seedConfig();
  configCache = { data: seed, ts: Date.now() };
  return seed;
}

/** Whether Firestore has an authored document yet (vs. serving the seed). */
export async function isPublished(): Promise<boolean> {
  const db = getFs();
  if (!db) return false;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "settings", "events"));
    return !!snap && snap.exists();
  } catch {
    return false;
  }
}

/** Publishes the full calendar to `settings/events`. Always writes the whole
 *  set (the Flutter app replaces its bundled calendar with a non-empty remote
 *  one, so a partial write would hide Moments). */
export async function saveEventConfig(
  events: EventTheme[],
  seasonalThemesEnabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const updatedAt = Date.now();
  const config: CachedConfig = { seasonalThemesEnabled, events, updatedAt };
  configCache = { data: config, ts: Date.now() };
  writeLocal(config);

  const db = getFs();
  if (!db) return { ok: false, error: "Firestore unavailable — saved locally only." };
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const payload: EventConfigDoc = { seasonalThemesEnabled, events, updatedAt };
    await setDoc(doc(db, "settings", "events"), payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Publish failed." };
  }
}

export function clearEventConfigCache() {
  configCache = null;
}
