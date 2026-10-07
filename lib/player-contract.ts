export interface PlayerProgress {
  version: number;
  revision: number;
  timeZone: string;
  xp: number;
  xpToday: number;
  level: number;
  gems: number;
  hearts: number;
  nextHeartAt: number | null;
  tier: "free" | "premium";
  subscriptionExpiry: number | null;
  streak: number;
  streakFreezes: number;
  lastActiveDate: string | null;
  lastEvalDate: string | null;
  streakStartDate: string | null;
  activeDates: string[];
  frozenDays: string[];
  brokenDays: string[];
  dailyGoal: number;
  dailyGoalStreak: number;
  dailyGoalLastHitDate: string | null;
  weeklyXp: number;
  weeklyStartDate: number;
  lastRewardClaim: string | null;
  puzzlesPlayedToday: number;
  puzzlesPlayedDate: string | null;
  adsWatchedToday: number;
  adsWatchDate: string | null;
  practiceHeartsToday: number;
  lastPracticeDate: string | null;
  practiceCompletedIds: string[];
  dailyQuests: { id: string; title: string; description: string; target: number; progress: number; reward: number; icon: string }[];
  questsRewarded: string[];
  lastQuestRefresh: string | null;
  completedPuzzleIds: string[];
  history: { id: string; type: "daily" | "challenge"; category: string; title: string; xp: number; timestamp: number }[];
  achievements: { id: string; unlockedAt: number }[];
  lastPlayedCategory: string | null;
  dailyPuzzleCompletedDate: string | null;
  dailyPuzzleStreak: number;
  dailyPuzzleLastDate: string | null;
  dailySetDate: string | null;
  dailySetCompletedIds: string[];
  dailySetHeartLost: boolean;
  dailySetPuzzleIds: string[];
  experiencedWonderIds: string[];
  currentCipherWeek: string | null;
  currentCipherSolved: boolean;
  cipherSolveCount: number;
  cipherRevealed: boolean;
  cipherSolvedWeeks: string[];
  answeredEventTokens: string[];
  updatedAt: number;
}

export interface PlayerSnapshot {
  progress: PlayerProgress;
  serverTime: number;
}

export type PlayMode = "challenge" | "daily" | "practice";
export type PlayerAnswer = string | number[] | Record<string, string>;

export interface PlaySession {
  id: string;
  puzzleId: string;
  mode: PlayMode;
  expiresAt: number;
}

export interface PlayResult extends PlayerSnapshot {
  correct: boolean;
  close?: boolean;
  completed: boolean;
  xpEarned: number;
  gemsEarned: number;
  replayed: boolean;
  explanation?: string;
  solution?: Record<string, unknown>;
  cellResults?: Record<string, boolean>;
}

export interface DailyReward {
  type: "xp" | "gems" | "streak-freeze";
  amount: number;
  label: string;
}

export type PlayerAction =
  | { action: "snapshot"; timeZone?: string }
  | { action: "daily-set"; categories?: string[] }
  | { action: "start"; puzzleId: string; mode: PlayMode }
  | { action: "answer"; sessionId: string; answer: PlayerAnswer }
  | { action: "daily-bonus" }
  | { action: "event-result"; eventId: string }
  | { action: "event-answer"; eventId: string; choice: number }
  | { action: "exchange"; item: "hearts" | "streak-freeze" }
  | { action: "shop"; productId: string };

export type PlayerResponse = PlayerSnapshot & Record<string, unknown>;
