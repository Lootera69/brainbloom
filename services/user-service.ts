"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Activity, Achievement, DailyQuest } from "@/store/user-store";

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

export interface UserDocument {
  displayName: string;
  email: string | null;
  photoURL: string | null;
  xp: number;
  xpToday: number;
  streak: number;
  lastActiveDate: string | null;
  hearts: number;
  nextHeartAt: number | null;
  level: number;
  gems: number;
  dailyGoal: number;
  lastPlayedCategory: string | null;
  history: Activity[];
  achievements: Achievement[];
  lastRewardClaim: string | null;
  streakFreezes: number;
  practiceHeartsToday: number;
  lastPracticeDate: string | null;
  dailyQuests: DailyQuest[];
  lastQuestRefresh: string | null;
  completedPuzzleIds: string[];
  questsRewarded: string[];
  dailyPuzzleCompletedDate: string | null;
  dailyPuzzleStreak: number;
  dailyPuzzleLastDate: string | null;
  soundEnabled: boolean;
  weeklyXp: number;
  weeklyStartDate: number;
  frozenDays: string[];
  brokenDays: string[];
  dailyGoalStreak: number;
  dailyGoalLastHitDate: string | null;
}

export async function saveUserData(uid: string, data: UserDocument): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.error("Failed to save user data to Firestore:", e);
  }
}

export async function loadUserData(uid: string): Promise<Partial<UserDocument> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data() as Record<string, unknown>;
    return {
      displayName: d.displayName as string ?? "",
      email: d.email as string | null ?? null,
      photoURL: d.photoURL as string | null ?? null,
      xp: (d.xp as number) ?? 0,
      xpToday: (d.xpToday as number) ?? 0,
      streak: (d.streak as number) ?? 0,
      lastActiveDate: d.lastActiveDate as string | null ?? null,
      hearts: (d.hearts as number) ?? 5,
      nextHeartAt: d.nextHeartAt as number | null ?? null,
      level: (d.level as number) ?? 1,
      gems: (d.gems as number) ?? 0,
      dailyGoal: (d.dailyGoal as number) ?? 100,
      lastPlayedCategory: d.lastPlayedCategory as string | null ?? null,
      history: (d.history as Activity[]) ?? [],
      achievements: (d.achievements as Achievement[]) ?? [],
      lastRewardClaim: d.lastRewardClaim as string | null ?? null,
      streakFreezes: (d.streakFreezes as number) ?? 0,
      practiceHeartsToday: (d.practiceHeartsToday as number) ?? 0,
      lastPracticeDate: d.lastPracticeDate as string | null ?? null,
      dailyQuests: (d.dailyQuests as DailyQuest[]) ?? [],
      lastQuestRefresh: d.lastQuestRefresh as string | null ?? null,
      completedPuzzleIds: (d.completedPuzzleIds as string[]) ?? [],
      questsRewarded: (d.questsRewarded as string[]) ?? [],
      dailyPuzzleCompletedDate: d.dailyPuzzleCompletedDate as string | null ?? null,
      dailyPuzzleStreak: (d.dailyPuzzleStreak as number) ?? 0,
      dailyPuzzleLastDate: d.dailyPuzzleLastDate as string | null ?? null,
      soundEnabled: (d.soundEnabled as boolean) ?? true,
    };
  } catch (e) {
    console.error("Failed to load user data from Firestore:", e);
    return null;
  }
}
