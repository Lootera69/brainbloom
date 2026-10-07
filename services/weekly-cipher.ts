"use client";

import { getFirebase } from "@/services/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getPuzzle, getWeeklyContent } from "@/services/player-content";
import type { Puzzle } from "@/types/puzzle";

const WEEKLY_CIPHER_KEY = "brainbloom-weekly-cipher";
const CIPHER_HISTORY_KEY = "brainbloom-cipher-history";
const CIPHER_HISTORY_MAX = 26;

let serverPhase: CipherPhase | null = null;

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

export async function getWeeklyCipher(): Promise<Puzzle | null> {
  const result = await getWeeklyContent();
  serverPhase = result.phase;
  if (result.puzzle) {
    const entry = { puzzleId: result.puzzle.id, weekStart: result.weekStart, setBy: result.setBy };
    saveLocalWeekly(entry);
    await rememberCipherWeek(entry);
  }
  return result.puzzle;
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
  serverPhase = null;
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

export function isSunday(): boolean {
  return new Date().getUTCDay() === 0;
}

export type CipherPhase = "active" | "hint" | "closed";

export function getCipherPhase(): CipherPhase {
  return serverPhase ?? 'active';
}

export function getWeekStart(ts?: number): string {
  const d = ts === undefined ? new Date() : new Date(ts);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}
