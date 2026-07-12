import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { questTemplates } from "@/constants/quests";
import { achievementsList } from "@/constants/achievements";

let heartsLostThisSession = false;
let currentPuzzleHasLesson = false;
export function resetHeartsLostFlag() { heartsLostThisSession = false; }
export function setHeartsLostFlag() { heartsLostThisSession = true; }
export function getHeartsLostFlag() { return heartsLostThisSession; }
export function setPuzzleHasLesson(v: boolean) { currentPuzzleHasLesson = v; }

export interface Activity {
  id: string;
  type: "daily" | "challenge";
  category: string;
  title: string;
  xp: number;
  timestamp: number;
}

export interface Achievement {
  id: string;
  unlockedAt: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  icon: string;
}

interface UserState {
  userId: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  avatarId: string | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  xp: number;
  xpToday: number;
  lastXpGain: number;
  streak: number;
  lastActiveDate: string | null;
  hearts: number;
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
  nextHeartAt: number | null;
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
  pendingCelebration: { type: "achievement" | "level-up"; title: string; subtitle?: string; xp?: number; gems?: number } | null;
  streakStartDate: string | null;
  activeDates: string[];

  loginAsGuest: () => void;
  setUser: (user: { uid: string; displayName: string; email: string | null; photoURL: string | null }) => void;
  setAvatarId: (avatarId: string | null) => void;
  logout: () => void;
  syncToFirestore: () => void;
  loadFromFirestore: () => Promise<void>;
  addXp: (amount: number) => void;
  checkWeeklyReset: () => void;
  addGems: (amount: number) => void;
  useHeart: () => void;
  restoreHearts: () => void;
  checkStreak: () => void;
  setLastPlayedCategory: (id: string) => void;
  logActivity: (activity: Omit<Activity, "id" | "timestamp">) => void;
  unlockAchievement: (id: string) => boolean;
  claimDailyReward: () => number;
  canClaimReward: () => boolean;
  buyStreakFreeze: () => boolean;
  usePracticeHeart: () => boolean;
  refreshDailyQuests: () => void;
  advanceQuest: (questId: string, amount?: number) => void;
  markPuzzleCompleted: (id: string) => boolean;
  hasCompletedPuzzle: (id: string) => boolean;
  processHeartRefill: () => void;
  getHeartTimer: () => number;
  completeDailyPuzzle: () => void;
  hasCompletedDailyPuzzle: () => boolean;
  setSoundEnabled: (v: boolean) => void;
  clearCelebration: () => void;
  checkAchievements: () => void;
  claimDailyBonus: () => { type: "xp" | "gems" | "streak-freeze"; amount: number; label: string } | null;
  canClaimDailyBonus: () => boolean;
}

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * level * (level + 1) - 50;
}

