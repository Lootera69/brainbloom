"use client";

import { motion } from "framer-motion";
import { Flame, Heart, Zap, Gift } from "lucide-react";

const items = [
  {
    icon: Flame,
    title: "Streaks",
    description: "Complete daily puzzles to keep your streak alive. Don't break the chain.",
    gradient: "from-[#f59e0b]/20 to-[#ef4444]/10",
    iconColor: "text-[#f59e0b]",
  },
  {
    icon: Heart,
    title: "Hearts",
    description: "You have 5 hearts. Wrong answers cost one. They refill every 5 hours.",
    gradient: "from-destructive/20 to-destructive/10",
    iconColor: "text-destructive",
  },
  {
    icon: Zap,
    title: "XP & Levels",
    description: "Every puzzle earns XP. Level up to track your growing mind.",
    gradient: "from-primary/20 to-[#8b5cf6]/10",
    iconColor: "text-primary",
  },
  {
    icon: Gift,
    title: "Daily Rewards",
    description: "Come back every day for bonus gifts, streak freezes, and surprises.",
    gradient: "from-secondary/20 to-[#06b6d4]/10",
    iconColor: "text-secondary",
  },
];

interface TourStepProps {
  onNext: () => void;
}

export default function TourStep({ onNext }: TourStepProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <p className="text-sm text-muted-foreground/50">STEP 4 OF 5</p>
        <h2 className="mt-2 font-heading text-xl font-bold text-foreground md:text-2xl">
          How it works
        </h2>
      </motion.div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
            className={`flex items-center gap-3 md:gap-4 rounded-xl border border-border/30 bg-gradient-to-br ${item.gradient} p-4 backdrop-blur-xl dark:border-white/5`}
          >
            <span className={`flex size-9 md:size-10 shrink-0 items-center justify-center rounded-xl bg-muted/30 dark:bg-white/5 ${item.iconColor}`}>
              <item.icon className="size-4 md:size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="mb-0.5 font-heading text-sm font-bold text-foreground md:text-base">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground/70 md:text-sm">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        onClick={onNext}
        className="mt-8 flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl active:scale-[0.98]"
      >
        Next
      </motion.button>
    </div>
  );
}
