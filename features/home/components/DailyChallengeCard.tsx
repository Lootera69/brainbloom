"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Sparkles, Flame, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { type Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";

interface Props {
  puzzle: Puzzle | null;
  loading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  "multiple-choice": "Multiple Choice",
  "true-false": "True / False",
  "type-answer": "Type Answer",
  "crossword": "Crossword",
};

export function DailyChallengeCard({ puzzle, loading }: Props) {
  const router = useRouter();
  const hasCompletedDaily = useUserStore((s) => s.hasCompletedDailyPuzzle);
  const dailyPuzzleStreak = useUserStore((s) => s.dailyPuzzleStreak);
  const completed = hasCompletedDaily();
  const bonusXp = puzzle ? puzzle.xpReward * 2 : 0;

  const sparkles = Array.from({ length: 8 }).map((_, i) => ({
    x: 8 + (i * 13) % 85,
    y: 10 + (i * 17) % 75,
    delay: i * 0.6,
    size: 2 + (i % 3),
    duration: 2.5 + (i % 2),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 16 }}
    >
      <div className={cn(
        "group relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl shadow-primary/10 dark:shadow-primary/5",
        completed
          ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-success/80 dark:via-emerald-700 dark:to-emerald-600 text-emerald-800 dark:text-white"
          : "bg-gradient-to-br from-indigo-50 via-purple-50 to-fuchsia-50 dark:from-[#312e81] dark:via-[#6d28d9] dark:to-[#a21caf] text-indigo-900 dark:text-white",
      )}>
        {/* Shimmer overlay */}
        <div className={cn(
          "absolute inset-0 bg-[length:250%_250%] opacity-0 transition-opacity duration-700 group-hover:opacity-100",
          completed
            ? "bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] dark:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.04)_50%,transparent_75%)]"
            : "bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%)] dark:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.06)_50%,transparent_75%)]"
        )} />

        {/* Animated floating orbs */}
        <motion.div
          animate={{ y: [0, -15, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "absolute -top-14 -right-14 size-48 rounded-full blur-3xl",
            completed
              ? "bg-emerald-200/40 dark:bg-emerald-400/[0.06]"
              : "bg-white/30 dark:bg-white/[0.04]"
          )}
        />
        <motion.div
          animate={{ y: [0, 12, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className={cn(
            "absolute -bottom-12 -left-12 size-40 rounded-full blur-2xl",
            completed
              ? "bg-teal-200/30 dark:bg-teal-400/[0.04]"
              : "bg-white/20 dark:bg-white/[0.03]"
          )}
        />

        {/* Sparkle particles — light mode only */}
        <div className="pointer-events-none absolute inset-0 dark:hidden">
          {sparkles.map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%` }}
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0, 1.4, 0],
              }}
              transition={{
                duration: s.duration,
                repeat: Infinity,
                delay: s.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-xl backdrop-blur-sm shadow-lg sm:size-12",
                completed
                  ? "bg-emerald-100/60 dark:bg-emerald-400/10 shadow-emerald-500/10 dark:shadow-none"
                  : "bg-white/50 dark:bg-white/10 shadow-indigo-500/10 dark:shadow-none"
              )}
            >
              <Brain className={cn("size-6 sm:size-7", completed ? "text-emerald-600 dark:text-emerald-300" : "text-indigo-600 dark:text-white")} />
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm shadow-sm",
                completed
                  ? "bg-emerald-100/60 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200"
                  : "bg-white/50 dark:bg-white/10 text-indigo-700 dark:text-white"
              )}
            >
              <Sparkles className="size-3" />
              {completed ? "Completed" : "Daily Puzzle"}
            </motion.span>

            {dailyPuzzleStreak > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm shadow-sm",
                  completed
                    ? "bg-emerald-100/60 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200"
                    : "bg-white/50 dark:bg-white/10 text-indigo-700 dark:text-white"
                )}
              >
                <Flame className="size-3" />
                {dailyPuzzleStreak} day streak
              </motion.span>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-11 animate-pulse rounded-xl bg-white/20 sm:size-12" />
                <div className="h-5 w-28 animate-pulse rounded-full bg-white/20" />
              </div>
              <div className="space-y-3">
                <div className="h-8 w-3/4 animate-pulse rounded bg-white/20" />
                <div className="h-4 w-full animate-pulse rounded bg-white/20" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/20" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-24 animate-pulse rounded bg-white/20" />
                <div className="h-5 w-16 animate-pulse rounded bg-white/20" />
              </div>
              <div className="mt-5 h-12 w-40 animate-pulse rounded-xl bg-white/20" />
            </div>
          ) : !puzzle ? (
            <>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="font-heading text-xl font-bold sm:text-2xl"
              >
                No Puzzle Today
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-2 text-sm text-indigo-600/80 dark:text-white/80 sm:text-base"
              >
                Check back later for a new daily challenge!
              </motion.p>
            </>
          ) : completed ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="size-6" />
                <h2 className="font-heading text-xl font-bold sm:text-2xl">{puzzle.title}</h2>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-2 text-sm text-indigo-600/80 dark:text-white/80 sm:text-base"
              >
                You solved today&apos;s puzzle! Come back tomorrow for a new challenge.
              </motion.p>
            </>
          ) : (
            <>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="font-heading text-xl font-bold sm:text-2xl"
              >
                {puzzle.title}
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 flex flex-wrap items-center gap-2 text-sm text-indigo-600/80 dark:text-white/80"
              >
                <span className="rounded-full bg-white/30 dark:bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize">
                  {puzzle.category}
                </span>
                <span className="capitalize">{puzzle.difficulty}</span>
                <span>&middot;</span>
                <span>{TYPE_LABELS[puzzle.type] || puzzle.type}</span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-2 text-sm text-indigo-600/80 dark:text-white/80 sm:text-base"
              >
                {puzzle.question.length > 100
                  ? puzzle.question.slice(0, 100) + "..."
                  : puzzle.question}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="mt-4 flex items-center gap-3 text-sm sm:mt-5"
              >
                <span className="flex items-center gap-1.5 text-indigo-600/70 dark:text-white/70">
                  <Zap className="size-4" />
                  <span>+{bonusXp} XP today</span>
                </span>
                <span className="rounded-full bg-amber-400/30 dark:bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-200">
                  2x Bonus
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={() => router.push("/learn?daily=true")}
                  className="group/btn relative mt-5 h-11 overflow-hidden rounded-xl border border-white/40 bg-white/20 px-6 text-sm font-semibold text-indigo-900 shadow-lg shadow-indigo-500/10 backdrop-blur-xl transition-all duration-300 hover:bg-white/30 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.95] dark:border-white/20 dark:bg-white/10 dark:text-white dark:shadow-black/20 dark:hover:bg-white/20 sm:mt-6 sm:h-12 sm:px-8"
                >
                  {/* Glassy sheen sweep */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full dark:via-white/20" />
                  {/* Top highlight edge */}
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/30" />
                  <span className="relative">Start Challenge</span>
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
