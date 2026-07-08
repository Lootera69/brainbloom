"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, HeartCrack, ArrowLeft, Sparkles, Brain, Lightbulb, Atom, Grid2x2, ArrowRight } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { CurriculumPath, type LessonProgress } from "@/features/puzzle/components/CurriculumPath";
import { LessonView } from "@/features/puzzle/components/LessonView";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { type Puzzle } from "@/types/puzzle";
import { toast } from "sonner";
import { getDailyPuzzle } from "@/services/daily-puzzle";
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
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [timer, setTimer] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);

  const hearts = useUserStore((s) => s.hearts);
  const getHeartTimer = useUserStore((s) => s.getHeartTimer);
  const processHeartRefill = useUserStore((s) => s.processHeartRefill);
  const setFocusMode = useUIStore((s) => s.setFocusMode);
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

  useEffect(() => {
    const tick = () => {
      processHeartRefill();
      setTimer(getHeartTimer());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [processHeartRefill, getHeartTimer]);

  // Handle ?daily=true and ?category=id
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("daily") === "true") {
        const puzzle = await getDailyPuzzle();
        if (puzzle && hearts > 0 && !hasCompletedDailyPuzzle()) {
          setCurrentPuzzle(puzzle);
          setIsDaily(true);
          setView("play");
          setFocusMode(true);
        }
      } else if (params.get("category")) {
        const cat = params.get("category");
        setSelectedCat(cat);
        setView("browse");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleStartPuzzle = useCallback((puzzle: Puzzle, progress?: LessonProgress) => {
    if (hearts <= 0) return;
    setIsDaily(false);
    setLastPlayedCategory(puzzle.category);
    setLessonProgress(progress ?? null);

    if (puzzle.lessonContent?.trim()) {
      setCurrentPuzzle(puzzle);
      setView("lesson");
      setFocusMode(true);
    } else {
      setCurrentPuzzle(puzzle);
      setView("play");
      setFocusMode(true);
    }
  }, [hearts, setFocusMode, setLastPlayedCategory]);

  const handleStartQuiz = useCallback(() => {
    setView("play");
  }, []);

  const handleComplete = useCallback((correct: boolean, xpEarned: number) => {
    if (!currentPuzzle) return;

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
    }

    checkStreak();
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
  }, [addXp, addGems, checkStreak, logActivity, markPuzzleCompleted, completeDailyPuzzle, currentPuzzle, isDaily, setFocusMode]);

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
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-sm">
                    <Heart className="size-4 fill-primary text-primary" />
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
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-sm">
                    <Heart className="size-4 fill-primary text-primary" />
                    <span className="text-muted-foreground">
                      Next heart in{" "}
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      {formatHeartTimer(timer)}
                    </span>
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
                  animate={{ width: `${((lessonProgress.currentOrder) / lessonProgress.totalInGroup) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]"
                />
              </div>
            )}

            <LessonView puzzle={currentPuzzle} onStartQuiz={handleStartQuiz} />
          </motion.div>
        )}

        {view === "play" && currentPuzzle && (
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
                  animate={{ width: `${((lessonProgress.currentOrder) / lessonProgress.totalInGroup) * 100}%` }}
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
            <PuzzlePlay
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
              isRepeat={hasCompletedPuzzle(currentPuzzle.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
