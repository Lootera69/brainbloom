import { achievementsList } from "@/constants/achievements";
import { questTemplates } from "@/constants/quests";
import type { DailyReward, PlayerProgress } from "@/lib/player-contract";

const DAY_MS = 86400000;
const REFILL_MS = 5 * 60 * 60 * 1000;

export function validTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.length > 100) return "UTC";
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return value; }
  catch { return "UTC"; }
}

export function serverDay(now: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => Number(parts.find((entry) => entry.type === name)!.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  return date.toUTCString().slice(0, 16).replace(/^([A-Za-z]+), (\d+) ([A-Za-z]+) (\d+)$/, "$1 $3 $2 $4");
}

export function dayDistance(from: string | null, to: string): number | null {
  if (!from) return null;
  const parse = (value: string) => Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : `${value} GMT`);
  const distance = Math.round((parse(to) - parse(from)) / DAY_MS);
  return Number.isFinite(distance) ? distance : null;
}

export function serverWeek(now: number): number {
  const day = new Date(now); day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.getTime();
}

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor((-1 + Math.sqrt(9 + 0.16 * xp)) / 2));
}

export function hasServerPremium(state: PlayerProgress, now: number): boolean {
  return state.tier === "premium" && (state.subscriptionExpiry === null || state.subscriptionExpiry > now);
}

export function initialProgress(now: number, timeZone: unknown = "UTC"): PlayerProgress {
  return {
    version: 1, revision: 0, timeZone: validTimeZone(timeZone), xp: 0, xpToday: 0, level: 1, gems: 0,
    hearts: 5, nextHeartAt: null, tier: "free", subscriptionExpiry: null,
    streak: 0, streakFreezes: 0, lastActiveDate: null, lastEvalDate: null, streakStartDate: null,
    activeDates: [], frozenDays: [], brokenDays: [], dailyGoal: 100,
    dailyGoalStreak: 0, dailyGoalLastHitDate: null, weeklyXp: 0, weeklyStartDate: serverWeek(now),
    lastRewardClaim: null, puzzlesPlayedToday: 0, puzzlesPlayedDate: null,
    adsWatchedToday: 0, adsWatchDate: null, practiceHeartsToday: 0, lastPracticeDate: null, practiceCompletedIds: [],
    dailyQuests: questTemplates.map((quest) => ({ ...quest, progress: 0 })), questsRewarded: [],
    lastQuestRefresh: null, completedPuzzleIds: [], history: [], achievements: [], lastPlayedCategory: null,
    dailyPuzzleCompletedDate: null, dailyPuzzleStreak: 0, dailyPuzzleLastDate: null,
    dailySetDate: null, dailySetCompletedIds: [], dailySetHeartLost: false, dailySetPuzzleIds: [],
    experiencedWonderIds: [], currentCipherWeek: null, currentCipherSolved: false,
    cipherSolveCount: 0, cipherRevealed: false, cipherSolvedWeeks: [], answeredEventTokens: [], updatedAt: now,
  };
}

export function refreshProgress(state: PlayerProgress, now: number): PlayerProgress {
  const next = structuredClone(state);
  const today = serverDay(now, next.timeZone);
  if (next.lastQuestRefresh !== today) {
    next.xpToday = 0;
    next.dailyQuests = questTemplates.map((quest) => ({ ...quest, progress: 0 }));
    next.questsRewarded = [];
    next.lastQuestRefresh = today;
  }
  if (serverWeek(next.weeklyStartDate) !== serverWeek(now)) {
    next.weeklyXp = 0;
    next.weeklyStartDate = serverWeek(now);
  }
  next.weeklyStartDate = serverWeek(now);
  if (next.puzzlesPlayedDate !== today) { next.puzzlesPlayedDate = today; next.puzzlesPlayedToday = 0; }
  if (next.adsWatchDate !== today) { next.adsWatchDate = today; next.adsWatchedToday = 0; }
  if (next.lastPracticeDate !== today) { next.lastPracticeDate = today; next.practiceHeartsToday = 0; next.practiceCompletedIds = []; }
  if (next.dailySetDate !== today) { next.dailySetDate = today; next.dailySetCompletedIds = []; next.dailySetHeartLost = false; next.dailySetPuzzleIds = []; }
  evaluateStreak(next, today);
  if (next.tier === "premium" && !hasServerPremium(next, now)) next.tier = "free";
  if (next.nextHeartAt !== null && now >= next.nextHeartAt && !hasServerPremium(next, now)) {
    const gained = 1 + Math.floor((now - next.nextHeartAt) / REFILL_MS);
    next.hearts = Math.min(5, next.hearts + gained);
    next.nextHeartAt = next.hearts >= 5 ? null : next.nextHeartAt + gained * REFILL_MS;
  }
  next.updatedAt = now;
  return next;
}

