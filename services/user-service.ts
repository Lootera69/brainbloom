"use client";

import { doc, getDocFromServer, setDoc } from "firebase/firestore";
import { getUserSessionVersion, type Activity, type Achievement, type DailyQuest } from "@/store/user-store";
import { getFirebase } from "@/services/firebase";
import { playerApi } from "@/services/player-service";
import { rememberPlayerProgress } from "@/lib/verified-player-progress";
import { editableProfile } from "@/lib/player-profile";

let firestore: ReturnType<typeof import("firebase/firestore").getFirestore> | null = null;

function getDb() {
  if (firestore) return firestore;
  try {
    const { db } = getFirebase();
    firestore = db;
    return db;
  } catch {
    return null;
  }
}
export interface UserDocument {
  progressVersion?: number;
  revision?: number;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  avatarId: string | null;
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
  dailySetDate: string | null;
  dailySetCompletedIds: string[];
  dailySetHeartLost: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  theme: "light" | "dark" | "system";
  timeZone: string | null;
  weeklyXp: number;
  weeklyStartDate: number;
  frozenDays: string[];
  brokenDays: string[];
  dailyGoalStreak: number;
  dailyGoalLastHitDate: string | null;
  streakStartDate: string | null;
  activeDates: string[];
  tier: "free" | "premium";
  subscriptionExpiry: number | null;
  puzzlesPlayedToday: number;
  puzzlesPlayedDate: string | null;
  adsWatchedToday: number;
  adsWatchDate: string | null;
  experiencedWonderIds: string[];
  currentCipherWeek: string | null;
  currentCipherSolved: boolean;
  cipherSolveCount: number;
  cipherRevealed: boolean;
  cipherSolvedWeeks: string[];
  updatedAt: number;
}

export async function saveUserData(uid: string, data: UserDocument): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, editableProfile({ ...data, profileUpdatedAt: Date.now() }), { merge: true });
  } catch (e) {
    console.error("Failed to save user data to Firestore:", e);
  }
}

export async function loadUserData(uid: string): Promise<Partial<UserDocument> | null> {
  const db = getDb();
  const auth = getFirebase().auth;
  const session = getUserSessionVersion();
  if (!db || !auth) throw new Error('Sign in to restore progress.');
  await auth.authStateReady();
  if (getUserSessionVersion() !== session || auth.currentUser?.uid !== uid) throw new Error('Sign in to restore progress.');
  const [profile, snapshot] = await Promise.all([
    getDocFromServer(doc(db, 'users', uid)),
    playerApi.send({ action: 'snapshot', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  ]);
  if (getUserSessionVersion() !== session || auth.currentUser?.uid !== uid) throw new Error('Your sign-in changed.');
  return { ...editableProfile(profile.data() ?? {}), ...rememberPlayerProgress(uid, snapshot.progress), progressVersion: 1 };
}
