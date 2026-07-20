"use client";

import { motion } from "framer-motion";
import { Brain, Flame, Sparkles, Leaf, Target, Coffee } from "lucide-react";
import { playClick } from "@/services/sound-service";

export interface Goal {
  id: string;
  icon: typeof Brain;
  label: string;
  gradient: string;
  iconColor: string;
}

export const GOALS: Goal[] = [
  { id: "sharper", icon: Brain, label: "Think sharper", gradient: "from-primary/20 to-[#8b5cf6]/10", iconColor: "text-primary" },
  { id: "habit", icon: Flame, label: "Build a daily habit", gradient: "from-[#f59e0b]/20 to-[#ef4444]/10", iconColor: "text-[#f59e0b]" },
  { id: "fun", icon: Sparkles, label: "Have fun", gradient: "from-secondary/20 to-[#06b6d4]/10", iconColor: "text-secondary" },
  { id: "calm", icon: Leaf, label: "Unwind & focus", gradient: "from-[#22c55e]/20 to-[#06b6d4]/10", iconColor: "text-[#22c55e]" },
  { id: "challenge", icon: Target, label: "Chase a challenge", gradient: "from-[#8b5cf6]/20 to-primary/10", iconColor: "text-[#8b5cf6]" },
  { id: "break", icon: Coffee, label: "A smart break", gradient: "from-[#ec4899]/20 to-[#f59e0b]/10", iconColor: "text-[#ec4899]" },
];

interface WhyStepProps {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
}

export default function WhyStep({ selected, onToggle, onNext }: WhyStepProps) {
  const handleToggle = (id: string) => {
    try { playClick(); } catch { /* no-op */ }
    onToggle(id);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-7 text-center"
      >
        <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
          What brings you here?
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground/60">
          Pick what matters — we&apos;ll shape the journey around it.
        </p>
      </motion.div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2.5">
        {GOALS.map((goal, i) => {
          const isSelected = selected.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 + i * 0.06 }}
              onClick={() => handleToggle(goal.id)}
              whileTap={{ scale: 0.96 }}
              className={`relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border p-3.5 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/15"
                  : `border-border/30 bg-gradient-to-br ${goal.gradient} backdrop-blur-xl hover:border-border/50 dark:border-white/5 dark:hover:border-white/10`
              }`}
            >
              <span
                className={`flex size-9 items-center justify-center rounded-xl bg-muted/40 dark:bg-white/10 ${goal.iconColor}`}
              >
                <goal.icon className="size-[18px]" />
              </span>
              <span className="text-sm font-semibold text-foreground">{goal.label}</span>
              {isSelected && (
                <motion.span
                  layoutId={`check-${goal.id}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        onClick={onNext}
        className="mt-8 flex h-12 w-52 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl active:scale-[0.98]"
      >
        {selected.length > 0 ? `Continue with ${selected.length}` : "Skip for now"}
      </motion.button>
    </div>
  );
}