function advanceQuest(state: PlayerProgress, id: string, amount = 1) {
  const quest = state.dailyQuests.find((value) => value.id === id);
  if (!quest) return;
  const before = quest.progress;
  quest.progress = Math.min(quest.target, quest.progress + amount);
  if (before < quest.target && quest.progress >= quest.target && !state.questsRewarded.includes(id)) {
    state.gems += quest.reward;
    state.questsRewarded.push(id);
  }
}

export function grantXp(state: PlayerProgress, amount: number, today: string, quests = true) {
  state.xp += amount;
  state.xpToday += amount;
  state.weeklyXp += amount;
  state.level = levelForXp(state.xp);
  if (quests) {
    advanceQuest(state, "earn-xp", amount);
    if (state.xpToday >= state.dailyGoal && state.dailyGoalLastHitDate !== today) {
      state.dailyGoalStreak = dayDistance(state.dailyGoalLastHitDate, today) === 1 ? state.dailyGoalStreak + 1 : 1;
      state.dailyGoalLastHitDate = today;
    }
  }
}

function missedDates(from: string | null, to: string): string[] {
  const gap = dayDistance(from, to);
  if (gap === null || gap <= 1) return [];
  const end = Date.parse(`${to} GMT`);
  return Array.from({ length: Math.min(gap - 1, 400) }, (_, i) => serverDay(end - (Math.min(gap - 1, 400) - i) * DAY_MS, "UTC"));
}

function protectDate(state: PlayerProgress, day: string): boolean {
  if (state.frozenDays.includes(day)) return true;
  if (state.brokenDays.includes(day) || state.streakFreezes <= 0) return false;
  state.streakFreezes--;
  state.frozenDays = [...state.frozenDays, day].slice(-400);
  return true;
}

function evaluateStreak(state: PlayerProgress, today: string) {
  if (state.lastEvalDate === today) return;
  let broken = (dayDistance(state.lastActiveDate, today) ?? 0) > 401;
  for (const day of missedDates(state.lastActiveDate, today)) {
    if (state.lastEvalDate && (dayDistance(state.lastEvalDate, day) ?? -1) < 0) continue;
    if (!protectDate(state, day)) {
      broken = true;
      state.brokenDays = [...new Set([...state.brokenDays, day])].slice(-400);
    }
  }
  if (broken) { state.streak = 0; state.streakStartDate = null; }
  state.lastEvalDate = today;
}

export function markActive(state: PlayerProgress, today: string) {
  if (state.lastActiveDate === today) return;
  state.streak++;
  if (!state.streakStartDate) state.streakStartDate = today;
  state.lastActiveDate = today;
  if (!state.activeDates.includes(today)) state.activeDates = [...state.activeDates, today].slice(-400);
  advanceQuest(state, "streak-keeper");
}

export interface ScoredPuzzle {
  id: string;
  title: string;
  category: string;
  type: string;
  xpReward: number;
  hasLesson: boolean;
}

