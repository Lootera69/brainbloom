import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { questTemplates } from "@/constants/quests";
import { achievementsList } from "@/constants/achievements";
import { ADS_MAX_PER_DAY } from "@/lib/subscription";

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
  _lastEvalDate: string;

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
  checkStreak: (markActive?: boolean) => void;
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
  setTier: (tier: "free" | "premium", expiry?: number | null) => void;
  incrementPuzzlePlayed: () => void;
  canPlayPuzzle: () => boolean;
  incrementAdWatched: () => void;
  canWatchAd: () => boolean;
  buyHeartRefillWithGems: () => boolean;
  addStreakFreezes: (amount: number) => void;
  markWonderExperienced: (id: string) => void;
  solveCipher: (weekStart: string) => void;
  revealCipher: (weekStart: string) => void;
  hasSolvedCurrentCipher: () => boolean;
  getCipherState: () => "attempt" | "solved" | "revealed";
  _getWeekStartWithOverride: () => { weekStart: string; isSundayOverride: boolean };
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

// Safe localStorage wrapper for Zustand persist (handles quota errors + corruption)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeStorage: PersistStorage<any> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    } catch {
      console.warn("localStorage read failed — corrupt or inaccessible, resetting");
      return null;
    }
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
      tier: "free",
      subscriptionExpiry: null,
      puzzlesPlayedToday: 0,
      puzzlesPlayedDate: null,
      adsWatchedToday: 0,
      adsWatchDate: null,
      experiencedWonderIds: [],
      currentCipherWeek: null,
      currentCipherSolved: false,
      cipherSolveCount: 0,
      cipherRevealed: false,
      _lastEvalDate: "",

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
            tier: s.tier,
            subscriptionExpiry: s.subscriptionExpiry,
            puzzlesPlayedToday: s.puzzlesPlayedToday,
            puzzlesPlayedDate: s.puzzlesPlayedDate,
            adsWatchedToday: s.adsWatchedToday,
            adsWatchDate: s.adsWatchDate,
            experiencedWonderIds: s.experiencedWonderIds,
            currentCipherWeek: s.currentCipherWeek,
            currentCipherSolved: s.currentCipherSolved,
            cipherSolveCount: s.cipherSolveCount,
            cipherRevealed: s.cipherRevealed,
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
              tier: data.tier ?? s.tier,
              subscriptionExpiry: data.subscriptionExpiry ?? s.subscriptionExpiry,
              puzzlesPlayedToday: data.puzzlesPlayedToday ?? s.puzzlesPlayedToday,
              puzzlesPlayedDate: data.puzzlesPlayedDate ?? s.puzzlesPlayedDate,
              adsWatchedToday: data.adsWatchedToday ?? s.adsWatchedToday,
              adsWatchDate: data.adsWatchDate ?? s.adsWatchDate,
              experiencedWonderIds: data.experiencedWonderIds ?? s.experiencedWonderIds,
              currentCipherWeek: data.currentCipherWeek ?? s.currentCipherWeek,
              currentCipherSolved: data.currentCipherSolved ?? s.currentCipherSolved,
              cipherSolveCount: data.cipherSolveCount ?? s.cipherSolveCount,
              cipherRevealed: data.cipherRevealed ?? s.cipherRevealed,
      });
            get().checkWeeklyReset();
            get().checkStreak(false);
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
      tier: "free",
      subscriptionExpiry: null,
      puzzlesPlayedToday: 0,
      puzzlesPlayedDate: null,
      adsWatchedToday: 0,
      adsWatchDate: null,
      currentCipherWeek: null,
      currentCipherSolved: false,
      cipherSolveCount: 0,
      cipherRevealed: false,

        });
      },

      addXp: (amount) => {
        const { xp, xpToday, level, weeklyXp, weeklyStartDate, streak, lastActiveDate } = get();
        if (streak === 0) {
          const today = new Date().toDateString();
          if (lastActiveDate === today) set({ streak: 1 });
        }
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
        const { hearts, nextHeartAt, tier, subscriptionExpiry } = get();
        if (hearts <= 0) return;
        if (tier === "premium" && (!subscriptionExpiry || Date.now() < subscriptionExpiry)) return;
        const newHearts = hearts - 1;
        const now = Date.now();
        set({
          hearts: newHearts,
          nextHeartAt: newHearts < 5 && !nextHeartAt ? now + 5 * 60 * 60 * 1000 : nextHeartAt,
        });
      },

      restoreHearts: () => set({ hearts: 5, nextHeartAt: null }),

      checkStreak: (markActive = true) => {
        const s = get();
        const today = new Date().toDateString();

        if (s.lastActiveDate === today) {
          if (s.lastQuestRefresh !== today) {
            set({ dailyQuests: getRefreshedQuests(), lastQuestRefresh: today, questsRewarded: [] });
          }
          return;
        }

        s.processHeartRefill();

        // New user — only init streak on puzzle completion (markActive=true)
        if (!s.lastActiveDate) {
          if (markActive) {
            set({
              streak: 1,
              streakFreezes: s.streakFreezes,
              lastActiveDate: today,
              xpToday: 0,
              dailyQuests: getRefreshedQuests(),
              lastQuestRefresh: today,
              questsRewarded: [],
              practiceHeartsToday: 0,
              lastPracticeDate: today,
              streakStartDate: today,
              activeDates: [today],
              _lastEvalDate: today,
            });
          }
          return;
        }

        const todayMs = new Date(today).getTime();
        const lastActiveMs = new Date(s.lastActiveDate).getTime();
        const diffDays = Math.round((todayMs - lastActiveMs) / 86400000);
        const missedDays = Math.max(0, diffDays - 1);
        const freezesToConsume = Math.min(s.streakFreezes, missedDays);
        const gapDates: string[] = [];
        for (let d = 1; d <= missedDays; d++) {
          gapDates.push(new Date(lastActiveMs + d * 86400000).toDateString());
        }

        // ───── EVALUATION-ONLY MODE (login/page load) ─────
        if (!markActive) {
          if (s._lastEvalDate === today) return;

          let newStreak = s.streak;
          const newFrozenDays = [...s.frozenDays];
          const newBrokenDays = [...s.brokenDays];

          if (missedDays > 0) {
            if (freezesToConsume === missedDays) {
              for (const d of gapDates) {
                if (!newFrozenDays.includes(d)) newFrozenDays.push(d);
              }
            } else {
              newStreak = 0;
              const frozenPortion = gapDates.slice(0, freezesToConsume);
              const brokenPortion = gapDates.slice(freezesToConsume);
              for (const d of frozenPortion) {
                if (!newFrozenDays.includes(d)) newFrozenDays.push(d);
              }
              for (const d of brokenPortion) {
                if (!newBrokenDays.includes(d)) newBrokenDays.push(d);
              }
            }
          }

          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 14);
          const cutoffMs = cutoff.getTime();
          const prune = (arr: string[]) => arr.filter((d) => new Date(d).getTime() >= cutoffMs);

          set({
            streak: newStreak,
            streakFreezes: s.streakFreezes - freezesToConsume,
            frozenDays: prune(newFrozenDays),
            brokenDays: prune(newBrokenDays),
            _lastEvalDate: today,
          });
          return;
        }

        // ───── FULL ACTIVATION (puzzle completion) ─────
        // If evaluation already ran today, skip re-evaluation — just mark active
        if (s._lastEvalDate === today) {
          const newStreak = s.streak > 0 ? s.streak + 1 : 1;
          const newActiveDates = s.streak > 0
            ? (s.activeDates.includes(today) ? s.activeDates : [...s.activeDates, today])
            : [today];
          const newStreakStartDate = s.streak > 0 ? (s.streakStartDate ?? today) : today;
          set({
            streak: newStreak,
            lastActiveDate: today,
            streakStartDate: newStreakStartDate,
            activeDates: newActiveDates,
            xpToday: 0,
            dailyQuests: getRefreshedQuests(),
            lastQuestRefresh: today,
            questsRewarded: [],
            practiceHeartsToday: 0,
            lastPracticeDate: today,
          });
          return;
        }

        // No prior eval today — run full evaluation + activation
        let newStreak: number;
        const newFrozenDays = [...s.frozenDays];
        const newBrokenDays = [...s.brokenDays];

        if (missedDays === 0) {
          newStreak = s.streak + 1;
        } else if (freezesToConsume === missedDays) {
          newStreak = s.streak + 1;
          for (const d of gapDates) {
            if (!newFrozenDays.includes(d)) newFrozenDays.push(d);
          }
        } else {
          newStreak = 0;
          const frozenPortion = gapDates.slice(0, freezesToConsume);
          const brokenPortion = gapDates.slice(freezesToConsume);
          for (const d of frozenPortion) {
            if (!newFrozenDays.includes(d)) newFrozenDays.push(d);
          }
          for (const d of brokenPortion) {
            if (!newBrokenDays.includes(d)) newBrokenDays.push(d);
          }
        }

        let newActiveDates = [...s.activeDates];
        let newStreakStartDate = s.streakStartDate;
        if (missedDays === 0 || (freezesToConsume === missedDays && missedDays > 0)) {
          if (!newActiveDates.includes(today)) newActiveDates.push(today);
        } else {
          newActiveDates = [today];
          newStreakStartDate = today;
        }

        const yearCutoff = new Date();
        yearCutoff.setDate(yearCutoff.getDate() - 365);
        const yearCutoffMs = yearCutoff.getTime();
        newActiveDates = newActiveDates.filter((d) => new Date(d).getTime() >= yearCutoffMs);

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 14);
        const cutoffMs = cutoff.getTime();
        const prune = (arr: string[]) => arr.filter((d) => new Date(d).getTime() >= cutoffMs);

        set({
          streak: newStreak,
          streakFreezes: s.streakFreezes - freezesToConsume,
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
          _lastEvalDate: today,
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
          { id: "cipher_solver_1", condition: get().cipherSolveCount >= 1 },
          { id: "cipher_solver_5", condition: get().cipherSolveCount >= 5 },
          { id: "cipher_solver_10", condition: get().cipherSolveCount >= 10 },
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

      setTier: (tier, expiry = null) => {
        set({ tier, subscriptionExpiry: expiry });
        get().syncToFirestore();
      },

      incrementPuzzlePlayed: () => {
        const { puzzlesPlayedToday, puzzlesPlayedDate, tier } = get();
        if (tier === "premium") return;
        const today = new Date().toDateString();
        set({
          puzzlesPlayedToday: puzzlesPlayedDate === today ? puzzlesPlayedToday + 1 : 1,
          puzzlesPlayedDate: today,
        });
      },

      canPlayPuzzle: () => {
        const { tier, puzzlesPlayedToday, puzzlesPlayedDate, subscriptionExpiry } = get();
        if (tier === "premium" && (!subscriptionExpiry || Date.now() < subscriptionExpiry)) return true;
        const today = new Date().toDateString();
        const count = puzzlesPlayedDate === today ? puzzlesPlayedToday : 0;
        return count < 3;
      },

      incrementAdWatched: () => {
        const { adsWatchedToday, adsWatchDate } = get();
        const today = new Date().toDateString();
        set({
          adsWatchedToday: adsWatchDate === today ? adsWatchedToday + 1 : 1,
          adsWatchDate: today,
        });
      },

      canWatchAd: () => {
        const { adsWatchedToday, adsWatchDate } = get();
        const today = new Date().toDateString();
        const count = adsWatchDate === today ? adsWatchedToday : 0;
        return count < ADS_MAX_PER_DAY;
      },

      buyHeartRefillWithGems: () => {
        const { gems } = get();
        if (gems < 50) return false;
        set({ gems: gems - 50, hearts: Math.min(5, get().hearts + 5), nextHeartAt: null });
        return true;
      },

      addStreakFreezes: (amount) => {
        set({ streakFreezes: get().streakFreezes + amount });
      },

      solveCipher: (weekStart) => {
        const { cipherSolveCount } = get();
        set({
          currentCipherWeek: weekStart,
          currentCipherSolved: true,
          cipherSolveCount: cipherSolveCount + 1,
          cipherRevealed: false,
        });
        get().addGems(25);
      },

      revealCipher: (weekStart) => {
        set({ currentCipherWeek: weekStart, cipherRevealed: true });
      },

      _getWeekStartWithOverride: (): { weekStart: string; isSundayOverride: boolean } => {
        const d = new Date();
        try {
          const force = typeof localStorage !== "undefined" && localStorage.getItem("brainbloom-force-sunday");
          if (force === "true") {
            return { weekStart: d.toISOString().split("T")[0], isSundayOverride: true };
          }
        } catch { /* ignore */ }
        const day = d.getUTCDay();
        const diff = day === 0 ? 0 : -day;
        const sunday = new Date(d);
        sunday.setUTCDate(d.getUTCDate() + diff);
        return { weekStart: sunday.toISOString().split("T")[0], isSundayOverride: day === 0 };
      },

      hasSolvedCurrentCipher: () => {
        const { currentCipherWeek, currentCipherSolved } = get();
        const { weekStart } = get()._getWeekStartWithOverride();
        return currentCipherWeek === weekStart && currentCipherSolved;
      },

      getCipherState: () => {
        const { currentCipherWeek, currentCipherSolved, cipherRevealed } = get();
        const { weekStart, isSundayOverride } = get()._getWeekStartWithOverride();
        if (currentCipherWeek !== weekStart) {
          if (currentCipherSolved) return "solved";
          if (isSundayOverride) return "attempt";
          return "revealed";
        }
        if (currentCipherSolved) return "solved";
        if (cipherRevealed) return "revealed";
        return "attempt";
      },

      markWonderExperienced: (id) => {
        const ids = get().experiencedWonderIds;
        if (!ids.includes(id)) set({ experiencedWonderIds: [...ids, id] });
      },
    }),
    {
      name: "brainbloom-user",
      storage: safeStorage,
      partialize: (state) => ({
        userId: state.userId,
        displayName: state.displayName,
        email: state.email,
        photoURL: state.photoURL,
        avatarId: state.avatarId,
        isGuest: state.isGuest,
        isAuthenticated: state.isAuthenticated,
        xp: state.xp,
        xpToday: state.xpToday,
        lastXpGain: state.lastXpGain,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        hearts: state.hearts,
        level: state.level,
        gems: state.gems,
        dailyGoal: state.dailyGoal,
        lastPlayedCategory: state.lastPlayedCategory,
        history: state.history,
        achievements: state.achievements,
        lastRewardClaim: state.lastRewardClaim,
        streakFreezes: state.streakFreezes,
        practiceHeartsToday: state.practiceHeartsToday,
        lastPracticeDate: state.lastPracticeDate,
        dailyQuests: state.dailyQuests,
        lastQuestRefresh: state.lastQuestRefresh,
        completedPuzzleIds: state.completedPuzzleIds,
        questsRewarded: state.questsRewarded,
        nextHeartAt: state.nextHeartAt,
        dailyPuzzleCompletedDate: state.dailyPuzzleCompletedDate,
        dailyPuzzleStreak: state.dailyPuzzleStreak,
        dailyPuzzleLastDate: state.dailyPuzzleLastDate,
        soundEnabled: state.soundEnabled,
        weeklyXp: state.weeklyXp,
        weeklyStartDate: state.weeklyStartDate,
        frozenDays: state.frozenDays,
        brokenDays: state.brokenDays,
        dailyGoalStreak: state.dailyGoalStreak,
        dailyGoalLastHitDate: state.dailyGoalLastHitDate,
        streakStartDate: state.streakStartDate,
        activeDates: state.activeDates,
        tier: state.tier,
        subscriptionExpiry: state.subscriptionExpiry,
        puzzlesPlayedToday: state.puzzlesPlayedToday,
        puzzlesPlayedDate: state.puzzlesPlayedDate,
        adsWatchedToday: state.adsWatchedToday,
        adsWatchDate: state.adsWatchDate,
        experiencedWonderIds: state.experiencedWonderIds,
        currentCipherWeek: state.currentCipherWeek,
        currentCipherSolved: state.currentCipherSolved,
        cipherSolveCount: state.cipherSolveCount,
        cipherRevealed: state.cipherRevealed,
        _lastEvalDate: state._lastEvalDate,
      }),
      onRehydrateStorage: () => () => {
        useUserStore.getState().checkStreak(false);
        useUserStore.getState().checkWeeklyReset();
      },
    },
  ),
);
