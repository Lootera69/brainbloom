"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/features/home/components/CountUp";

export function DailyGoalCard() {
  const gradientId = useId();
  const xpToday = useUserStore((s) => s.xpToday);
  const dailyGoal = useUserStore((s) => s.dailyGoal);

  const progress = Math.min(xpToday / dailyGoal, 1);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const remaining = Math.max(0, dailyGoal - xpToday);

  return (
    <GlassCard intensity="light" className="flex h-full flex-col items-center justify-center gap-4 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Goal</p>

      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <Target className="absolute inset-0 m-auto size-7 text-primary" />
      </div>

      <div className="text-center">
        <p className="font-heading text-3xl font-bold tabular-nums">
          <CountUp to={xpToday} duration={800} />
        </p>
        <p className="text-xs text-muted-foreground">
          of {dailyGoal} XP
        </p>
      </div>

      {progress >= 1 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success"
        >
          <TrendingUp className="size-3.5" />
          Goal reached
        </motion.div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining} XP remaining` : ""}
        </p>
      )}
    </GlassCard>
  );
}
