"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";


const PARTICLES = Array.from({ length: 12 }).map((_, i) => ({
  x: (i % 4) * 30 + (i * 7) % 20,
  delay: i * 0.4,
  size: 2 + (i % 3),
  duration: 3 + (i % 3),
}));

export function DailyGoalCard() {
  const gradientId = useId();
  const xpToday = useUserStore((s) => s.xpToday);
  const dailyGoal = useUserStore((s) => s.dailyGoal);

  const progress = Math.min(xpToday / dailyGoal, 1);
  const pct = Math.round(progress * 100);
  const remaining = Math.max(0, dailyGoal - xpToday);
  const complete = progress >= 1;

  return (
    <GlassCard intensity="light" className="relative flex h-full flex-col items-center justify-center overflow-hidden p-5 sm:p-6">

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${complete ? "bg-success/40" : "bg-primary/30"}`}
          style={{ width: p.size, height: p.size, left: `${p.x}%`, bottom: 0 }}
          animate={{
            y: [0, -140 - (i % 3) * 30],
            opacity: [0, 0.7, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Subtle radial glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        animate={{
          boxShadow: complete
            ? [
                "inset 0 0 60px rgba(34,197,94,0.0)",
                "inset 0 0 60px rgba(34,197,94,0.12)",
                "inset 0 0 60px rgba(34,197,94,0.0)",
              ]
            : [
                "inset 0 0 60px rgba(99,102,241,0.0)",
                "inset 0 0 60px rgba(99,102,241,0.08)",
                "inset 0 0 60px rgba(99,102,241,0.0)",
              ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          Daily Goal
        </p>

        <div className="relative mt-3">
          {/* Ring */}
          <svg width="96" height="96" className="-rotate-90">
            <circle
              cx="48"
              cy="48"
              r="36"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="5"
              opacity="0.4"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="36"
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 36}
              initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - progress) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={complete ? "#22c55e" : "var(--primary)"} />
                <stop offset="100%" stopColor={complete ? "#16a34a" : "#8b5cf6"} />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Target className={`mb-0.5 size-4 ${complete ? "text-success" : "text-primary"}`} />
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="font-heading text-xl font-bold tabular-nums leading-none"
            >
              {pct}%
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`mt-3 rounded-full px-3 py-1 text-[10px] font-semibold ${
            complete
              ? "bg-success/10 text-success"
              : "bg-primary/10 text-primary"
          }`}
        >
          {complete ? "Goal reached" : `${remaining} XP to go`}
        </motion.div>
      </div>
    </GlassCard>
  );
}
