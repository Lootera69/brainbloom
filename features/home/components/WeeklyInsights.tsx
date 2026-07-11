"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Zap, Flame, Brain, Clock, Award, X, Sparkles, TrendingUp, Share2 } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { cn } from "@/lib/utils";
import { toBlob } from "dom-to-image-more";

interface Stat {
  icon: typeof Zap;
  label: string;
  value: string | number;
  color: string;
  bgClass: string;
}

export function WeeklyInsights({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const streak = useUserStore((s) => s.streak);
  const history = useUserStore((s) => s.history);
  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);
  const weeklyXp = useUserStore((s) => s.weeklyXp);
  const userXp = useUserStore((s) => s.xp);

  const oneWeekAgo = Date.now() - 7 * 86400000;

  const weeklyStats = useMemo(() => {
    const weekly = history.filter((a) => a.timestamp >= oneWeekAgo);
    const puzzlesSolved = completedPuzzleIds.length;
    const weeklyPuzzles = weekly.length;
    const totalXpWeek = weeklyXp;

    const categoryStats: Record<string, { count: number; totalXp: number }> = {};
    for (const a of weekly) {
      if (!categoryStats[a.category]) categoryStats[a.category] = { count: 0, totalXp: 0 };
      categoryStats[a.category].count++;
      categoryStats[a.category].totalXp += a.xp;
    }

    let weakest = "N/A";
    let weakestCount = Infinity;
    for (const [cat, stats] of Object.entries(categoryStats)) {
      if (stats.count < weakestCount) {
        weakestCount = stats.count;
        weakest = cat.charAt(0).toUpperCase() + cat.slice(1);
      }
    }

    const accuracy = weekly.length > 0
      ? Math.round((weekly.filter((a) => a.xp > 0).length / weekly.length) * 100)
      : 0;

    return { weeklyPuzzles, totalXpWeek, accuracy, weakest, puzzlesSolved, categoryCount: Object.keys(categoryStats).length };
  }, [history, completedPuzzleIds, oneWeekAgo, weeklyXp]);

  const stats: Stat[] = [
    {
      icon: Zap,
      label: "XP Earned",
      value: `+${weeklyStats.totalXpWeek}`,
      color: "text-primary",
      bgClass: "from-primary/20 to-purple-500/10",
    },
    {
      icon: Brain,
      label: "Puzzles Done",
      value: weeklyStats.weeklyPuzzles,
      color: "text-emerald-500",
      bgClass: "from-emerald-500/20 to-teal-500/10",
    },
    {
      icon: Flame,
      label: "Best Streak",
      value: streak,
      color: "text-orange-500",
      bgClass: "from-orange-500/20 to-amber-500/10",
    },
    {
      icon: TrendingUp,
      label: "Accuracy",
      value: `${weeklyStats.accuracy}%`,
      color: "text-cyan-500",
      bgClass: "from-cyan-500/20 to-blue-500/10",
    },
    {
      icon: Award,
      label: "Weakest Category",
      value: weeklyStats.weakest,
      color: "text-rose-500",
      bgClass: "from-rose-500/20 to-pink-500/10",
    },
    {
      icon: Clock,
      label: "Categories Explored",
      value: weeklyStats.categoryCount,
      color: "text-violet-500",
      bgClass: "from-violet-500/20 to-purple-500/10",
    },
  ];

  const handleShare = async () => {
    const el = reportRef.current;
    if (!el) return;

    try {
      const blob = await toBlob(el, {
        scale: window.devicePixelRatio || 2,
      });
      if (!blob) throw new Error("toBlob returned null");

      const file = new File([blob], "brainbloom-weekly.png", { type: "image/png" });

      try {
        await navigator.share({
          title: "My BrainBloom Week",
          text: "Check out my weekly BrainBloom report!",
          files: [file],
        });
        return;
      } catch (e) {
        if (e instanceof Error) {
          if (e.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "brainbloom-weekly.png";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      const text = `🧠 BrainBloom Weekly Report\n\n📊 XP Earned: ${weeklyStats.totalXpWeek}\n🧩 Puzzles: ${weeklyStats.weeklyPuzzles}\n🔥 Streak: ${streak} days\n🎯 Accuracy: ${weeklyStats.accuracy}%\n\nTrain your mind with BrainBloom!`;
      if (navigator.share) {
        try { await navigator.share({ title: "My BrainBloom Week", text }); } catch {}
      } else {
        try { await navigator.clipboard.writeText(text); } catch {}
      }
    }
  };

  return (
    <>
      {compact ? (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => setOpen(true)}
          className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] text-left text-white transition-all hover:shadow-xl hover:shadow-primary/20"
        >
          {/* Decorative blobs */}
          <motion.div
            animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 size-28 rounded-full bg-white/10 blur-2xl"
          />
          <motion.div
            animate={{ y: [0, 6, 0], x: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-8 -left-8 size-24 rounded-full bg-white/5 blur-xl"
          />

          {/* Shimmer overlay on hover */}
          <span className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.06)_50%,transparent_75%)] bg-[length:250%_250%] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

          <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="glass-tint flex size-10 items-center justify-center rounded-xl">
                <BarChart3 className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">This Week</p>
                <p className="font-heading text-lg font-bold">Insights</p>
              </div>
            </div>

            {/* Hero stat — XP */}
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold tabular-nums leading-none">
                {weeklyStats.totalXpWeek}
              </span>
              <span className="text-sm font-semibold text-white/50">XP</span>
            </div>
            <p className="mt-0.5 text-xs text-white/50">earned this week</p>

            {/* Mini stat row */}
            <div className="mt-3.5 grid grid-cols-3 gap-1.5">
              {[
                { icon: Brain, label: "Puzzles", value: weeklyStats.weeklyPuzzles, always: true },
                { icon: Flame, label: "Streak", value: `${streak}d`, always: true },
                { icon: TrendingUp, label: "Accuracy", value: `${weeklyStats.accuracy}%`, always: true },
                { icon: Clock, label: "Categories", value: weeklyStats.categoryCount, always: false },
                { icon: Award, label: "Weakest", value: weeklyStats.weakest, always: false },
                { icon: Zap, label: "Total XP", value: userXp.toLocaleString(), always: false },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className={`glass-tint flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 ${
                    !s.always ? "hidden md:flex" : ""
                  }`}
                >
                  <s.icon className="size-3.5 text-white/70" />
                  <span className="text-sm font-bold tabular-nums leading-none">{s.value}</span>
                  <span className="text-[9px] text-white/40">{s.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="relative z-10 border-t border-white/10 px-4 py-2.5">
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 transition-colors">View Full Report</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
                className="text-white/40 group-hover:text-white/70 transition-colors"
              >
                &rarr;
              </motion.span>
            </span>
          </div>
        </motion.button>
      ) : (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => setOpen(true)}
          className="group mb-6 flex w-full items-center gap-3 rounded-2xl border border-muted/50 bg-card/60 px-5 py-4 text-left transition-all hover:bg-muted/30 sm:mb-8"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/10">
            <BarChart3 className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Weekly Insights</p>
            <p className="text-xs text-muted-foreground">
              {weeklyStats.weeklyPuzzles} puzzles &middot; +{weeklyStats.totalXpWeek} XP this week
            </p>
          </div>
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: 3 }}
            className="shrink-0 text-muted-foreground/40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.span>
        </motion.button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>

              <div ref={reportRef} className="bg-white dark:bg-gray-950">
              <div className="relative bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent px-6 pb-4 pt-8 sm:px-8">
                <div className="absolute -top-10 -right-10">
                  <Sparkles className="size-28 text-primary/10" />
                </div>

                <div className="relative flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10">
                    <BarChart3 className="size-6 text-primary" />
                  </span>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">Weekly Insights</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your learning summary this week</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-6 py-5 sm:grid-cols-3 sm:px-8">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center gap-2 rounded-xl p-4 text-center ring-1 ring-inset ring-gray-200 dark:ring-gray-700"
                  >
                    <span className={cn(
                      "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br",
                      stat.bgClass,
                    )}>
                      <stat.icon className={cn("size-5", stat.color)} />
                    </span>
                    <div>
                      <p className={cn("text-lg font-bold tabular-nums", stat.color)}>{stat.value}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 border-t px-6 py-4 sm:px-8">
                <motion.button
                  onClick={handleShare}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  <Share2 className="size-4" />
                  Share Report
                </motion.button>
                <button onClick={() => setOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
