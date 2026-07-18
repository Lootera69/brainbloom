"use client";

import { getFirebase } from "@/services/firebase";
import { doc, getDoc, setDoc, runTransaction, Timestamp } from "firebase/firestore";
import { getPublishedPuzzles, getPuzzle } from "@/services/puzzle-service";
import type { Puzzle } from "@/types/puzzle";

const WEEKLY_CIPHER_KEY = "brainbloom-weekly-cipher";

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

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split("T")[0];
}

function isSameWeek(storedWeekStart: string): boolean {
  return storedWeekStart === getWeekStart();
}

function weeksSinceEpoch(weekStart: string): number {
  return Math.floor(new Date(weekStart + "T00:00:00Z").getTime() / 604800000);
}

export async function getWeeklyCipher(): Promise<Puzzle | null> {
  const weekStart = getWeekStart();

  const local = getLocalWeekly();
  if (local && local.weekStart === weekStart) {
    const puzzle = await getPuzzle(local.puzzleId);
    if (puzzle?.published && puzzle.type === "cipher") return puzzle;
  }

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return fallbackPick(weekStart);
      const ref = doc(db, "settings", "weekly-cipher");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as WeeklyCipherDoc & { updatedAt?: Timestamp };
        if (data.weekStart === weekStart) {
          const puzzle = await getPuzzle(data.puzzleId);
          if (puzzle?.published && puzzle.type === "cipher") {
            saveLocalWeekly({ puzzleId: data.puzzleId, weekStart: data.weekStart, setBy: data.setBy, setByUser: data.setByUser });
            return puzzle;
          }
        }
      }
    } catch (e) {
      console.error("Firestore getWeeklyCipher failed:", e);
    }
  }

  return autoPickWeeklyCipher(weekStart);
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
  return pick;
}

async function fallbackPick(weekStart: string): Promise<Puzzle | null> {
  const all = await getPublishedPuzzles();
  const ciphers = all.filter((p) => p.type === "cipher");
  if (ciphers.length === 0) return null;

  const sorted = [...ciphers].sort((a, b) => a.id.localeCompare(b.id));
  const idx = weeksSinceEpoch(weekStart) % sorted.length;
  const pick = sorted[idx];

  saveLocalWeekly({ puzzleId: pick.id, weekStart, setBy: "auto" });
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

export function getCipherDayState(): "sunday" | "week-reveal" {
  return isSunday() ? "sunday" : "week-reveal";
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
