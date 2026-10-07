import { z } from "zod";
import type { PlayerProgress } from "@/lib/player-contract";
import { initialProgress, levelForXp, refreshProgress } from "@/lib/server/player-progress";
import { achievementsList } from "@/constants/achievements";
import { questTemplates } from "@/constants/quests";

const count = z.number().int().min(0).max(1000000000);
const timestamp = z.number().int().min(0).max(8640000000000000);
const date = z.string().max(50).refine((s) => Number.isFinite(Date.parse(s))).nullable();
const ids = z.array(z.string().min(1).max(128)).max(20000);
const schema = z.object({
  timeZone: z.string().max(100).nullish(), xp: count.optional(), xpToday: count.optional(), gems: count.optional(),
  hearts: z.number().int().min(0).max(5).optional(), nextHeartAt: timestamp.nullish(),
  tier: z.enum(["free", "premium"]).optional(), subscriptionExpiry: timestamp.nullish(),
  streak: count.optional(), streakFreezes: count.optional(), lastActiveDate: date.optional(), streakStartDate: date.optional(),
  activeDates: z.array(date.unwrap()).max(20000).optional(), frozenDays: z.array(date.unwrap()).max(20000).optional(),
  brokenDays: z.array(date.unwrap()).max(20000).optional(), dailyGoal: z.number().int().min(1).max(10000).optional(),
  dailyGoalStreak: count.optional(), dailyGoalLastHitDate: date.optional(), weeklyXp: count.optional(), weeklyStartDate: timestamp.optional(),
  lastRewardClaim: date.optional(), puzzlesPlayedToday: count.optional(), puzzlesPlayedDate: date.optional(), adsWatchedToday: count.optional(),
  adsWatchDate: date.optional(), practiceHeartsToday: count.optional(), lastPracticeDate: date.optional(),
  dailyQuests: z.array(z.object({ id: z.string().max(128), progress: count })).max(20).optional(),
  questsRewarded: ids.optional(), lastQuestRefresh: date.optional(), completedPuzzleIds: ids.optional(),
  history: z.array(z.object({ id: z.string().max(128), type: z.enum(["challenge", "daily"]), category: z.string().max(100),
    title: z.string().max(500), xp: count, timestamp })).max(1000).optional(),
  achievements: z.union([z.record(z.string().max(100), count), z.array(z.object({ id: z.string().max(100), unlockedAt: timestamp })).max(100)]).optional(),
  lastPlayedCategory: z.string().max(100).nullish(), dailyPuzzleCompletedDate: date.optional(), dailyPuzzleStreak: count.optional(),
  dailyPuzzleLastDate: date.optional(), dailySetDate: date.optional(), dailySetCompletedIds: ids.optional(), dailySetHeartLost: z.boolean().optional(),
  experiencedWonderIds: ids.optional(), currentCipherWeek: date.optional(), currentCipherSolved: z.boolean().optional(),
  cipherSolveCount: count.optional(), cipherRevealed: z.boolean().optional(), cipherSolvedWeeks: ids.optional(),
});

export function migrateLegacyProgress(raw: unknown, now: number): PlayerProgress {
  const parsed = schema.parse(raw);
  const { achievements, dailyQuests, timeZone, ...legacy } = parsed;
  const fresh = initialProgress(now, timeZone ?? "UTC");
  const merged = { ...fresh, ...Object.fromEntries(Object.entries(legacy).filter(([, value]) => value !== undefined)) } as PlayerProgress;
  merged.achievements = achievementsList.flatMap((definition) => {
    const entry = Array.isArray(achievements) ? achievements.find((value) => value.id === definition.id) : undefined;
    const unlocked = entry || (!Array.isArray(achievements) && (achievements?.[definition.id] ?? 0) > 0);
    return unlocked ? [{ id: definition.id, unlockedAt: entry?.unlockedAt ?? now }] : [];
  });
  merged.dailyQuests = questTemplates.map((quest) => ({ ...quest, progress: Math.min(quest.target, dailyQuests?.find((q) => q.id === quest.id)?.progress ?? 0) }));
  merged.completedPuzzleIds = [...new Set(merged.completedPuzzleIds)];
  merged.questsRewarded = merged.questsRewarded.filter((id) => questTemplates.some((q) => q.id === id));
  merged.level = levelForXp(merged.xp);
  merged.history = merged.history.slice(0, 50);
  if (merged.hearts < 5 && merged.nextHeartAt === null) merged.nextHeartAt = now + 5 * 3600000;
  if (merged.lastActiveDate && Date.parse(merged.lastActiveDate) > now + 86400000) throw new Error("Future-dated legacy activity requires review.");
  return refreshProgress(merged, now);
}
