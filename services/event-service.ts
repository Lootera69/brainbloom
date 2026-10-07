"use client";

import { getFirebase } from "@/services/firebase";
import { SEED_EVENTS } from "@/lib/events/event-seed";
import type { AuthoredEventTheme, EventConfigDoc } from "@/lib/events/event-theme";
import { publicEventConfig, type PublicEventConfig } from "@/lib/events/public-event";

const STORAGE_KEY = "event_public_config_v1";
const CACHE_TTL = 300_000;
let configCache: { data: PublicEventConfig; ts: number } | null = null;

export function seedConfig(): PublicEventConfig {
  return { seasonalThemesEnabled: true, events: SEED_EVENTS, updatedAt: 0 };
}

function readLocal(): PublicEventConfig | null {
  try {
    localStorage.removeItem("brainbloom-event-config");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.events) ? publicEventConfig(parsed) : null;
  } catch { return null; }
}

function writeLocal(config: PublicEventConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(publicEventConfig(config))); } catch {}
}

async function fetchPublic(): Promise<PublicEventConfig | null> {
  try {
    const response = await fetch("/api/events", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.events)) return null;
    return publicEventConfig(data);
  } catch { return null; }
}

export async function getEventConfig(): Promise<PublicEventConfig> {
  if (configCache && Date.now() - configCache.ts < CACHE_TTL) return configCache.data;
  const local = readLocal();
  if (local) {
    configCache = { data: local, ts: Date.now() };
    void fetchPublic().then((remote) => {
      if (!remote) return;
      configCache = { data: remote, ts: Date.now() };
      writeLocal(remote);
    });
    return local;
  }
  const remote = await fetchPublic();
  const data = remote ?? seedConfig();
  configCache = { data, ts: Date.now() };
  if (remote) writeLocal(remote);
  return data;
}

export async function getAdminEventConfig(): Promise<EventConfigDoc & { published: boolean }> {
  const user = getFirebase().auth?.currentUser;
  if (!user) throw new Error("Sign in to manage Moments.");
  const token = await user.getIdToken();
  const response = await fetch("/api/admin/events", { headers: { Authorization: `Bearer ${token}` },
    cache: "no-store", signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  if (getFirebase().auth?.currentUser?.uid !== user.uid) throw new Error("Your sign-in changed. Please reload Moments.");
  if (!response.ok || !Array.isArray(data.events)) throw new Error(data.error ?? "Could not load Moments.");
  return data;
}

export async function saveEventConfig(events: AuthoredEventTheme[], seasonalThemesEnabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const db = getFirebase().db;
  if (!db) return { ok: false, error: "Connect to the internet to publish Moments." };
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const payload: EventConfigDoc = { seasonalThemesEnabled, events, updatedAt: Date.now() };
    await setDoc(doc(db, "settings", "events"), payload);
    const data = publicEventConfig(payload);
    configCache = { data, ts: Date.now() };
    writeLocal(data);
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Publish failed." }; }
}

export function clearEventConfigCache() { configCache = null; }
