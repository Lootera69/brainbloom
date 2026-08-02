import type { Activity, Achievement } from "@/store/user-store";

export type GuestMergeActivity = Activity;
export type GuestMergeAchievement = Achievement;

export interface GuestMergeData {
  xp: number;
  gems: number;
  streak: number;
  streakFreezes: number;
  level: number;
  weeklyXp: number;
  dailyPuzzleStreak: number;
  cipherSolveCount: number;
  xpToday: number;
  puzzlesPlayedToday: number;
  hearts: number;
  nextHeartAt: number | null;
  completedPuzzleIds: string[];
  experiencedWonderIds: string[];
  questsRewarded: string[];
  activeDates: string[];
  frozenDays: string[];
  brokenDays: string[];
  history: GuestMergeActivity[];
  achievements: GuestMergeAchievement[];
}

export function hasMeaningfulGuestData(d: Partial<GuestMergeData>): boolean {
  return (
    (d.xp ?? 0) > 0 ||
    (d.gems ?? 0) > 0 ||
    (d.streak ?? 0) > 0 ||
    (d.streakFreezes ?? 0) > 0 ||
    (d.cipherSolveCount ?? 0) > 0 ||
    (d.completedPuzzleIds?.length ?? 0) > 0 ||
    (d.experiencedWonderIds?.length ?? 0) > 0 ||
    (d.achievements?.length ?? 0) > 0
  );
}

function unionStrings(local: string[], cloud: string[]): string[] {
  return [...new Set([...cloud, ...local])];
}

function unionById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cloud) map.set(item.id, item);
  for (const item of local) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

function max(a: number, b: number): number {
  return a > b ? a : b;
}

function earliestTimestamp(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return a < b ? a : b;
}

export function mergeGuestProgress(local: GuestMergeData, cloud: GuestMergeData): GuestMergeData {
  return {
    xp: max(local.xp, cloud.xp),
    gems: max(local.gems, cloud.gems),
    streak: max(local.streak, cloud.streak),
    streakFreezes: max(local.streakFreezes, cloud.streakFreezes),
    level: max(local.level, cloud.level),
    weeklyXp: max(local.weeklyXp, cloud.weeklyXp),
    dailyPuzzleStreak: max(local.dailyPuzzleStreak, cloud.dailyPuzzleStreak),
    cipherSolveCount: max(local.cipherSolveCount, cloud.cipherSolveCount),
    xpToday: max(local.xpToday, cloud.xpToday),
    puzzlesPlayedToday: max(local.puzzlesPlayedToday, cloud.puzzlesPlayedToday),
    hearts: Math.min(5, max(local.hearts, cloud.hearts)),
    nextHeartAt: earliestTimestamp(local.nextHeartAt, cloud.nextHeartAt),
    completedPuzzleIds: unionStrings(local.completedPuzzleIds, cloud.completedPuzzleIds),
    experiencedWonderIds: unionStrings(local.experiencedWonderIds, cloud.experiencedWonderIds),
    questsRewarded: unionStrings(local.questsRewarded, cloud.questsRewarded),
    activeDates: unionStrings(local.activeDates, cloud.activeDates),
    frozenDays: unionStrings(local.frozenDays, cloud.frozenDays),
    brokenDays: unionStrings(local.brokenDays, cloud.brokenDays),
    history: unionById(local.history, cloud.history),
    achievements: unionById(local.achievements, cloud.achievements),
  };
}

export function guestMergeSummary(d: GuestMergeData) {
  return {
    xp: d.xp,
    gems: d.gems,
    streak: d.streak,
    puzzles: d.completedPuzzleIds.length,
    wonders: d.experiencedWonderIds.length,
    achievements: d.achievements.length,
  };
}
