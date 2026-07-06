"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Sparkles, CheckCircle2, Flame, Loader2 } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 16 }}
    >
      <div className={cn(
        "group relative overflow-hidden rounded-3xl p-6 text-white sm:p-8",
        completed
          ? "bg-gradient-to-br from-success/80 to-emerald-600"
          : "bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#8b5cf6]",
      )}>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.06)_50%,transparent_75%)] bg-[length:250%_250%] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -right-12 size-44 rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-10 -left-10 size-36 rounded-full bg-white/5 blur-2xl"
        />

        <div className="relative">
          <div className="mb-4 flex items-center gap-3 sm:mb-5">
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
              className="glass-tint flex size-11 items-center justify-center rounded-xl sm:size-12"
            >
              <Brain className="size-6 sm:size-7" />
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-tint flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            >
              <Sparkles className="size-3" />
              {completed ? "Completed" : "Daily Puzzle"}
            </motion.span>
            {dailyPuzzleStreak > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className="glass-tint flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
              >
                <Flame className="size-3" />
                {dailyPuzzleStreak} day streak
              </motion.span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-white/70" />
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
                className="mt-2 text-sm text-white/80 sm:text-base"
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
                className="mt-2 text-sm text-white/80 sm:text-base"
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
                className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80"
              >
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize">
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
                className="mt-2 text-sm text-white/80 sm:text-base"
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
                <span className="flex items-center gap-1.5 text-white/70">
                  <Zap className="size-4" />
                  <span>+{bonusXp} XP today</span>
                </span>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
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
                  className="glass-tint mt-5 h-11 rounded-xl px-6 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/25 hover:shadow-lg active:scale-[0.95] sm:mt-6 sm:h-12 sm:px-8"
                >
                  Start Challenge
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
