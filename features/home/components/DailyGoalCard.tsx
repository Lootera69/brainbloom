"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { CountUp } from "@/features/home/components/CountUp";

export function DailyGoalCard() {
  const xpToday = useUserStore((s) => s.xpToday);
  const dailyGoal = useUserStore((s) => s.dailyGoal);

  const progress = Math.min(xpToday / dailyGoal, 1);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <GlassCard intensity="light" className="mb-6 p-5 sm:mb-8 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Daily Goal</p>
          <p className="font-heading text-2xl font-bold">
            <CountUp to={xpToday} duration={800} />
            <span className="text-base font-normal text-muted-foreground">
              /{dailyGoal} XP
            </span>
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <svg width="80" height="80" className="-rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="6"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="url(#daily-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="daily-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <Target className="absolute size-6 text-primary" />
        </div>
      </div>

      {progress >= 1 && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 text-center text-sm font-semibold text-success"
        >
          Daily goal reached! 🎯
        </motion.p>
      )}
    </GlassCard>
  );
}
