"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, HeartCrack, ArrowLeft, Sparkles, Brain, Lightbulb, Atom, Grid2x2, ArrowRight, Flame, CheckCircle2, Loader2, Clock, Snowflake, X
} from "lucide-react";
import { useUserStore, resetHeartsLostFlag, setPuzzleHasLesson } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { CurriculumPath, type LessonProgress } from "@/features/puzzle/components/CurriculumPath";
import { LessonView } from "@/features/puzzle/components/LessonView";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { type Puzzle } from "@/types/puzzle";
import { toast } from "sonner";
import { getDailyPuzzle } from "@/services/daily-puzzle";
import { getPublishedByCategory } from "@/services/puzzle-service";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { ErrorFallback } from "@/components/error-fallback";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { ShopModal } from "@/components/shop/ShopModal";

import { categories } from "@/constants/home";

type View = "categories" | "browse" | "lesson" | "play";

const iconMap: Record<string, typeof Brain> = {
  brain: Brain,
  lightbulb: Lightbulb,
  atom: Atom,
  grid: Grid2x2,
};

function formatHeartTimer(ms: number): string {
  if (ms <= 0) return "Full";
  const totalHours = Math.floor(ms / 3600000);
  const totalMinutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (totalHours > 0) return `${totalHours}h ${totalMinutes}m ${seconds}s`;
  if (totalMinutes > 0) return `${totalMinutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function LearnPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("categories");
  const viewRef = useRef(view);
  viewRef.current = view;
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [timer, setTimer] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [catPuzzles, setCatPuzzles] = useState<Puzzle[]>([]);
  const [paywallType, setPaywallType] = useState<"limit" | "hearts" | null>(null);

  const hearts = useUserStore((s) => s.hearts);
  const getHeartTimer = useUserStore((s) => s.getHeartTimer);
  const processHeartRefill = useUserStore((s) => s.processHeartRefill);
  const setFocusMode = useUIStore((s) => s.setFocusMode);
  const showShop = useUIStore((s) => s.showShop);
  const setShowShop = useUIStore((s) => s.setShowShop);
  const addXp = useUserStore((s) => s.addXp);
  const addGems = useUserStore((s) => s.addGems);
  const useHeart = useUserStore((s) => s.useHeart);
  const logActivity = useUserStore((s) => s.logActivity);
  const checkStreak = useUserStore((s) => s.checkStreak);
  const markPuzzleCompleted = useUserStore((s) => s.markPuzzleCompleted);
  const hasCompletedPuzzle = useUserStore((s) => s.hasCompletedPuzzle);
  const completeDailyPuzzle = useUserStore((s) => s.completeDailyPuzzle);
  const hasCompletedDailyPuzzle = useUserStore((s) => s.hasCompletedDailyPuzzle);
  const setLastPlayedCategory = useUserStore((s) => s.setLastPlayedCategory);
  const checkAchievements = useUserStore((s) => s.checkAchievements);
  const canPlayPuzzle = useUserStore((s) => s.canPlayPuzzle);
  const incrementPuzzlePlayed = useUserStore((s) => s.incrementPuzzlePlayed);
  const tier = useUserStore((s) => s.tier);
  const streak = useUserStore((s) => s.streak);
  const lastActiveDate = useUserStore((s) => s.lastActiveDate);
  const frozenDays = useUserStore((s) => s.frozenDays);
  const brokenDays = useUserStore((s) => s.brokenDays);
  const streakStartDate = useUserStore((s) => s.streakStartDate);

  const streakMaintainedToday = useMemo(() => {
    return lastActiveDate === new Date().toDateString();
  }, [lastActiveDate]);

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const lastActiveMs = lastActiveDate ? new Date(lastActiveDate).getTime() : null;
    const streakStartMs = streakStartDate ? new Date(streakStartDate).getTime() : null;
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const days: { status: "filled" | "frozen" | "broken" | "empty"; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dateMs = todayMs - i * 86400000;
      const dateStr = new Date(dateMs).toDateString();
      const frozen = frozenDays.includes(dateStr);
      const filled = !frozen && streakStartMs != null && lastActiveMs != null ? dateMs >= streakStartMs && dateMs <= lastActiveMs : false;
      const broken = !filled && !frozen && brokenDays.includes(dateStr);
      days.push({ status: filled ? "filled" : frozen ? "frozen" : broken ? "broken" : "empty", label: dayLabels[new Date(dateMs).getDay()], isToday: i === 0 });
    }
    return days;
  }, [streak, lastActiveDate, frozenDays, brokenDays, streakStartDate]);

  useEffect(() => {
    const tick = () => {
      processHeartRefill();
      setTimer(getHeartTimer());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [processHeartRefill, getHeartTimer]);

  // Handle ?daily=true and ?category=id navigation (incl. sidebar/bottom-nav clicks)
  const searchParams = useSearchParams();
  useEffect(() => {
    (async () => {
      const category = searchParams.get("category");
      const daily = searchParams.get("daily");
      // Read latest values directly from store to avoid stale closure
      const { hearts: h, hasCompletedDailyPuzzle: checkDaily } = useUserStore.getState();

      if (daily === "true") {
        const puzzle = await getDailyPuzzle();
        if (puzzle && h > 0 && !checkDaily()) {
          setCurrentPuzzle(puzzle);
          setIsDaily(true);
          setView("play");
          setFocusMode(true);
        }
        return;
      }

      if (category) {
        setSelectedCat(category);
        setView("browse");
        return;
      }

      // No params — reset to categories view (handles sidebar/bottom-nav nav to /learn)
      setView("categories");
      setSelectedCat(null);
      setCurrentPuzzle(null);
      setIsDaily(false);
      setLessonProgress(null);
      setFocusMode(false);
      setAttempt(0);
      setCatPuzzles([]);
    })();
  }, [searchParams, setFocusMode]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCat(catId);
    setView("browse");
    router.push(`/learn?category=${catId}`, { scroll: false });
  };

  const handleBackToCategories = () => {
    setSelectedCat(null);
    setView("categories");
    router.push("/learn", { scroll: false });
  };

  const handleStartPuzzle = useCallback(async (puzzle: Puzzle, progress?: LessonProgress) => {
    if (hearts <= 0) { setPaywallType("hearts"); return; }
    const check = useUserStore.getState().canPlayPuzzle();
    if (!check) { setPaywallType("limit"); return; }
    resetHeartsLostFlag();
    setPuzzleHasLesson(!!puzzle.lessonContent);
    setIsDaily(false);
    setLastPlayedCategory(puzzle.category);
    setLessonProgress(progress ?? null);
    setAttempt(0);
    incrementPuzzlePlayed();

    // Load category puzzles for auto-advance
    const pz = await getPublishedByCategory(puzzle.category);
    setCatPuzzles(pz);

    if (puzzle.lessonContent?.trim()) {
      setCurrentPuzzle(puzzle);
      setView("lesson");
      setFocusMode(true);
    } else {
      setCurrentPuzzle(puzzle);
      setView("play");
      setFocusMode(true);
    }
  }, [hearts, setFocusMode, setLastPlayedCategory, incrementPuzzlePlayed]);

  const handleStartQuiz = useCallback(() => {
    setView("play");
  }, []);

  const handleComplete = useCallback((correct: boolean, xpEarned: number) => {
    if (!currentPuzzle) return;

    checkStreak();

    if (correct) {
      const firstTime = markPuzzleCompleted(currentPuzzle.id);

      if (isDaily) {
        const bonusXp = currentPuzzle.xpReward;
        const totalXp = bonusXp * 2;
        addXp(totalXp);
        addGems(5);
        completeDailyPuzzle();
        toast.success(`Daily Puzzle completed! +${totalXp} XP (2x bonus) +5 gems`, { position: "top-center" });
        import("@/services/sound-service").then(({ playDailyComplete, playXp, playGem }) => {
          playDailyComplete();
          setTimeout(playXp, 300);
          setTimeout(playGem, 600);
        });
        if (firstTime) {
          import("@/services/puzzle-service").then(({ incrementCompleted }) =>
            incrementCompleted(currentPuzzle.id),
          );
        }
      } else if (firstTime) {
        addXp(xpEarned);
        import("@/services/sound-service").then(({ playXp }) => playXp());
        import("@/services/puzzle-service").then(({ incrementCompleted }) =>
          incrementCompleted(currentPuzzle.id),
        );
      }

      // Auto-advance: if this is a lesson puzzle, find and jump to next sub-lesson
      if (lessonProgress) {
        logActivity({
          type: "daily",
          category: currentPuzzle.category || "general",
          title: currentPuzzle.title || "Puzzle",
          xp: isDaily ? (currentPuzzle.xpReward * 2) : xpEarned,
        });

        const next = findNextInGroup(currentPuzzle, catPuzzles);
        if (next) {
          setAttempt(0);
          setLessonProgress({
            ...lessonProgress,
            currentOrder: next.lessonOrder ?? 1,
            completedInGroup: lessonProgress.completedInGroup + 1,
          });
          if (next.lessonContent?.trim()) {
            setCurrentPuzzle(next);
            setView("lesson");
          } else {
            setCurrentPuzzle(next);
            setView("play");
          }
          return;
        }
        // Last in group — falls through to return to browse
      }
    } else if (lessonProgress) {
      // Wrong answer in lesson puzzle — retry same puzzle
      setAttempt((a) => a + 1);
      return;
    }

    checkAchievements();
    logActivity({
      type: "daily",
      category: currentPuzzle.category || "general",
      title: currentPuzzle.title || "Puzzle",
      xp: isDaily ? (currentPuzzle.xpReward * 2) : xpEarned,
    });

    setView("browse");
    setCurrentPuzzle(null);
    setIsDaily(false);
    setLessonProgress(null);
    setFocusMode(false);
  }, [addXp, addGems, checkStreak, logActivity, markPuzzleCompleted, completeDailyPuzzle, currentPuzzle, isDaily, setFocusMode, lessonProgress, catPuzzles]);

  const handleBack = () => {
    setView("browse");
    setCurrentPuzzle(null);
    setIsDaily(false);
    setLessonProgress(null);
    setFocusMode(false);
  };

  const handleCategoryChange = (cat: string | null) => {
    if (cat === null) {
      handleBackToCategories();
    }
  };

  function findNextInGroup(current: Puzzle, all: Puzzle[]): Puzzle | null {
    const sameGroup = all
      .filter((p) => p.lessonGroup === current.lessonGroup && p.id !== current.id)
      .sort((a, b) => (a.lessonOrder ?? 0) - (b.lessonOrder ?? 0));
    const currentOrder = current.lessonOrder ?? 0;
    for (const p of sameGroup) {
      if ((p.lessonOrder ?? 0) > currentOrder) return p;
    }
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:p-6">
      <AnimatePresence mode="wait">
        {view === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SectionHeader title="Learn" subtitle="Pick a category to explore" />

            {streak > 0 && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
                <GlassCard intensity="light" className="overflow-hidden p-4 sm:p-5">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 sm:size-11">
                        <Flame className="size-5 fill-orange-500 text-orange-500 sm:size-6" />
                      </span>
                      <div>
                        <p className="font-heading text-lg font-bold leading-none sm:text-xl">{streak}</p>
                        <p className="text-[11px] text-muted-foreground">Day Streak</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {streakDays.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground">{d.label}</span>
                          <div className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors sm:size-6 ${
                            d.status === "filled" ? "border-orange-500 bg-orange-500" :
                            d.status === "frozen" ? "border-blue-400 bg-blue-500/10" :
                            d.status === "broken" ? "border-red-400 bg-red-500/10" :
                            d.isToday ? "border-muted-foreground/40" : "border-muted-foreground/15"
                          }`}>
                            {d.status === "filled" && <CheckCircle2 className="size-3.5 text-white sm:size-4" />}
                            {d.status === "frozen" && <Snowflake className="size-3.5 text-blue-400 sm:size-4" />}
                            {d.status === "broken" && <X className="size-3.5 text-red-400 sm:size-4" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="ml-auto shrink-0 text-right">
                      <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        streakMaintainedToday
                          ? "bg-success/10 text-success"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>
                        {streakMaintainedToday ? (
                          <><CheckCircle2 className="size-3" /> Kept today</>
                        ) : (
                          <><Flame className="size-3" /> Do a lesson!</>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
            {hearts <= 0 ? (
              <GlassCard intensity="light" className="mx-auto mt-6 max-w-md p-6 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
                  <Heart className="size-7 text-destructive" />
                </div>
                <h3 className="text-lg font-bold">No Hearts Left</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Wait for a heart to refill to continue practicing.
                </p>
                <div className="mt-4">
                  <span className="text-2xl font-mono font-bold tabular-nums">
                    {formatHeartTimer(timer)}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">until next heart</p>
                </div>
              </GlassCard>
            ) : (
              <>
                {hearts < 5 && timer > 0 && (
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm">
                    <Heart className="size-4 fill-destructive text-destructive" />
                    <span className="text-muted-foreground">
                      Next heart in{" "}
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      {formatHeartTimer(timer)}
                    </span>
                  </div>
                )}

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {categories.map((cat, i) => {
                    const Icon = iconMap[cat.icon];
                    return (
                      <motion.div
                        key={cat.id}
                        className="h-full"
                        initial={{ opacity: 0, y: 40, rotateX: 10 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{
                          delay: 0.2 + i * 0.08,
                          type: "spring",
                          stiffness: 100,
                          damping: 16,
                        }}
                      >
                        <GlassCard
                          tint={cat.color}
                          hover
                          onClick={() => handleSelectCategory(cat.id)}
                          className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl p-5"
                        >
                          <div
                            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                            style={{
                              background: `radial-gradient(500px circle at 50% 50%, ${cat.color}15, transparent 60%)`,
                            }}
                          />

                          <div className="relative z-10 flex items-center gap-3">
                            <motion.span
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{
                                delay: 0.3 + i * 0.08,
                                type: "spring",
                                stiffness: 200,
                              }}
                              className="relative flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12"
                              style={{ backgroundColor: `${cat.color}18` }}
                            >
                              <span
                                className="absolute inset-0 rounded-xl opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-60"
                                style={{ backgroundColor: cat.color }}
                              />
                              <Icon className="relative size-5 sm:size-6" style={{ color: cat.color }} />
                            </motion.span>
                            <div className="min-w-0">
                              <h3 className="font-heading text-base font-semibold sm:text-lg">
                                {cat.title}
                              </h3>
                              <p className="text-xs text-muted-foreground sm:text-sm">
                                {cat.description}
                              </p>
                            </div>
                          </div>

                          <div className="relative z-10 mt-auto">
                            <div className="flex items-center justify-end">
                              <motion.span
                                initial={{ x: 0 }}
                                whileHover={{ x: 3 }}
                                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground"
                              >
                                Explore
                                <ArrowRight className="size-3.5" />
                              </motion.span>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {view === "browse" && (
          <motion.div
            key="browse"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <button
              onClick={handleBackToCategories}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              All categories
            </button>

            {selectedCat && (
              <div className="mb-5 flex items-center gap-3">
                {(() => {
                  const cat = categories.find((c) => c.id === selectedCat);
                  if (!cat) return null;
                  const Icon = iconMap[cat.icon];
                  return (
                    <>
                      <span className="flex size-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color}18` }}>
                        <Icon className="size-5" style={{ color: cat.color }} />
                      </span>
                      <h2 className="font-heading text-xl font-bold">{cat.title}</h2>
                    </>
                  );
                })()}
              </div>
            )}

            {hearts <= 0 ? (
              <GlassCard intensity="light" className="mx-auto mt-6 max-w-md p-6 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
                  <Heart className="size-7 text-destructive" />
                </div>
                <h3 className="text-lg font-bold">No Hearts Left</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Wait for a heart to refill to continue practicing.
                </p>
                <div className="mt-4">
                  <span className="text-2xl font-mono font-bold tabular-nums">
                    {formatHeartTimer(timer)}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">until next heart</p>
                </div>
              </GlassCard>
            ) : (
              <>
                {hearts < 5 && timer > 0 && (
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm">
                    <Heart className="size-4 fill-destructive text-destructive" />
                    <span className="text-muted-foreground">
                      Next heart in{" "}
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      {formatHeartTimer(timer)}
                    </span>
                  </div>
                )}

                {/* Compact streak */}
                {streak > 0 && (
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-orange-500/5 px-4 py-2 text-xs sm:text-sm">
                    <Flame className="size-4 fill-orange-500 text-orange-500" />
                    <span className="font-semibold text-foreground">{streak} Day Streak</span>
                    <span className="text-muted-foreground">&middot;</span>
                    {streakMaintainedToday ? (
                      <span className="font-medium text-success">Today's done</span>
                    ) : (
                      <span className="font-medium text-amber-500">Do a lesson</span>
                    )}
                  </div>
                )}

                {/* Curriculum */}
                <CurriculumPath category={selectedCat!} onStartPuzzle={handleStartPuzzle} />
              </>
            )}
          </motion.div>
        )}

        {view === "lesson" && currentPuzzle && (
          <motion.div
            key="lesson"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative"
          >
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>

            {lessonProgress && (
              <div className="absolute right-0 top-3 h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-32">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(lessonProgress.completedInGroup / lessonProgress.totalInGroup) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]"
                />
              </div>
            )}

            <LessonView puzzle={currentPuzzle} onStartQuiz={handleStartQuiz} />
          </motion.div>
        )}

        {view === "play" && (
          <PuzzlePlayView
            currentPuzzle={currentPuzzle}
            isDaily={isDaily}
            lessonProgress={lessonProgress}
            handleBack={handleBack}
            handleComplete={handleComplete}
            useHeart={useHeart}
            hasCompletedPuzzle={hasCompletedPuzzle}
            attempt={attempt}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paywallType && (
          <PaywallModal
            type={paywallType}
            onClose={() => setPaywallType(null)}
            onGoPremium={() => {
              setPaywallType(null);
              setShowShop(true);
            }}
          />
        )}
        {showShop && <ShopModal onClose={() => setShowShop(false)} />}
      </AnimatePresence>
    </div>
  );
}

function PuzzlePlayView({
  currentPuzzle,
  isDaily,
  lessonProgress,
  handleBack,
  handleComplete,
  useHeart,
  hasCompletedPuzzle,
  attempt,
}: {
  currentPuzzle: Puzzle | null;
  isDaily: boolean;
  lessonProgress: LessonProgress | null;
  handleBack: () => void;
  handleComplete: (correct: boolean, xpEarned: number) => void;
  useHeart: () => void;
  hasCompletedPuzzle: (id: string) => boolean;
  attempt: number;
}) {
  const { timedOut, cancel } = useLoadingTimeout(6000);

  useEffect(() => {
    if (currentPuzzle) cancel();
  }, [currentPuzzle, cancel]);

  return (
    <ErrorBoundary>
      <motion.div
        key="play"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="relative"
      >
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        {lessonProgress && (
          <div className="absolute right-0 top-3 h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-32">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(lessonProgress.completedInGroup / lessonProgress.totalInGroup) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]"
            />
          </div>
        )}

        {isDaily && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-2.5 text-sm font-semibold"
          >
            <Sparkles className="size-4 text-primary" />
            Daily Puzzle &middot; 2x XP &middot; +5 gems
          </motion.div>
        )}

        {timedOut && !currentPuzzle ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <Clock className="size-6 text-amber-500" />
            </div>
            <h3 className="font-heading text-lg font-bold">Taking longer than expected</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This puzzle is taking a while to load. Please try again or contact support if the issue persists.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleBack}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : currentPuzzle ? (
          <PuzzlePlay
            key={`${currentPuzzle.id}-${attempt}`}
            puzzle={currentPuzzle}
            onComplete={handleComplete}
            onWrongAttempt={() => {
              useHeart();
              toast.custom(
                (t) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-card px-4 py-3 shadow-lg"
                  >
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.4 }}
                      className="flex size-8 items-center justify-center rounded-lg bg-destructive/10"
                    >
                      <HeartCrack className="size-4 text-destructive" />
                    </motion.span>
                    <div>
                      <p className="text-sm font-semibold text-destructive">-1 Heart</p>
                      <p className="text-xs text-muted-foreground">Wrong answer!</p>
                    </div>
                  </motion.div>
                ),
                { duration: 1500, position: "top-center" },
              );
            }}
            isRepeat={currentPuzzle ? hasCompletedPuzzle(currentPuzzle.id) : false}
          />
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading puzzle...</p>
            </div>
          </div>
        )}
      </motion.div>
    </ErrorBoundary>
  );
}
