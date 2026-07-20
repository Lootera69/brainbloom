"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, Lock, CheckCircle2, Zap, ArrowRight, ChevronDown, BookX } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getPublishedByCategory, categoryHasLessons } from "@/services/puzzle-service";
import { useUserStore } from "@/store/user-store";
import { type Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";
import { SkeletonCurriculum } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export interface LessonProgress {
  currentOrder: number;
  totalInGroup: number;
  completedInGroup: number;
  groupName: string;
  groupNumber: number;
}

interface Props {
  category: string;
  onStartPuzzle: (puzzle: Puzzle, progress?: LessonProgress) => void;
}

interface LessonGroup {
  name: string;
  order: number;
  puzzles: Puzzle[];
}

export function CurriculumPath({ category, onStartPuzzle }: Props) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLessons, setHasLessons] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);
  const experiencedWonderIds = useUserStore((s) => s.experiencedWonderIds);

  function isPuzzleCompleted(puzzle: Puzzle): boolean {
    if (puzzle.type === "wonder") return experiencedWonderIds.includes(puzzle.id);
    return completedPuzzleIds.includes(puzzle.id);
  }

  useEffect(() => {
    (async () => {
      const [all, h] = await Promise.all([getPublishedByCategory(category), categoryHasLessons(category)]);
      setHasLessons(h);
      setPuzzles(all);
      setLoading(false);
    })();
  }, [category]);

  const lessonPuzzles = useMemo(() =>
    puzzles.filter((p) => p.lessonOrder != null)
      .sort((a, b) => {
        const go = (a.lessonGroupOrder ?? 999) - (b.lessonGroupOrder ?? 999);
        if (go !== 0) return go;
        return (a.lessonOrder ?? 0) - (b.lessonOrder ?? 0);
      }),
  [puzzles]);

  // Group by lessonGroup (puzzles without group → default single group)
  const groups: LessonGroup[] = useMemo(() => {
    const map = new Map<string, Puzzle[]>();
    for (const p of lessonPuzzles) {
      const key = p.lessonGroup || "__default__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const result: LessonGroup[] = [];
    for (const [name, groupPuzzles] of map) {
      result.push({
        name: name === "__default__" ? "" : name,
        order: groupPuzzles[0]?.lessonGroupOrder ?? 0,
        puzzles: groupPuzzles,
      });
    }
    result.sort((a, b) => a.order - b.order);
    return result;
  }, [lessonPuzzles]);

  const extras = puzzles.filter((p) => p.lessonOrder == null);

  // Auto-expand the first group with remaining work on mount
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      const allDone = groups.every((g) => isGroupCompleted(g));
      if (!allDone) {
        const firstWithWork = groups.findIndex((g, gi) =>
          !isGroupCompleted(g) && (gi === 0 || isGroupCompleted(groups[gi - 1])),
        );
        setExpandedGroups(new Set([groups[Math.max(0, firstWithWork)].name]));
      }
    }
  }, [groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if all sub-lessons in a group are completed
  const isGroupCompleted = (group: LessonGroup) =>
    group.puzzles.length > 0 && group.puzzles.every((p) => isPuzzleCompleted(p));

  // Check if a group is unlocked (previous group fully completed, or it's the first)
  const isGroupUnlocked = (groupIndex: number) => {
    if (groupIndex === 0) return true;
    return isGroupCompleted(groups[groupIndex - 1]);
  };

  // Determine sub-lesson state within a group
  const getSubLessonState = (puzzle: Puzzle, subIndex: number, groupIndex: number): "locked" | "available" | "completed" => {
    if (isPuzzleCompleted(puzzle)) return "completed";
    // Group is locked → all sub-lessons locked
    if (!isGroupUnlocked(groupIndex)) return "locked";
    // First sub-lesson in unlocked group → available
    if (subIndex === 0) return "available";
    // Check previous sub-lesson in same group
    const prev = groups[groupIndex].puzzles[subIndex - 1];
    if (prev && isPuzzleCompleted(prev)) return "available";
    return "locked";
  };

  const allCompleted = groups.length > 0 && groups.every((g) => isGroupCompleted(g));

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) {
    return <SkeletonCurriculum />;
  }

  if (puzzles.length === 0) {
    return <EmptyState icon={<BookX className="size-5" />} title="No puzzles available in this category yet." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <BookOpen className="size-3.5" />
        {hasLessons ? "Learning Path" : "Puzzles"}
      </div>

      {/* Lesson Groups */}
      {hasLessons && groups.length > 0 && (
        <div className="relative space-y-4">
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-success/20 bg-success/5 p-4 text-center"
            >
              <CheckCircle2 className="mx-auto mb-1 size-6 text-success" />
              <p className="text-sm font-semibold text-success">All lessons completed!</p>
              <p className="text-xs text-muted-foreground">Great work — you mastered this category.</p>
            </motion.div>
          )}

          {groups.map((group, gi) => {
            const groupUnlocked = isGroupUnlocked(gi);
            const groupDone = isGroupCompleted(group);
            const isExpanded = expandedGroups.has(group.name);
            const firstUnlockedSub = group.puzzles.findIndex(
              (p, si) => getSubLessonState(p, si, gi) === "available"
            );

            return (
              <div key={gi} className="space-y-1.5">
                {/* Group header */}
                <button
                  onClick={() => groupUnlocked && toggleGroup(group.name)}
                  disabled={!groupUnlocked}
                  className="w-full text-left"
                >
                  <GlassCard
                    hover={groupUnlocked}
                    intensity="light"
                    className={cn(
                      "flex items-center gap-3 p-3.5 sm:p-4 transition-all",
                      !groupUnlocked && "opacity-50",
                      groupDone && "ring-1 ring-success/30",
                    )}
                  >
                    <span className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                      groupDone && "bg-success/10",
                      groupUnlocked && !groupDone && "bg-primary/10",
                      !groupUnlocked && "bg-muted",
                    )}>
                      {groupDone ? (
                        <CheckCircle2 className="size-5 text-success" />
                      ) : !groupUnlocked ? (
                        <Lock className="size-4 text-muted-foreground" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{gi + 1}</span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "truncate text-sm font-semibold",
                          !groupUnlocked && "text-muted-foreground",
                        )}>
                          {group.name ? `Lesson ${gi + 1}: ${group.name}` : `Lesson ${gi + 1}`}
                        </h3>
                        {groupDone && (
                          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {!groupUnlocked
                          ? "Complete the previous lesson first"
                          : `${group.puzzles.length} sub-lesson${group.puzzles.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {groupUnlocked && (
                      <ChevronDown className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180",
                      )} />
                    )}
                  </GlassCard>
                </button>

                {/* Sub-lessons */}
                {isExpanded && (
                  <div className="ml-5 space-y-1 border-l-2 border-muted pl-4">
                    {group.puzzles.map((puzzle, si) => {
                      const state = getSubLessonState(puzzle, si, gi);
                      const isFirstUnlocked = state === "available";
                      return (
                        <motion.div
                          key={puzzle.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: si * 0.04 }}
                        >
                          <button
                            onClick={() => state !== "locked" && onStartPuzzle(puzzle, {
                              currentOrder: puzzle.lessonOrder ?? 0,
                              totalInGroup: group.puzzles.length,
                              completedInGroup: group.puzzles.filter(p => isPuzzleCompleted(p)).length,
                              groupName: group.name || `Group ${gi + 1}`,
                              groupNumber: gi + 1,
                            })}
                            disabled={state === "locked"}
                            className="w-full text-left"
                          >
                            <GlassCard
                              hover={state !== "locked"}
                              intensity="light"
                              className={cn(
                                "flex items-center gap-3 p-3 transition-all sm:p-3.5",
                                state === "locked" && "opacity-50",
                                state === "completed" && "ring-1 ring-success/30",
                                isFirstUnlocked && "ring-2 ring-primary/30",
                              )}
                            >
                              <span className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm",
                                state === "completed" && "bg-success/10",
                                state === "available" && "bg-primary/10",
                                state === "locked" && "bg-muted",
                              )}>
                                {state === "completed" ? (
                                  <CheckCircle2 className="size-4 text-success" />
                                ) : state === "locked" ? (
                                  <Lock className="size-3.5 text-muted-foreground" />
                                ) : (
                                  <span className="text-xs font-bold text-primary">{puzzle.lessonOrder}</span>
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className={cn(
                                    "truncate text-sm font-medium",
                                    state === "locked" && "text-muted-foreground",
                                  )}>
                                    {state === "locked" ? "Locked" : `${gi + 1}.${puzzle.lessonOrder} ${puzzle.title}`}
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
                                    ? "Complete the previous sub-lesson first"
                                    : `${puzzle.difficulty} · ${puzzle.xpReward} XP`}
                                </p>
                              </div>

                              {state !== "locked" && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />}
                            </GlassCard>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
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
                const done = isPuzzleCompleted(puzzle);
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
