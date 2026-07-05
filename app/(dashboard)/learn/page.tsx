"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { PuzzleBrowser } from "@/features/puzzle/components/PuzzleBrowser";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { type Puzzle } from "@/types/puzzle";

type View = "browse" | "play" | "result";

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
  const [view, setView] = useState<View>("browse");
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [lastResult, setLastResult] = useState<{ correct: boolean; xp: number } | null>(null);
  const [timer, setTimer] = useState(0);

  const hearts = useUserStore((s) => s.hearts);
  const getHeartTimer = useUserStore((s) => s.getHeartTimer);
  const processHeartRefill = useUserStore((s) => s.processHeartRefill);
  const addXp = useUserStore((s) => s.addXp);
  const useHeart = useUserStore((s) => s.useHeart);
  const logActivity = useUserStore((s) => s.logActivity);
  const checkStreak = useUserStore((s) => s.checkStreak);
  const markPuzzleCompleted = useUserStore((s) => s.markPuzzleCompleted);
  const hasCompletedPuzzle = useUserStore((s) => s.hasCompletedPuzzle);

  useEffect(() => {
    const tick = () => {
      processHeartRefill();
      setTimer(getHeartTimer());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [processHeartRefill, getHeartTimer]);

  const handleStartPuzzle = useCallback((puzzle: Puzzle) => {
    if (hearts <= 0) return;
    useHeart();
    setCurrentPuzzle(puzzle);
    setView("play");
  }, [hearts, useHeart]);

  const handleComplete = useCallback((correct: boolean, xpEarned: number) => {
    setLastResult({ correct, xp: xpEarned });

    if (!currentPuzzle) return;

    if (correct) {
      const firstTime = markPuzzleCompleted(currentPuzzle.id);
      if (firstTime) {
        addXp(xpEarned);
      }
    } else {
      useHeart();
    }

    checkStreak();
    logActivity({
      type: "daily",
      category: currentPuzzle.category || "general",
      title: currentPuzzle.title || "Puzzle",
      xp: xpEarned,
    });

    setView("browse");
    setCurrentPuzzle(null);
  }, [addXp, useHeart, checkStreak, logActivity, markPuzzleCompleted, currentPuzzle]);

  const handleBack = () => {
    setView("browse");
    setCurrentPuzzle(null);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:p-6">
      <AnimatePresence mode="wait">
        {view === "browse" && (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SectionHeader title="Learn" subtitle="Pick a puzzle to solve" />
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
                <PuzzleBrowser onStartPuzzle={handleStartPuzzle} />
              </>
            )}
          </motion.div>
        )}

        {view === "play" && currentPuzzle && (
          <motion.div
            key="play"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to puzzles
            </button>
            <PuzzlePlay
              puzzle={currentPuzzle}
              onComplete={handleComplete}
              onRetry={() => useHeart()}
              isRepeat={hasCompletedPuzzle(currentPuzzle.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
