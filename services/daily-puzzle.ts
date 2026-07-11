"use client";

import { getFirebase } from "@/services/firebase";
import { doc, getDoc, setDoc, runTransaction, Timestamp } from "firebase/firestore";
import { getPublishedPuzzles, getPuzzle } from "@/services/puzzle-service";
import type { Puzzle } from "@/types/puzzle";

const DAILY_PUZZLE_KEY = "brainbloom-daily-puzzle";

interface DailyPuzzleDoc {
  puzzleId: string;
  date: string;
  setBy: "auto" | "admin";
  setByUser?: string;
}

function isFirestoreAvailable() {
  const { db } = getFirebase();
  return !!db;
}

function getLocalDaily(): DailyPuzzleDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_PUZZLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalDaily(doc: DailyPuzzleDoc) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_PUZZLE_KEY, JSON.stringify(doc));
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getDailyPuzzle(): Promise<Puzzle | null> {
  const today = getToday();

  // 1. Try local first — fastest path, no network
  const local = getLocalDaily();
  if (local && local.date === today) {
    const puzzle = await getPuzzle(local.puzzleId);
    if (puzzle?.published) return puzzle;
  }

  // 2. Try Firestore
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return fallbackPick(today);
      const ref = doc(db, "settings", "daily-puzzle");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as DailyPuzzleDoc & { updatedAt?: Timestamp };
        if (data.date === today) {
          const puzzle = await getPuzzle(data.puzzleId);
          if (puzzle?.published) {
            saveLocalDaily({ puzzleId: data.puzzleId, date: data.date, setBy: data.setBy, setByUser: data.setByUser });
            return puzzle;
          }
        }
      }
    } catch (e) {
      console.error("Firestore getDailyPuzzle failed:", e);
    }
  }

  // 3. Auto-pick and save
  return autoPickAndSave(today);
}

async function autoPickAndSave(today: string): Promise<Puzzle | null> {
  const published = await getPublishedPuzzles();
  if (published.length === 0) return null;

  const sorted = [...published].sort((a, b) => a.id.localeCompare(b.id));
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const idx = daysSinceEpoch % sorted.length;
  const pick = sorted[idx];

  const docData: DailyPuzzleDoc = {
    puzzleId: pick.id,
    date: today,
    setBy: "auto",
  };

  // Save to Firestore (transaction to avoid race conditions)
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "daily-puzzle");
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(ref);
          if (!snap.exists() || (snap.data() as DailyPuzzleDoc).date !== today) {
            transaction.set(ref, { ...docData, updatedAt: Timestamp.fromMillis(Date.now()) }, { merge: true });
          }
        });
      }
    } catch (e) {
      console.error("Firestore autoPick daily puzzle failed:", e);
    }
  }

  saveLocalDaily(docData);
  return pick;
}

async function fallbackPick(today: string): Promise<Puzzle | null> {
  const published = await getPublishedPuzzles();
  if (published.length === 0) return null;

  const sorted = [...published].sort((a, b) => a.id.localeCompare(b.id));
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const idx = daysSinceEpoch % sorted.length;
  const pick = sorted[idx];

  saveLocalDaily({ puzzleId: pick.id, date: today, setBy: "auto" });
  return pick;
}

export async function setDailyPuzzle(puzzleId: string, setByUser?: string): Promise<boolean> {
  const today = getToday();
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle?.published) return false;

  const docData: DailyPuzzleDoc = {
    puzzleId,
    date: today,
    setBy: "admin",
    setByUser,
  };

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "daily-puzzle");
        await setDoc(ref, { ...docData, updatedAt: Timestamp.fromMillis(Date.now()) }, { merge: true });
      }
    } catch (e) {
      console.error("Firestore setDailyPuzzle failed:", e);
    }
  }

  saveLocalDaily(docData);
  return true;
}

export async function getTodayDailyPuzzleId(): Promise<string | null> {
  const today = getToday();
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "settings", "daily-puzzle");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as DailyPuzzleDoc;
          if (data.date === today) return data.puzzleId;
        }
      }
    } catch {
      // fallback to local
    }
  }
  const local = getLocalDaily();
  if (local?.date === today) return local.puzzleId;
  return null;
}
