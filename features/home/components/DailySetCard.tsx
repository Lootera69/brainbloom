"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Sparkles, SlidersHorizontal, CheckCircle2, Play, ChevronRight, Check, X,
  Lightbulb, Atom, Grid2x2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { hasPremiumAccess } from "@/services/entitlement-service";
import { DAILY_SET_CATEGORY_LIMIT } from "@/lib/subscription";
import { categories as ALL_CATEGORIES } from "@/constants/home";
import { type Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";

interface Props {
  set: Puzzle[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const PICKER_CATEGORIES = ALL_CATEGORIES.filter((c) => c.id !== "wonders");

// Deterministic sparkle field (light mode only) — mirrors DailyChallengeCard.
const SPARKLES = Array.from({ length: 8 }).map((_, i) => ({
  x: 8 + (i * 13) % 85,
  y: 10 + (i * 17) % 75,
  delay: i * 0.6,
  size: 2 + (i % 3),
  duration: 2.5 + (i % 2),
}));

export function DailySetCard({ set, loading, error, onRetry, categories, onCategoriesChange }: Props) {
  const router = useRouter();
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const dailyPuzzleStreak = useUserStore((s) => s.dailyPuzzleStreak);
  const dailySetDate = useUserStore((s) => s.dailySetDate);
  const dailySetCompletedIds = useUserStore((s) => s.dailySetCompletedIds);
  const setShowShop = useUIStore((s) => s.setShowShop);
  const premium = hasPremiumAccess(tier, subscriptionExpiry);
  const [showPicker, setShowPicker] = useState(false);

  const today = new Date().toDateString();
  const doneIds = dailySetDate === today ? dailySetCompletedIds : [];
  const total = set.length;
  const played = doneIds.length;
  const done = Math.min(played, total);
  const solved = total > 0 && played >= total;

  const grad = solved
    ? "from-emerald-50 via-teal-50 to-emerald-100 dark:from-[#065f46] dark:via-[#047857] dark:to-[#059669]"
    : "from-indigo-50 via-purple-50 to-fuchsia-50 dark:from-[#312e81] dark:via-[#6d28d9] dark:to-[#a21caf]";
  const ink = solved ? "text-emerald-900 dark:text-white" : "text-indigo-900 dark:text-white";
  const pill = solved ? "bg-white/70 dark:bg-white/[0.16]" : "bg-white/65 dark:bg-white/[0.14]";
  const iconBadge = solved ? "bg-white/85 dark:bg-white/[0.18]" : "bg-white/80 dark:bg-white/[0.16]";
  const accent = solved ? "text-emerald-700 dark:text-emerald-200" : "text-indigo-700 dark:text-white";

  const handlePickCategory = () => {
    if (!premium) { setShowShop(true); return; }
    setShowPicker(true);
  };

  const solvedMessage = dailyPuzzleStreak > 1
    ? `Daily set done. ${dailyPuzzleStreak} day streak going strong. Come back tomorrow for a fresh set.`
    : "Daily set done for today. Come back tomorrow for a fresh set.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 16 }}
    >
      <div className={cn("group relative overflow-hidden rounded-3xl p-6 shadow-xl shadow-primary/10 dark:shadow-primary/5 bg-gradient-to-br", grad, ink)}>
        {/* Animated floating orbs */}
        <motion.div
          animate={{ y: [0, -15, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className={cn("absolute -top-14 -right-14 size-48 rounded-full blur-3xl", solved ? "bg-emerald-200/40 dark:bg-emerald-400/[0.06]" : "bg-white/30 dark:bg-white/[0.04]")}
        />
        <motion.div
          animate={{ y: [0, 12, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className={cn("absolute -bottom-12 -left-12 size-40 rounded-full blur-2xl", solved ? "bg-teal-200/30 dark:bg-teal-400/[0.04]" : "bg-white/20 dark:bg-white/[0.03]")}
        />

        {/* Sparkle particles — light mode only */}
        <div className="pointer-events-none absolute inset-0 dark:hidden">
          {SPARKLES.map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%` }}
              animate={{ opacity: [0, 0.9, 0], scale: [0, 1.4, 0] }}
              transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
            />
          ))}
        </div>
        {/* CONTENT_PLACEHOLDER */}
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
              className={cn("inline-flex size-9 items-center justify-center rounded-xl shadow-lg shadow-black/10", iconBadge)}
            >
              <Brain className={cn("size-[18px]", accent)} />
            </motion.span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide", pill, accent)}>
              <Sparkles className="size-3" />
              DAILY SET
            </span>
            <span className="ml-auto text-sm font-extrabold tabular-nums">{!loading && !error && total > 0 ? `${done}/${total}` : null}</span>
            <button
              onClick={handlePickCategory}
              aria-label="Choose your set"
              className={cn("flex size-8 items-center justify-center rounded-full transition-transform active:scale-90", pill)}
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-2 w-full max-w-[110px] animate-pulse rounded-full bg-current opacity-20" />
              <div className="h-14 animate-pulse rounded-2xl bg-current opacity-10" />
              <div className="h-14 animate-pulse rounded-2xl bg-current opacity-10" />
              <div className="h-14 animate-pulse rounded-2xl bg-current opacity-10" />
            </div>
          ) : error ? (
            <div role="alert" className="mt-5">
              <h2 className="font-heading text-lg font-bold">Couldn&apos;t load your Daily Set</h2>
              <p className="mt-1 text-sm opacity-80">{error}</p>
              <button type="button" onClick={onRetry} className={cn("mt-3 rounded-xl px-4 py-2 text-sm font-bold", pill)}>Retry Daily Set</button>
            </div>
          ) : total === 0 ? (
            <div className="mt-5">
              <h2 className="font-heading text-lg font-bold">No daily set yet</h2>
              <p className="mt-1 text-sm opacity-80">A fresh set of puzzles will appear here soon.</p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2">
                {Array.from({ length: total }).map((_, i) => (
                  <span
                    key={i}
                    className={cn("h-2 w-[26px] rounded-full bg-current transition-opacity duration-500", i < done ? "opacity-100" : "opacity-30")}
                  />
                ))}
              </div>
              {/* CONTENT_TILES_PLACEHOLDER */}
              {!solved ? (
                <div className="mt-4">
                  <p className="text-sm font-extrabold">{done === 0 ? "Pick any puzzle to start" : "Pick your next puzzle"}</p>
                  <div className="mt-3 space-y-2.5">
                    {set.map((p, i) => {
                      const isDone = doneIds.includes(p.id);
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          disabled={isDone}
                          onClick={() => router.push(`/learn?daily=true&puzzle=${p.id}`)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isDone ? 0.6 : 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.08 }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl border border-white/40 px-3 py-3 text-left dark:border-white/10",
                            pill,
                            !isDone && "active:scale-[0.98]",
                          )}
                        >
                          <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-full", isDone ? "bg-white/25 dark:bg-white/[0.22]" : iconBadge)}>
                            {isDone ? <Check className="size-[18px]" /> : <Play className={cn("size-[18px]", accent)} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-extrabold", isDone && "line-through")}>{p.title}</span>
                            <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-70">
                              {isDone ? "Done" : `${p.category}  ·  2× XP ${p.xpReward * 2}`}
                            </span>
                          </span>
                          {!isDone && <ChevronRight className="size-5 shrink-0 opacity-70" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 flex items-center gap-2.5"
                >
                  <CheckCircle2 className="size-6 shrink-0" />
                  <p className="text-sm opacity-90">{solvedMessage}</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
      {/* PICKER_PLACEHOLDER */}
      <AnimatePresence>
        {showPicker && (
          <DailySetCategoryModal
            initial={categories}
            onClose={() => setShowPicker(false)}
            onConfirm={(picked) => {
              onCategoriesChange(picked);
              setShowPicker(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const CAT_ICONS: Record<string, typeof Brain> = {
  brain: Brain,
  lightbulb: Lightbulb,
  atom: Atom,
  grid: Grid2x2,
  sparkles: Sparkles,
};

// Premium multi-select sheet for the Daily Set filter. An empty selection is
// the shared "Daily mix"; one to DAILY_SET_CATEGORY_LIMIT category ids mix the
// set from only those categories. Wonders are omitted (non-scoring).
function DailySetCategoryModal({
  initial,
  onClose,
  onConfirm,
}: {
  initial: string[];
  onClose: () => void;
  onConfirm: (categories: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const dailyMix = selected.length === 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= DAILY_SET_CATEGORY_LIMIT) return prev;
      return [...prev, id];
    });
  };

  const cta = dailyMix
    ? "Play the Daily mix"
    : selected.length === 1
      ? "Play this category"
      : `Mix ${selected.length} categories`;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-border/50 bg-card p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-heading text-xl font-bold">Choose your set</h3>
          <span className={cn("ml-auto rounded-full px-3 py-1 text-xs font-extrabold", selected.length === 0 ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary")}>
            {selected.length} / {DAILY_SET_CATEGORY_LIMIT}
          </span>
          <button onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Mix up to {DAILY_SET_CATEGORY_LIMIT} categories, or keep the Daily mix everyone plays.
        </p>

        <button
          onClick={() => setSelected([])}
          className={cn(
            "mt-4 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-[#6d28d9] to-[#a21caf] p-4 text-left text-white transition-transform active:scale-[0.98]",
            dailyMix ? "ring-2 ring-white shadow-lg shadow-purple-600/30" : "ring-1 ring-white/15",
          )}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Daily mix</span>
            <span className="block text-xs text-white/80">The shared set everyone plays today</span>
          </span>
          {dailyMix && (
            <span className="flex size-6 items-center justify-center rounded-full bg-white text-[#6d28d9]">
              <Check className="size-4" />
            </span>
          )}
        </button>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {PICKER_CATEGORIES.map((cat) => {
            const Icon = CAT_ICONS[cat.icon] ?? Brain;
            const isSel = selected.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id)}
                className={cn(
                  "flex flex-col rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
                  dailyMix && !isSel && "opacity-50",
                )}
                style={{
                  backgroundColor: isSel ? `${cat.color}1f` : "transparent",
                  borderColor: isSel ? cat.color : "color-mix(in srgb, var(--border) 80%, transparent)",
                  borderWidth: isSel ? 2 : 1,
                }}
              >
                <div className="flex items-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br text-white" style={{ backgroundImage: `linear-gradient(135deg, ${cat.color}, ${cat.color}b0)` }}>
                    <Icon className="size-5" />
                  </span>
                  {isSel && (
                    <span className="ml-auto flex size-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: cat.color }}>
                      <Check className="size-4" />
                    </span>
                  )}
                </div>
                <span className="mt-3 font-extrabold">{cat.title}</span>
                <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{cat.description}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onConfirm(selected)}
          className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {cta}
        </button>
      </motion.div>
    </motion.div>
  );
}


