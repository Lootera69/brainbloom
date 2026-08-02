"use client";

import { getFirebase } from "@/services/firebase";
import { doc, getDoc, setDoc, runTransaction, Timestamp } from "firebase/firestore";
import { getPublishedPuzzles, getPuzzle } from "@/services/puzzle-service";
import type { Puzzle } from "@/types/puzzle";

const WEEKLY_CIPHER_KEY = "brainbloom-weekly-cipher";
const CIPHER_HISTORY_KEY = "brainbloom-cipher-history";
const CIPHER_HISTORY_MAX = 26;

let weeklyCipherCache: { puzzle: Puzzle | null; weekStart: string } | null = null;

export interface CipherHistoryEntry {
  weekStart: string;
  puzzleId: string;
  setBy: "auto" | "admin";
}

interface WeeklyCipherDoc {
  puzzleId: string;
  weekStart: string;
  setBy: "auto" | "admin";
  setByUser?: string;
}

function isFirestoreAvailable() {
  const { db } = getFirebase();
  return !!db;
}

function getLocalWeekly(): WeeklyCipherDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WEEKLY_CIPHER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalWeekly(doc: WeeklyCipherDoc) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WEEKLY_CIPHER_KEY, JSON.stringify(doc));
}

function getLocalHistory(): CipherHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CIPHER_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(entries: CipherHistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CIPHER_HISTORY_KEY, JSON.stringify(entries));
}

function mergeHistory(a: CipherHistoryEntry[], b: CipherHistoryEntry[]): CipherHistoryEntry[] {
  const map = new Map<string, CipherHistoryEntry>();
  for (const e of [...b, ...a]) {
    if (!map.has(e.weekStart)) map.set(e.weekStart, e);
  }
  return [...map.values()]
    .sort((x, y) => y.weekStart.localeCompare(x.weekStart))
    .slice(0, CIPHER_HISTORY_MAX);
}

async function rememberCipherWeek(entry: CipherHistoryEntry) {
  const local = getLocalHistory();
  if (local.length > 0 && local[0].weekStart === entry.weekStart && local[0].puzzleId === entry.puzzleId) {
    return;
  }
  const merged = mergeHistory([entry], local);
  saveLocalHistory(merged);
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "cipher-history");
        await setDoc(ref, { weeks: merged, updatedAt: Timestamp.fromMillis(Date.now()) }, { merge: true });
      }
    } catch (e) {
      console.error("Firestore rememberCipherWeek failed:", e);
    }
  }
}

export async function getCipherHistory(): Promise<CipherHistoryEntry[]> {
  const local = getLocalHistory();
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "cipher-history");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as { weeks?: CipherHistoryEntry[] };
          if (Array.isArray(data.weeks) && data.weeks.length > 0) {
            const merged = mergeHistory(data.weeks, local);
            saveLocalHistory(merged);
            return merged;
          }
        }
      }
    } catch (e) {
      console.error("Firestore getCipherHistory failed:", e);
    }
  }
  return local;
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split("T")[0];
}

function weeksSinceEpoch(weekStart: string): number {
  return Math.floor(new Date(weekStart + "T00:00:00Z").getTime() / 604800000);
}

export async function getWeeklyCipher(): Promise<Puzzle | null> {
  const weekStart = getWeekStart();

  if (weeklyCipherCache && weeklyCipherCache.weekStart === weekStart) {
    return weeklyCipherCache.puzzle;
  }

  let result: Puzzle | null = null;

  const local = getLocalWeekly();
  if (local && local.weekStart === weekStart) {
    const puzzle = await getPuzzle(local.puzzleId);
    if (puzzle?.published && puzzle.type === "cipher") result = puzzle;
  }

  if (!result && isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "weekly-cipher");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as WeeklyCipherDoc & { updatedAt?: Timestamp };
          if (data.weekStart === weekStart) {
            const puzzle = await getPuzzle(data.puzzleId);
            if (puzzle?.published && puzzle.type === "cipher") {
              saveLocalWeekly({ puzzleId: data.puzzleId, weekStart: data.weekStart, setBy: data.setBy, setByUser: data.setByUser });
              result = puzzle;
            }
          }
        }
      }
    } catch (e) {
      console.error("Firestore getWeeklyCipher failed:", e);
    }
  }

  if (!result) {
    result = await autoPickWeeklyCipher(weekStart);
  }

  if (result) {
    const local = getLocalWeekly();
    rememberCipherWeek({ puzzleId: result.id, weekStart, setBy: local?.setBy ?? "auto" });
  }

  weeklyCipherCache = { puzzle: result, weekStart };
  return result;
}

