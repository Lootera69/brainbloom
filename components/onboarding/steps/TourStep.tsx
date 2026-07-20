"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Heart, Zap, Gift } from "lucide-react";
import { useState } from "react";
import { playStreak, playXp, playUnlock, playGem } from "@/services/sound-service";

interface TourItem {
  id: string;
  icon: typeof Flame;
  title: string;
  teaser: string;
  detail: string;
  gradient: string;
  iconColor: string;
  sound: () => void;
}

const items: TourItem[] = [
  {
    id: "streak",
    icon: Flame,
    title: "Streaks",
    teaser: "Keep the fire alive",
    detail: "Solve one puzzle a day to grow your streak. Miss a day and it resets — so don't break the chain.",
    gradient: "from-[#f59e0b]/20 to-[#ef4444]/10",
    iconColor: "text-[#f59e0b]",
    sound: playStreak,
  },
  {
    id: "hearts",
    icon: Heart,
    title: "Hearts",
    teaser: "Five tries to spare",
    detail: "You start with 5 hearts. A wrong answer costs one, and they refill every 5 hours. Think before you tap.",
    gradient: "from-destructive/20 to-destructive/10",
    iconColor: "text-destructive",
    sound: playUnlock,
  },
  {
    id: "xp",
    icon: Zap,
    title: "XP & Levels",
    teaser: "Watch your mind level up",
    detail: "Every solved puzzle earns XP. Stack it up to level up and unlock harder, more rewarding challenges.",
    gradient: "from-primary/20 to-[#8b5cf6]/10",
    iconColor: "text-primary",
    sound: playXp,
  },
  {
    id: "rewards",
    icon: Gift,
    title: "Daily Rewards",
    teaser: "Surprises every visit",
    detail: "Come back daily for bonus gems, streak freezes, and mystery gifts. Consistency pays off — literally.",
    gradient: "from-secondary/20 to-[#06b6d4]/10",
    iconColor: "text-secondary",
    sound: playGem,
  },
];

interface TourStepProps {
  onNext: () => void;
}

export default function TourStep({ onNext }: TourStepProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  const toggle = (item: TourItem) => {
    const next = open === item.id ? null : item.id;
    setOpen(next);
    if (next) {
      try { item.sound(); } catch { /* no-op */ }
      setSeen((s) => new Set(s).add(item.id));
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center"
      >
        <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
          How it works
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground/60">
          Tap each one to see what makes it tick.
        </p>
      </motion.div>

      <div className="flex w-full max-w-sm flex-col gap-2.5">
        {items.map((item, i) => {
          const isOpen = open === item.id;
          const isSeen = seen.has(item.id);
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              onClick={() => toggle(item)}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-br text-left transition-all ${item.gradient} ${
                isOpen
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border/30 dark:border-white/5"
              }`}
            >
              <div className="flex items-center gap-3.5 p-4">
                <motion.span
                  animate={isOpen ? { rotate: [0, -12, 12, 0], scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/40 dark:bg-white/10 ${item.iconColor}`}
                >
                  <item.icon className="size-5" />
                </motion.span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground/60">{item.teaser}</p>
                </div>
                {isSeen && !isOpen && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] text-primary"
                  >
                    ✓
                  </motion.span>
                )}
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground/80">
                      {item.detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        onClick={onNext}
        whileTap={{ scale: 0.98 }}
        className="mt-7 flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl"
      >
        {seen.size === items.length ? "I'm ready" : "Next"}
      </motion.button>
    </div>
  );
}
