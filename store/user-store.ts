import { create } from "zustand";
import { persist } from "zustand/middleware";
import { questTemplates } from "@/constants/quests";

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

  loginAsGuest: () => void;
  setUser: (user: { uid: string; displayName: string; email: string | null; photoURL: string | null }) => void;
  logout: () => void;
  syncToFirestore: () => void;
  loadFromFirestore: () => Promise<void>;
  addXp: (amount: number) => void;
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
}

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function calcLevel(xp: number): number {
  return Math.floor(xp / 200) + 1;
}

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

      loginAsGuest: () => {
        set({
          userId: generateId(),
          displayName: "Guest",
          email: null,
          photoURL: null,
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
          isGuest: false,
          isAuthenticated: true,
        });
        setTimeout(async () => {
          await get().loadFromFirestore();
          setTimeout(() => get().syncToFirestore(), 200);
        }, 100);
      },

      syncToFirestore: () => {
        const s = get();
        if (!s.userId || s.isGuest) return;
        import("@/services/user-service").then(({ saveUserData }) =>
          saveUserData(s.userId, {
            displayName: s.displayName,
            email: s.email,
            photoURL: s.photoURL,
            xp: s.xp,
            xpToday: s.xpToday,
            streak: s.streak,
            lastActiveDate: s.lastActiveDate,
            hearts: s.hearts,
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
              xp: data.xp ?? s.xp,
              xpToday: data.xpToday ?? s.xpToday,
              streak: data.streak ?? s.streak,
              lastActiveDate: data.lastActiveDate ?? s.lastActiveDate,
              hearts: data.hearts ?? s.hearts,
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
            });
          } else {
            get().syncToFirestore();
          }
        } catch {}
      },

      logout: () => {
        set({
          userId: "",
          displayName: "",
          email: null,
          photoURL: null,
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

        });
      },

      addXp: (amount) => {
        const { xp, xpToday } = get();
        const newXp = xp + amount;
        set({
          xp: newXp,
          xpToday: xpToday + amount,
          level: calcLevel(newXp),
          lastXpGain: amount,
        });
        get().advanceQuest("earn-xp", amount);
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
        const { lastActiveDate, streak, streakFreezes, dailyQuests, lastQuestRefresh } = get();
        const today = new Date().toDateString();

        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const dayBeforeYesterday = new Date(Date.now() - 172800000).toDateString();

        if (lastActiveDate === today) {
          if (lastQuestRefresh !== today) {
            set({ dailyQuests: getRefreshedQuests(), lastQuestRefresh: today, xpToday: 0, questsRewarded: [] });
          }
          return;
        }

        let newStreak: number;
        let freezesUsed = streakFreezes;

        if (lastActiveDate === yesterday) {
          newStreak = streak + 1;
        } else if (streakFreezes > 0 && lastActiveDate === dayBeforeYesterday) {
          newStreak = streak;
          freezesUsed = streakFreezes - 1;
        } else {
          newStreak = 1;
        }

        get().processHeartRefill();
        set({
          streak: newStreak,
          streakFreezes: freezesUsed,
          lastActiveDate: today,
          xpToday: 0,
          dailyQuests: getRefreshedQuests(),
          lastQuestRefresh: today,
          questsRewarded: [],
          practiceHeartsToday: 0,
          lastPracticeDate: today,
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
        set({
          achievements: [
            ...achievements,
            { id, unlockedAt: Date.now() },
          ],
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
        const elapsed = now - nextHeartAt;
        const heartsToAdd = Math.floor(elapsed / (5 * 60 * 60 * 1000)) + 1;
        const newHearts = Math.min(5, hearts + heartsToAdd);
        const remainingMs = (heartsToAdd - 1) * 5 * 60 * 60 * 1000 + (5 * 60 * 60 * 1000 - (elapsed % (5 * 60 * 60 * 1000)));
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
    }),
    { name: "brainbloom-user" },
  ),
);