async function autoPickWeeklyCipher(weekStart: string): Promise<Puzzle | null> {
  const all = await getPublishedPuzzles();
  const ciphers = all.filter((p) => p.type === "cipher");
  if (ciphers.length === 0) return null;

  const sorted = [...ciphers].sort((a, b) => a.id.localeCompare(b.id));
  const idx = weeksSinceEpoch(weekStart) % sorted.length;
  const pick = sorted[idx];

  const docData: WeeklyCipherDoc = {
    puzzleId: pick.id,
    weekStart,
    setBy: "auto",
  };

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "weekly-cipher");
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref);
          if (!snap.exists() || (snap.data() as WeeklyCipherDoc).weekStart !== weekStart) {
            transaction.set(ref, { ...docData, updatedAt: Timestamp.fromMillis(Date.now()) }, { merge: true });
          }
        });
      }
    } catch (e) {
      console.error("Firestore autoPick weekly cipher failed:", e);
    }
  }

  saveLocalWeekly(docData);
  rememberCipherWeek(docData);
  return pick;
}

export async function setWeeklyCipher(puzzleId: string, setByUser?: string): Promise<boolean> {
  const weekStart = getWeekStart();
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle?.published || puzzle.type !== "cipher") return false;

  const docData: WeeklyCipherDoc = {
    puzzleId,
    weekStart,
    setBy: "admin",
    setByUser,
  };

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "weekly-cipher");
        await setDoc(ref, { ...docData, updatedAt: Timestamp.fromMillis(Date.now()) }, { merge: true });
      }
    } catch (e) {
      console.error("Firestore setWeeklyCipher failed:", e);
    }
  }

  saveLocalWeekly(docData);
  rememberCipherWeek(docData);
  weeklyCipherCache = null;
  return true;
}

export async function getCurrentWeekCipherId(): Promise<string | null> {
  const weekStart = getWeekStart();
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "weekly-cipher");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as WeeklyCipherDoc;
          if (data.weekStart === weekStart) return data.puzzleId;
        }
      }
    } catch {
    }
  }
  const local = getLocalWeekly();
  if (local?.weekStart === weekStart) return local.puzzleId;
  return null;
}

// TEMP DEV OVERRIDE: localStorage.setItem("brainbloom-force-sunday","true") to force Sunday mode
// REVERT: remove the localStorage check below to restore real date detection
export function isSunday(): boolean {
  if (typeof window !== "undefined" && localStorage.getItem("brainbloom-force-sunday")) return true;
  return new Date().getUTCDay() === 0;
}

/**
 * Weekly cipher lifecycle (all boundaries in UTC):
 *   Sun–Thu → "active"  : solving open, no hint shown (recognition only)
 *   Fri      → "hint"    : solving still open, the descriptive question is shown as a hint
 *   Sat      → "closed"  : solving disabled, answer + explanation revealed to everyone
 * A new cipher is picked each Sunday (see autoPickWeeklyCipher).
 *
 * TEMP DEV OVERRIDE: localStorage.setItem("brainbloom-cipher-phase","active|hint|closed")
 * to force a phase, or "brainbloom-force-sunday" to force the Sunday/active start.
 * REVERT: remove the localStorage checks below to restore real date detection.
 */
export type CipherPhase = "active" | "hint" | "closed";

export function getCipherPhase(): CipherPhase {
  if (typeof window !== "undefined") {
    const forced = localStorage.getItem("brainbloom-cipher-phase");
    if (forced === "active" || forced === "hint" || forced === "closed") return forced;
    if (localStorage.getItem("brainbloom-force-sunday")) return "active";
  }
  const day = new Date().getUTCDay(); // 0=Sun … 6=Sat
  if (day === 6) return "closed"; // Saturday
  if (day === 5) return "hint";   // Friday
  return "active";                // Sunday–Thursday
}

// TEMP DEV OVERRIDE: also override getWeekStart so the auto-pick uses today as the "Sunday"
// REVERT: remove the localStorage check to restore real week calculation
export function getWeekStart(ts?: number): string {
  if (typeof window !== "undefined" && localStorage.getItem("brainbloom-force-sunday")) {
    const d = ts ? new Date(ts) : new Date();
    return d.toISOString().split("T")[0];
  }
  const d = ts ? new Date(ts) : new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? 0 : -day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}