export function applyPuzzleResult(state: PlayerProgress, puzzle: ScoredPuzzle, input: {
  correct: boolean; daily: boolean; practice: boolean; hadWrongAttempt: boolean; dailyTarget: number;
}, now: number): PlayerProgress {
  const next = refreshProgress(state, now);
  const today = serverDay(now, next.timeZone);
  if (!input.correct) {
    if (input.daily) next.dailySetHeartLost = true;
    if (!input.practice && puzzle.type !== "cipher" && !hasServerPremium(next, now)) {
      next.hearts = Math.max(0, next.hearts - 1);
      if (next.nextHeartAt === null) next.nextHeartAt = now + REFILL_MS;
    }
    if (puzzle.type === "riddle") markActive(next, today);
    return next;
  }
  if (input.practice) {
    if (!next.completedPuzzleIds.includes(puzzle.id) || next.practiceCompletedIds.includes(puzzle.id)) return next;
    next.practiceCompletedIds.push(puzzle.id);
    if (next.practiceHeartsToday < 3 && next.hearts < 5) { next.hearts++; next.practiceHeartsToday++; }
    if (next.hearts === 5) next.nextHeartAt = null;
    return next;
  }
  markActive(next, today);
  const first = !next.completedPuzzleIds.includes(puzzle.id);
  const daily = input.daily && next.dailyPuzzleCompletedDate !== today && !next.dailySetCompletedIds.includes(puzzle.id);
  if (!first && !daily) return next;
  if (first) { next.completedPuzzleIds.push(puzzle.id); advanceQuest(next, "complete-challenges"); }
  const xp = puzzle.xpReward * (daily ? 2 : 1);
  grantXp(next, xp, today);
  if (daily) {
    next.gems += 5;
    next.dailySetCompletedIds.push(puzzle.id);
    if (next.dailySetCompletedIds.length >= input.dailyTarget) {
      const gap = dayDistance(next.dailyPuzzleLastDate, today);
      const missed = missedDates(next.dailyPuzzleLastDate, today);
      const needed = missed.filter((day) => !next.frozenDays.includes(day));
      if (gap !== null && gap > 0 && gap <= 401 && needed.length <= next.streakFreezes
        && needed.every((day) => !next.brokenDays.includes(day))) {
        for (const day of needed) protectDate(next, day);
        next.dailyPuzzleStreak++;
      } else next.dailyPuzzleStreak = 1;
      next.dailyPuzzleCompletedDate = today; next.dailyPuzzleLastDate = today;
      if (!next.dailySetHeartLost) { grantXp(next, 25, today, false); next.gems += 10; }
    }
  }
  next.history = [{ id: puzzle.id, type: daily ? "daily" as const : "challenge" as const, category: puzzle.category, title: puzzle.title, xp, timestamp: now }, ...next.history].slice(0, 50);
  next.lastPlayedCategory = puzzle.category;
  unlockAchievements(next, now, puzzle.hasLesson && !input.hadWrongAttempt);
  return next;
}

export function unlockAchievements(next: PlayerProgress, now: number, heartsSaved = false) {
  const today = serverDay(now, next.timeZone);
  const categories = new Set(next.history.map((entry) => entry.category));
  const conditions: Record<string, boolean> = {
    first_challenge: next.completedPuzzleIds.length > 0, streak_3: next.streak >= 3,
    streak_7: next.streak >= 7, xp_500: next.xp >= 500, xp_1000: next.xp >= 1000,
    all_categories: categories.size >= 4, level_5: next.level >= 5,
    cipher_solver_1: next.cipherSolveCount >= 1, cipher_solver_5: next.cipherSolveCount >= 5,
    cipher_solver_10: next.cipherSolveCount >= 10, perfect_day: next.dailyPuzzleStreak >= 5,
    daily_goal_week: next.dailyGoalStreak >= 7, hearts_saver: heartsSaved,
  };
  for (const achievement of achievementsList) {
    if (conditions[achievement.id] && !next.achievements.some((value) => value.id === achievement.id)) {
      next.achievements.push({ id: achievement.id, unlockedAt: now });
      grantXp(next, achievement.xp, today, false); next.gems += achievement.gems;
    }
  }
}

export function pickDailyReward(random: number): DailyReward {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error("Invalid server reward roll.");
  const rewards: [DailyReward["type"], number, number][] = [
    ["xp", 10, 30], ["xp", 20, 20], ["xp", 30, 15], ["xp", 40, 10], ["gems", 5, 8],
    ["xp", 50, 5], ["gems", 10, 4.5], ["xp", 75, 3], ["xp", 100, 2.5], ["streak-freeze", 1, 2],
  ];
  let roll = random * 100;
  for (const [type, amount, weight] of rewards) {
    roll -= weight;
    if (roll <= 0) return { type, amount, label: type === "streak-freeze" ? "Streak Freeze" : `${amount} ${type === "xp" ? "XP" : "Gems"}` };
  }
  throw new Error("Invalid server reward roll.");
}

export function applyDailyReward(state: PlayerProgress, reward: DailyReward, now: number): PlayerProgress {
  const next = refreshProgress(state, now);
  const today = serverDay(now, next.timeZone);
  if (next.lastRewardClaim === today) return next;
  next.lastRewardClaim = today;
  if (reward.type === "xp") grantXp(next, reward.amount, today);
  else if (reward.type === "gems") next.gems += reward.amount;
  else next.streakFreezes += reward.amount;
  return next;
}
