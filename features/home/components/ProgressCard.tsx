"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useUserStore } from "@/store/user-store";

export function ProgressCard() {
  const { xp, level } = useUserStore();
  const xpInLevel = xp % 200;
  const xpForNext = 200;
  const progress = xpInLevel / xpForNext;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, type: "spring", stiffness: 150, damping: 20 }}
    >
      <Card className="rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your Level</p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="font-heading text-3xl font-bold"
            >
              {level}
            </motion.p>
          </div>

          <div className="relative flex items-center justify-center">
            <svg width="72" height="72" className="-rotate-90">
              <circle
                cx="36"
                cy="36"
                r={radius}
                fill="none"
                stroke="var(--muted)"
                strokeWidth="5"
              />
              <motion.circle
                cx="36"
                cy="36"
                r={radius}
                fill="none"
                stroke="url(#progress-grad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
              />
              <defs>
                <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <Sparkles className="absolute size-5 text-primary" />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Level {level}</span>
            <span className="font-medium">
              {xpInLevel} / {xpForNext} XP
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]"
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {xpForNext - xpInLevel} XP to next level
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
