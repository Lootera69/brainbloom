"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Lock, CheckCircle2, Zap, Loader2, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getPublishedByCategory, categoryHasLessons } from "@/services/puzzle-service";
import { useUserStore } from "@/store/user-store";
import { type Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";

interface Props {
  category: string;
  onStartPuzzle: (puzzle: Puzzle) => void;
}

export function CurriculumPath({ category, onStartPuzzle }: Props) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLessons, setHasLessons] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);

  useEffect(() => {
    (async () => {
      const [all, h] = await Promise.all([getPublishedByCategory(category), categoryHasLessons(category)]);
      setHasLessons(h);
      setPuzzles(all);
      setLoading(false);
    })();
  }, [category]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-20 text-center">
        <p className="text-sm text-muted-foreground">No puzzles available in this category yet.</p>
      </div>
    );
  }

  // Split: lessons (with lessonOrder) and extras (without)
  const lessons = puzzles.filter((p) => p.lessonOrder != null && p.lessonContent?.trim())
    .sort((a, b) => (a.lessonOrder ?? 0) - (b.lessonOrder ?? 0));
  const extras = puzzles.filter((p) => p.lessonOrder == null || !p.lessonContent?.trim());

  // Determine which lessons are unlocked
  const getLessonState = (puzzle: Puzzle, index: number): "locked" | "available" | "completed" => {
    if (completedPuzzleIds.includes(puzzle.id)) return "completed";
    if (index === 0) return "available";
    const prev = lessons[index - 1];
    if (prev && completedPuzzleIds.includes(prev.id)) return "available";
    return "locked";
  };

  const allCompleted = lessons.length > 0 && lessons.every((p) => completedPuzzleIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <BookOpen className="size-3.5" />
        {hasLessons ? "Learning Path" : "Puzzles"}
      </div>

      {/* Lesson nodes */}
      {hasLessons && lessons.length > 0 && (
        <div className="relative space-y-1">
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-3 rounded-xl border border-success/20 bg-success/5 p-4 text-center"
            >
              <CheckCircle2 className="mx-auto mb-1 size-6 text-success" />
              <p className="text-sm font-semibold text-success">All lessons completed!</p>
              <p className="text-xs text-muted-foreground">Great work — you mastered this category.</p>
            </motion.div>
          )}

          {lessons.map((puzzle, i) => {
            const state = getLessonState(puzzle, i);
            const isFirstUnlocked = state === "available";
            return (
              <motion.div
                key={puzzle.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <button
                  onClick={() => state !== "locked" && onStartPuzzle(puzzle)}
                  disabled={state === "locked"}
                  className="w-full text-left"
                >
                  <GlassCard
                    hover={state !== "locked"}
                    intensity="light"
                    className={cn(
                      "flex items-center gap-4 p-4 transition-all sm:p-5",
                      state === "locked" && "opacity-50",
                      state === "completed" && "ring-1 ring-success/20",
                      isFirstUnlocked && "ring-2 ring-primary/30",
                    )}
                  >
                    <span className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      state === "completed" && "bg-success/10",
                      state === "available" && "bg-primary/10",
                      state === "locked" && "bg-muted",
                    )}>
                      {state === "completed" ? (
                        <CheckCircle2 className="size-5 text-success" />
                      ) : state === "locked" ? (
                        <Lock className="size-4 text-muted-foreground" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{puzzle.lessonOrder}</span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "truncate text-sm font-semibold",
                          state === "locked" && "text-muted-foreground",
                        )}>
                          {state === "locked" ? "Locked" : puzzle.title}
                        </h3>
                        {state === "completed" && (
                          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                            Done
                          </span>
                        )}
                        {isFirstUnlocked && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Start
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {state === "locked"
                          ? "Complete the previous lesson first"
                          : `${puzzle.difficulty} · ${puzzle.type.replace("-", " ")} · ${puzzle.xpReward} XP`}
                      </p>
                    </div>

                    {state !== "locked" && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
                  </GlassCard>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Extra puzzles (no lesson content) */}
      {extras.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Zap className="size-3" />
            {showAll ? "Hide extra puzzles" : `${extras.length} more puzzle${extras.length !== 1 ? "s" : ""}`}
          </button>

          {showAll && (
            <div className="mt-3 space-y-2">
              {extras.map((puzzle) => {
                const done = completedPuzzleIds.includes(puzzle.id);
                return (
                  <motion.button
                    key={puzzle.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onStartPuzzle(puzzle)}
                    className="w-full text-left"
                  >
                    <GlassCard hover intensity="light"
                      className={`flex items-center gap-3 p-3 sm:p-4 ${done ? "ring-1 ring-success/20" : ""}`}
                    >
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${done ? "bg-success/10" : "bg-muted"}`}>
                        {done ? <CheckCircle2 className="size-4 text-success" /> : <Zap className="size-4 text-muted-foreground" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{puzzle.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {puzzle.difficulty} · {puzzle.xpReward} XP
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </GlassCard>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
