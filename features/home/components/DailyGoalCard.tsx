"use client";

import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/features/home/components/CountUp";

export function DailyGoalCard() {
  const xpToday = useUserStore((s) => s.xpToday);
  const dailyGoal = useUserStore((s) => s.dailyGoal);

  const progress = Math.min(xpToday / dailyGoal, 1);
  const pct = Math.round(progress * 100);
  const remaining = Math.max(0, dailyGoal - xpToday);

  return (
    <GlassCard intensity="light" className="flex h-full flex-col items-center justify-center p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
        Today
      </p>

      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="mt-2 font-heading text-5xl font-bold tabular-nums leading-none tracking-tight"
      >
        <CountUp to={xpToday} duration={600} />
      </motion.p>

      <p className="mt-1 text-xs text-muted-foreground/60">
        of {dailyGoal} XP
      </p>

      <div className="relative mt-5 h-0.5 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]"
        />
      </div>

      <p className="mt-2 text-[11px] font-medium text-muted-foreground/40">
        {progress >= 1 ? "Goal reached" : `${remaining} XP to go`}
      </p>
    </GlassCard>
  );
}
