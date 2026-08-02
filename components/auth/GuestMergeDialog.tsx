"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Flame, Zap, Gem, Puzzle, Brain, Check } from "lucide-react";
import type { guestMergeSummary } from "@/lib/user-merge";

interface GuestMergeDialogProps {
  summary: ReturnType<typeof guestMergeSummary>;
  onMerge: () => void;
  onSkip: () => void;
}

export function GuestMergeDialog({ summary, onMerge, onSkip }: GuestMergeDialogProps) {
  const rows = [
    { icon: Flame, label: "Streak", value: `${summary.streak}d`, color: "text-warning bg-warning/10" },
    { icon: Zap, label: "XP", value: summary.xp.toLocaleString(), color: "text-primary bg-primary/10" },
    { icon: Gem, label: "Gems", value: `${summary.gems}`, color: "text-cyan-500 bg-cyan-500/10" },
    { icon: Puzzle, label: "Puzzles", value: `${summary.puzzles}`, color: "text-emerald-500 bg-emerald-500/10" },
    { icon: Trophy, label: "Achievements", value: `${summary.achievements}`, color: "text-amber-500 bg-amber-500/10" },
    { icon: Brain, label: "Wonders", value: `${summary.wonders}`, color: "text-violet-500 bg-violet-500/10" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onSkip} />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-sm rounded-3xl border border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/25">
            <Sparkles className="size-7 text-white" />
          </div>
          <h2 className="text-center text-lg font-bold">Save your guest progress?</h2>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            We found progress from your guest session. Merge it into your new account so nothing is lost.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {rows.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 px-2 py-2.5">
                <span className={`flex size-6 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sm font-bold leading-none">{value}</span>
                <span className="text-[9px] font-medium text-muted-foreground/70">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              onClick={onMerge}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Check className="size-4" />
              Merge & Continue
            </button>
            <button
              onClick={onSkip}
              className="flex h-11 w-full items-center justify-center rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              Start fresh — skip
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
