"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Lightbulb, Atom, Grid2x2, ArrowRight, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getPublishedPuzzles, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { useUserStore } from "@/store/user-store";
import { type Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Brain> = {
  brain: Brain,
  lightbulb: Lightbulb,
  atom: Atom,
  grid: Grid2x2,
};

interface Props {
  onStartPuzzle: (puzzle: Puzzle) => void;
  onCategoryChange?: (category: string | null) => void;
}

export function PuzzleBrowser({ onStartPuzzle, onCategoryChange }: Props) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<string | null>(null);
  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);

  useEffect(() => {
    (async () => {
      const data = await getPublishedPuzzles();
      setPuzzles(data);
      setLoading(false);
    })();
  }, []);

  const filtered = puzzles.filter((p) => {
    if (selectedCat && p.category !== selectedCat) return false;
    if (selectedDiff && p.difficulty !== selectedDiff) return false;
    return true;
  });

  const categoryData = CATEGORIES.map((c) => ({
    ...c,
    count: puzzles.filter((p) => p.category === c.value).length,
    icon: (iconMap[c.value === "riddles" ? "lightbulb" : c.value === "science" ? "atom" : c.value === "puzzles" ? "grid" : "brain"]),
  }));

  const diffLabel = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.label ?? v;

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
        <p className="text-sm text-muted-foreground">No puzzles available yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setSelectedCat(null); onCategoryChange?.(null); }}
          className={cn(
            "shrink-0 rounded-xl border px-4 py-2 text-xs font-medium transition-all",
            !selectedCat ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
          )}
        >
          All
        </button>
        {categoryData.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => { const next = selectedCat === cat.value ? null : cat.value; setSelectedCat(next); onCategoryChange?.(next); }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-medium transition-all",
                selectedCat === cat.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted",
              )}
            >
              <Icon className="size-3.5" />
              {cat.label}
              <span className="text-muted-foreground">({cat.count})</span>
            </button>
          );
        })}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2 flex-wrap">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDiff(selectedDiff === d.value ? null : d.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              selectedDiff === d.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Puzzle list */}
      <div className="space-y-3">
        {filtered.map((puzzle, i) => (
          <motion.button
            key={puzzle.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onStartPuzzle(puzzle)}
            className="w-full text-left"
          >
            <GlassCard
              hover
              intensity="light"
              className={`flex items-center gap-4 p-4 sm:p-5 ${
                completedPuzzleIds.includes(puzzle.id) ? "ring-1 ring-success/20" : ""
              }`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                completedPuzzleIds.includes(puzzle.id)
                  ? "bg-success/10"
                  : "bg-primary/10"
              }`}>
                {completedPuzzleIds.includes(puzzle.id) ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <Zap className="size-5 text-primary" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{puzzle.title}</h3>
                  {completedPuzzleIds.includes(puzzle.id) && (
                    <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      Completed
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {diffLabel(puzzle.difficulty)} &middot; {puzzle.xpReward} XP &middot;{" "}
                  {puzzle.type === "true-false" ? "True / False" : puzzle.type === "crossword" ? `Crossword (${puzzle.crosswordData?.size}×${puzzle.crosswordData?.size})` : puzzle.type === "type-answer" ? "Type Answer" : "Multiple Choice"}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </GlassCard>
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No puzzles match these filters.
        </p>
      )}
    </div>
  );
}
