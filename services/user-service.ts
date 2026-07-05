"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";

interface SyncData {
  xp: number;
  streak: number;
  hearts: number;
  nextHeartAt: number | null;
  gems: number;
  completedPuzzleIds: string[];
  questsRewarded: string[];
  streakFreezes: number;
  lastActiveDate: string | null;
}

let firestore: ReturnType<typeof import("firebase/firestore").getFirestore> | null = null;

function getDb() {
  if (firestore) return firestore;
  try {
    const { db } = require("./firebase").getFirebase();
    firestore = db;
    return db;
  } catch {
    return null;
  }
}

export async function saveUserData(uid: string, data: SyncData): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.error("Failed to save user data to Firestore:", e);
  }
}

export async function loadUserData(uid: string): Promise<SyncData | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      xp: d.xp ?? 0,
      streak: d.streak ?? 0,
      hearts: d.hearts ?? 5,
      nextHeartAt: d.nextHeartAt ?? null,
      gems: d.gems ?? 0,
      completedPuzzleIds: d.completedPuzzleIds ?? [],
      questsRewarded: d.questsRewarded ?? [],
      streakFreezes: d.streakFreezes ?? 0,
      lastActiveDate: d.lastActiveDate ?? null,
    };
  } catch (e) {
    console.error("Failed to load user data from Firestore:", e);
    return null;
  }
}

export function extractSyncData(state: {
  xp: number;
  streak: number;
  hearts: number;
  nextHeartAt: number | null;
  gems: number;
  completedPuzzleIds: string[];
  questsRewarded: string[];
  streakFreezes: number;
  lastActiveDate: string | null;
}): SyncData {
  return {
    xp: state.xp,
    streak: state.streak,
    hearts: state.hearts,
    nextHeartAt: state.nextHeartAt,
    gems: state.gems,
    completedPuzzleIds: state.completedPuzzleIds,
    questsRewarded: state.questsRewarded,
    streakFreezes: state.streakFreezes,
    lastActiveDate: state.lastActiveDate,
  };
}