function calcLevel(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

function getWeekStart(ts: number): number {
  const d = new Date(ts);
  const day = d.getUTCDay();
  // Monday = 1 .. Sunday = 0, so diff to Monday
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function hasWeekChanged(storedStart: number): boolean {
  return getWeekStart(Date.now()) !== getWeekStart(storedStart);
}

export function getLevelProgress(xp: number): { level: number; progress: number; xpToNext: number; currentXp: number; nextXp: number } {
  const level = calcLevel(xp);
  const currentXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const progress = nextXp > currentXp ? (xp - currentXp) / (nextXp - currentXp) : 0;
  return { level, progress, xpToNext: nextXp - xp, currentXp, nextXp };
}

// Safe localStorage wrapper for Zustand persist (handles quota errors)
const safeStorage: PersistStorage<UserState> = {
  getItem: (name) => {
    const raw = localStorage.getItem(name);
    return raw ? JSON.parse(raw) : null;
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      console.warn("localStorage write failed — storage may be full");
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

function getRefreshedQuests(): DailyQuest[] {
  return questTemplates.map((qt) => ({
    id: qt.id,
    title: qt.title,
    description: qt.description,
    target: qt.target,
    progress: 0,
    reward: qt.reward,
    icon: qt.icon,
  }));
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      userId: "",
      displayName: "",
      email: null,
      photoURL: null,
      avatarId: null,
      isGuest: false,
      isAuthenticated: false,
      xp: 0,
      xpToday: 0,
      lastXpGain: 0,
      streak: 0,
      lastActiveDate: null,
      hearts: 5,
      level: 1,
      gems: 0,
      dailyGoal: 100,
      lastPlayedCategory: null,
      history: [],
      achievements: [],
      lastRewardClaim: null,
      streakFreezes: 0,
      practiceHeartsToday: 0,
      lastPracticeDate: null,
      dailyQuests: [],
      lastQuestRefresh: null,
      completedPuzzleIds: [],
      questsRewarded: [],
      nextHeartAt: null,
      dailyPuzzleCompletedDate: null,
      dailyPuzzleStreak: 0,
      dailyPuzzleLastDate: null,
      soundEnabled: true,
      weeklyXp: 0,
      weeklyStartDate: Date.now(),
      frozenDays: [],
      brokenDays: [],
      dailyGoalStreak: 0,
      dailyGoalLastHitDate: null,
      pendingCelebration: null,
      streakStartDate: null,
      activeDates: [],

      loginAsGuest: () => {
        set({
          userId: generateId(),
          displayName: "Guest",
          email: null,
          photoURL: null,
          avatarId: null,
          isGuest: true,
          isAuthenticated: true,
        });
      },

      setUser: (user) => {
        set({
          userId: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          avatarId: null,
          isGuest: false,
          isAuthenticated: true,
        });
        setTimeout(async () => {
          await get().loadFromFirestore();
          setTimeout(() => get().syncToFirestore(), 200);
        }, 100);
      },

      setAvatarId: (avatarId) => {
        set({ avatarId });
        get().syncToFirestore();
      },

      syncToFirestore: () => {
        const s = get();
        if (!s.userId || s.isGuest) return;
        import("@/services/user-service").then(({ saveUserData }) =>
          saveUserData(s.userId, {
            displayName: s.displayName,
            email: s.email,
            photoURL: s.photoURL,
            avatarId: s.avatarId,
            xp: s.xp,
            xpToday: s.xpToday,
            streak: s.streak,
            lastActiveDate: s.lastActiveDate,
            hearts: Math.min(5, s.hearts),
            nextHeartAt: s.nextHeartAt,
            level: s.level,
            gems: s.gems,
            dailyGoal: s.dailyGoal,
            lastPlayedCategory: s.lastPlayedCategory,
            history: s.history,
            achievements: s.achievements,
            lastRewardClaim: s.lastRewardClaim,
            streakFreezes: s.streakFreezes,
            practiceHeartsToday: s.practiceHeartsToday,
            lastPracticeDate: s.lastPracticeDate,
            dailyQuests: s.dailyQuests,
            lastQuestRefresh: s.lastQuestRefresh,
            completedPuzzleIds: s.completedPuzzleIds,
            questsRewarded: s.questsRewarded,
            dailyPuzzleCompletedDate: s.dailyPuzzleCompletedDate,
            dailyPuzzleStreak: s.dailyPuzzleStreak,
            dailyPuzzleLastDate: s.dailyPuzzleLastDate,
            soundEnabled: s.soundEnabled,
            weeklyXp: s.weeklyXp,
            weeklyStartDate: s.weeklyStartDate,
            frozenDays: s.frozenDays,
            brokenDays: s.brokenDays,
            dailyGoalStreak: s.dailyGoalStreak,
            dailyGoalLastHitDate: s.dailyGoalLastHitDate,
            streakStartDate: s.streakStartDate,
            activeDates: s.activeDates,
          }),
        );
      },

      loadFromFirestore: async () => {
        const s = get();
        if (!s.userId || s.isGuest) return;
        try {
          const { loadUserData } = await import("@/services/user-service");
          const data = await loadUserData(s.userId);
          if (data) {
            set({
              displayName: data.displayName ?? s.displayName,
              email: data.email ?? s.email,
              photoURL: data.photoURL ?? s.photoURL,
              avatarId: data.avatarId ?? s.avatarId,
              xp: data.xp ?? s.xp,
              xpToday: data.xpToday ?? s.xpToday,
              streak: data.streak ?? s.streak,
              lastActiveDate: data.lastActiveDate ?? s.lastActiveDate,
              hearts: data.hearts !== undefined ? Math.min(5, data.hearts) : s.hearts,
              nextHeartAt: data.nextHeartAt ?? s.nextHeartAt,
              level: data.level ?? s.level,
              gems: data.gems ?? s.gems,
              dailyGoal: data.dailyGoal ?? s.dailyGoal,
              lastPlayedCategory: data.lastPlayedCategory ?? s.lastPlayedCategory,
              history: data.history ?? s.history,
              achievements: data.achievements ?? s.achievements,
              lastRewardClaim: data.lastRewardClaim ?? s.lastRewardClaim,
              streakFreezes: data.streakFreezes ?? s.streakFreezes,
              practiceHeartsToday: data.practiceHeartsToday ?? s.practiceHeartsToday,
              lastPracticeDate: data.lastPracticeDate ?? s.lastPracticeDate,
              dailyQuests: data.dailyQuests ?? s.dailyQuests,
              lastQuestRefresh: data.lastQuestRefresh ?? s.lastQuestRefresh,
              completedPuzzleIds: data.completedPuzzleIds ?? s.completedPuzzleIds,
              questsRewarded: data.questsRewarded ?? s.questsRewarded,
              dailyPuzzleCompletedDate: data.dailyPuzzleCompletedDate ?? s.dailyPuzzleCompletedDate,
              dailyPuzzleStreak: data.dailyPuzzleStreak ?? s.dailyPuzzleStreak,
              dailyPuzzleLastDate: data.dailyPuzzleLastDate ?? s.dailyPuzzleLastDate,
              soundEnabled: data.soundEnabled ?? s.soundEnabled,
              weeklyXp: data.weeklyXp ?? s.weeklyXp,
              weeklyStartDate: data.weeklyStartDate ?? s.weeklyStartDate,
              frozenDays: data.frozenDays ?? s.frozenDays,
              brokenDays: data.brokenDays ?? s.brokenDays,
              dailyGoalStreak: data.dailyGoalStreak ?? s.dailyGoalStreak,
              dailyGoalLastHitDate: data.dailyGoalLastHitDate ?? s.dailyGoalLastHitDate,
              streakStartDate: data.streakStartDate ?? s.streakStartDate,
              activeDates: data.activeDates ?? s.activeDates,
            });
            get().checkWeeklyReset();
          } else {
            get().syncToFirestore();
          }
        } catch (e) {
          console.warn("loadFromFirestore failed — keeping local state:", e);
        }
      },

      logout: () => {
        set({
          userId: "",
          displayName: "",
          email: null,
          photoURL: null,
          avatarId: null,
          isGuest: false,
          isAuthenticated: false,
          xp: 0,
          xpToday: 0,
          lastXpGain: 0,
          streak: 0,
          lastActiveDate: null,
          hearts: 5,
          level: 1,
          gems: 0,
          dailyGoal: 100,
          lastPlayedCategory: null,
          history: [],
          achievements: [],
          lastRewardClaim: null,
          streakFreezes: 0,
          practiceHeartsToday: 0,
          lastPracticeDate: null,
          dailyQuests: [],
          lastQuestRefresh: null,
          completedPuzzleIds: [],
          questsRewarded: [],
          nextHeartAt: null,
          dailyPuzzleCompletedDate: null,
          dailyPuzzleStreak: 0,
          dailyPuzzleLastDate: null,
          soundEnabled: true,
          weeklyXp: 0,
          weeklyStartDate: Date.now(),
          frozenDays: [],
          brokenDays: [],
      dailyGoalStreak: 0,
      dailyGoalLastHitDate: null,
      pendingCelebration: null,
      streakStartDate: null,
      activeDates: [],

        });
      },

      addXp: (amount) => {
        const { xp, xpToday, level, weeklyXp, weeklyStartDate } = get();
        const newXp = xp + amount;
        const newLevel = calcLevel(newXp);
        const levelUp = newLevel > level;
        const weekReset = hasWeekChanged(weeklyStartDate);
        set({
          xp: newXp,
          xpToday: xpToday + amount,
          level: newLevel,
          lastXpGain: amount,
          weeklyXp: weekReset ? amount : weeklyXp + amount,
          weeklyStartDate: weekReset ? Date.now() : weeklyStartDate,
          pendingCelebration: levelUp ? { type: "level-up", title: `Level ${newLevel}!`, subtitle: "Keep up the great work!" } : get().pendingCelebration,
        });
        get().advanceQuest("earn-xp", amount);
        // Check daily goal streak
        const { xpToday: xt, dailyGoal, dailyGoalStreak, dailyGoalLastHitDate } = get();
        if (xt >= dailyGoal) {
          const today = new Date().toDateString();
          if (dailyGoalLastHitDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            set({
              dailyGoalStreak: dailyGoalLastHitDate === yesterday ? dailyGoalStreak + 1 : 1,
              dailyGoalLastHitDate: today,
            });
          }
        }
      },

      checkWeeklyReset: () => {
        const { weeklyXp, weeklyStartDate } = get();
        if (hasWeekChanged(weeklyStartDate)) {
          set({ weeklyXp: 0, weeklyStartDate: Date.now() });
        }
      },

      addGems: (amount) => set({ gems: get().gems + amount }),

      useHeart: () => {
        const { hearts, nextHeartAt } = get();
        if (hearts <= 0) return;
        const newHearts = hearts - 1;
        const now = Date.now();
        set({
          hearts: newHearts,
          nextHeartAt: newHearts < 5 && !nextHeartAt ? now + 5 * 60 * 60 * 1000 : nextHeartAt,
        });
      },

      restoreHearts: () => set({ hearts: 5, nextHeartAt: null }),

      checkStreak: () => {
        const { lastActiveDate, streak, streakFreezes, dailyQuests, lastQuestRefresh, frozenDays, brokenDays, streakStartDate, activeDates } = get();
        const today = new Date().toDateString();

        if (lastActiveDate === today) {
          if (lastQuestRefresh !== today) {
            set({ dailyQuests: getRefreshedQuests(), lastQuestRefresh: today, questsRewarded: [] });
          }
          return;
        }

        get().processHeartRefill();

        if (!lastActiveDate) {
          set({
            streak: 1,
            streakFreezes,
            lastActiveDate: today,
            xpToday: 0,
            dailyQuests: getRefreshedQuests(),
            lastQuestRefresh: today,
            questsRewarded: [],
            practiceHeartsToday: 0,
            lastPracticeDate: today,
            streakStartDate: today,
            activeDates: [today],
          });
          return;
        }

        const todayMs = new Date(today).getTime();
        const lastActiveMs = new Date(lastActiveDate).getTime();
        const diffDays = Math.round((todayMs - lastActiveMs) / 86400000);
        const missedDays = Math.max(0, diffDays - 1);
        const freezesToConsume = Math.min(streakFreezes, missedDays);
        const gapDates: string[] = [];
        for (let d = 1; d <= missedDays; d++) {
          gapDates.push(new Date(lastActiveMs + d * 86400000).toDateString());
        }

        let newStreak: number;
        const newFrozenDays = [...frozenDays];
        const newBrokenDays = [...brokenDays];

        if (missedDays === 0) {
          newStreak = streak + 1;
        } else if (freezesToConsume === missedDays) {
          newStreak = streak + 1;
          for (const d of gapDates) {
            if (!newFrozenDays.includes(d)) newFrozenDays.push(d);
          }
        } else {
          newStreak = 1;
          const frozenPortion = gapDates.slice(0, freezesToConsume);
          const brokenPortion = gapDates.slice(freezesToConsume);
          for (const d of frozenPortion) {
            if (!newFrozenDays.includes(d)) newFrozenDays.push(d);
          }
          for (const d of brokenPortion) {
            if (!newBrokenDays.includes(d)) newBrokenDays.push(d);
          }
        }

        // Track active dates for month-view support
        let newActiveDates = [...activeDates];
        let newStreakStartDate = streakStartDate;
        if (missedDays === 0 || (freezesToConsume === missedDays && missedDays > 0)) {
          if (!newActiveDates.includes(today)) newActiveDates.push(today);
        } else {
          // Streak broken — reset
          newActiveDates = [today];
          newStreakStartDate = today;
        }
        // Prune activeDates to last 365 days
        const yearCutoff = new Date();
        yearCutoff.setDate(yearCutoff.getDate() - 365);
        const yearCutoffMs = yearCutoff.getTime();
        newActiveDates = newActiveDates.filter((d) => new Date(d).getTime() >= yearCutoffMs);

        // Prune frozen/broken to last 14 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 14);
        const cutoffMs = cutoff.getTime();
        const prune = (arr: string[]) => arr.filter((d) => new Date(d).getTime() >= cutoffMs);

        set({
          streak: newStreak,
          streakFreezes: streakFreezes - freezesToConsume,
          lastActiveDate: today,
          xpToday: 0,
          dailyQuests: getRefreshedQuests(),
          lastQuestRefresh: today,
          questsRewarded: [],
          practiceHeartsToday: 0,
          lastPracticeDate: today,
          frozenDays: prune(newFrozenDays),
          brokenDays: prune(newBrokenDays),
          streakStartDate: newStreakStartDate,
          activeDates: newActiveDates,
        });
      },

      setLastPlayedCategory: (id) => set({ lastPlayedCategory: id }),

      logActivity: (activity) => {
        const { history } = get();
        const entry: Activity = {
          ...activity,
          id: generateId(),
          timestamp: Date.now(),
        };
        set({
          history: [entry, ...history].slice(0, 20),
        });
        get().advanceQuest("complete-challenges", 1);
      },

      unlockAchievement: (id) => {
        const { achievements } = get();
        if (achievements.some((a) => a.id === id)) return false;
        const def = achievementsList.find((a) => a.id === id);
        const xpReward = def?.xp ?? 0;
        const gemReward = def?.gems ?? 0;
        const { weeklyXp, weeklyStartDate } = get();
        const weekReset = hasWeekChanged(weeklyStartDate);
        set({
          achievements: [...achievements, { id, unlockedAt: Date.now() }],
          xp: get().xp + xpReward,
          level: calcLevel(get().xp + xpReward),
          gems: get().gems + gemReward,
          weeklyXp: weekReset ? xpReward : weeklyXp + xpReward,
          weeklyStartDate: weekReset ? Date.now() : weeklyStartDate,
          pendingCelebration: {
            type: "achievement",
            title: def?.title ?? "Achievement Unlocked!",
            subtitle: def?.description,
            xp: xpReward,
            gems: gemReward,
          },
        });
        return true;
      },

      claimDailyReward: () => {
        const { streak } = get();
        const reward = Math.min(5 + streak * 2, 50);
        set({
          gems: get().gems + reward,
          lastRewardClaim: new Date().toDateString(),
        });
        get().advanceQuest("streak-keeper", 1);
        return reward;
      },

      canClaimReward: () => {
        const { lastRewardClaim } = get();
        return lastRewardClaim !== new Date().toDateString();
      },

      buyStreakFreeze: () => {
        const { gems } = get();
        if (gems < 200) return false;
        set({ gems: gems - 200, streakFreezes: get().streakFreezes + 1 });
        return true;
      },

      usePracticeHeart: () => {
        const { practiceHeartsToday, lastPracticeDate, hearts } = get();
        const today = new Date().toDateString();
        const count = lastPracticeDate === today ? practiceHeartsToday : 0;
        if (count >= 3 || hearts >= 5) return false;
        set({
          hearts: hearts + 1,
          practiceHeartsToday: count + 1,
          lastPracticeDate: today,
        });
        return true;
      },

      refreshDailyQuests: () => {
        set({ dailyQuests: getRefreshedQuests(), lastQuestRefresh: new Date().toDateString(), questsRewarded: [] });
      },

      advanceQuest: (questId, amount = 1) => {
        const { dailyQuests, questsRewarded, gems } = get();
        const quest = dailyQuests.find((q) => q.id === questId);
        if (!quest) return;
        const wasComplete = quest.progress >= quest.target;
        const newProgress = Math.min(quest.progress + amount, quest.target);
        const nowComplete = newProgress >= quest.target;
        const alreadyRewarded = questsRewarded.includes(questId);

        const reward = nowComplete && !wasComplete && !alreadyRewarded;

        set({
          dailyQuests: dailyQuests.map((q) =>
            q.id === questId ? { ...q, progress: newProgress } : q,
          ),
          gems: reward ? gems + quest.reward : gems,
          questsRewarded: reward ? [...questsRewarded, questId] : questsRewarded,
        });
      },

      markPuzzleCompleted: (id) => {
        const { completedPuzzleIds } = get();
        if (completedPuzzleIds.includes(id)) return false;
        set({ completedPuzzleIds: [...completedPuzzleIds, id] });
        return true;
      },

      hasCompletedPuzzle: (id) => {
        return get().completedPuzzleIds.includes(id);
      },

      completeDailyPuzzle: () => {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const { dailyPuzzleCompletedDate, dailyPuzzleStreak, dailyPuzzleLastDate } = get();

        if (dailyPuzzleCompletedDate === today) return;

        let newStreak = dailyPuzzleStreak;
        if (dailyPuzzleLastDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        set({
          dailyPuzzleCompletedDate: today,
          dailyPuzzleStreak: newStreak,
          dailyPuzzleLastDate: today,
        });
      },

      hasCompletedDailyPuzzle: () => {
        const today = new Date().toDateString();
        return get().dailyPuzzleCompletedDate === today;
      },

      processHeartRefill: () => {
        const { hearts, nextHeartAt } = get();
        if (hearts >= 5 || !nextHeartAt) return;
        const now = Date.now();
        if (now < nextHeartAt) return;
        const REFILL_MS = 5 * 60 * 60 * 1000;
        const elapsed = now - nextHeartAt;
        const heartsToAdd = Math.floor(elapsed / REFILL_MS) + 1;
        const newHearts = Math.min(5, hearts + heartsToAdd);
        const remainingMs = heartsToAdd * REFILL_MS - elapsed;
        set({
          hearts: newHearts,
          nextHeartAt: newHearts >= 5 ? null : now + remainingMs,
        });
      },

      getHeartTimer: () => {
        const { hearts, nextHeartAt } = get();
        if (hearts >= 5 || !nextHeartAt) return 0;
        return Math.max(0, nextHeartAt - Date.now());
      },

      setSoundEnabled: (v: boolean) => {
        set({ soundEnabled: v });
        import("@/services/sound-service").then(({ setSoundEnabled }) => setSoundEnabled(v));
      },

      clearCelebration: () => set({ pendingCelebration: null }),

      checkAchievements: () => {
        const { xp, streak, completedPuzzleIds, achievements, history, dailyPuzzleStreak, level, dailyGoalStreak } = get();
        const already = new Set(achievements.map((a) => a.id));

        const checks: { id: string; condition: boolean }[] = [
          { id: "first_challenge", condition: completedPuzzleIds.length >= 1 },
          { id: "streak_3", condition: streak >= 3 },
          { id: "streak_7", condition: streak >= 7 },
          { id: "xp_500", condition: xp >= 500 },
          { id: "xp_1000", condition: xp >= 1000 },
          { id: "all_categories", condition: new Set(history.map((h) => h.category)).size >= 4 },
          { id: "perfect_day", condition: dailyPuzzleStreak >= 5 },
          { id: "level_5", condition: level >= 5 },
          { id: "hearts_saver", condition: !getHeartsLostFlag() && currentPuzzleHasLesson },
          { id: "daily_goal_week", condition: dailyGoalStreak >= 7 },
        ];

        for (const { id, condition } of checks) {
          if (!already.has(id) && condition) {
            get().unlockAchievement(id);
          }
        }
      },

      canClaimDailyBonus: () => {
        return get().lastRewardClaim !== new Date().toDateString();
      },

      claimDailyBonus: () => {
        const { lastRewardClaim, xp, gems, streakFreezes } = get();
        const today = new Date().toDateString();
        if (lastRewardClaim === today) return null;

        // Weighted probability pool
        const pool: { type: "xp" | "gems" | "streak-freeze"; amount: number; label: string; weight: number }[] = [
          { type: "xp", amount: 10, label: "10 XP", weight: 30 },
          { type: "xp", amount: 20, label: "20 XP", weight: 20 },
          { type: "xp", amount: 30, label: "30 XP", weight: 15 },
          { type: "xp", amount: 40, label: "40 XP", weight: 10 },
          { type: "gems", amount: 5, label: "5 Gems", weight: 8 },
          { type: "xp", amount: 50, label: "50 XP", weight: 5 },
          { type: "gems", amount: 10, label: "10 Gems", weight: 4.5 },
          { type: "xp", amount: 75, label: "75 XP", weight: 3 },
          { type: "xp", amount: 100, label: "100 XP", weight: 2.5 },
          { type: "streak-freeze", amount: 1, label: "Streak Freeze", weight: 2 },
        ];

        const totalWeight = pool.reduce((s, i) => s + i.weight, 0);
        let roll = Math.random() * totalWeight;
        let picked = pool[0];
        for (const item of pool) {
          roll -= item.weight;
          if (roll <= 0) { picked = item; break; }
        }

        set({ lastRewardClaim: today });

        if (picked.type === "xp") {
          get().addXp(picked.amount);
        } else if (picked.type === "gems") {
          set({ gems: gems + picked.amount });
        } else if (picked.type === "streak-freeze") {
          set({ streakFreezes: streakFreezes + 1 });
        }

        return picked;
      },
    }),
    {
      name: "brainbloom-user",
      storage: safeStorage,
      onRehydrateStorage: () => () => {
        useUserStore.getState().checkWeeklyReset();
      },
    },
  ),
);
