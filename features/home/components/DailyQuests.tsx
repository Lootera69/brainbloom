"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame, Heart, Gem, CheckCircle2, Sparkles } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "./SectionHeader";

const iconMap: Record<string, typeof Zap> = {
  zap: Zap,
  flame: Flame,
  heart: Heart,
};

const GLOW_PARTICLES = Array.from({ length: 8 }).map((_, i) => ({
  x: (i % 4) * 25 + (i * 7) % 20,
  delay: i * 0.3,
  size: 2 + (i % 2),
  duration: 2.5 + (i % 2),
}));

function ShimmerBar({ done }: { done: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      animate={{
        x: done ? ["-100%", "200%"] : ["-100%", "200%"],
      }}
      transition={{
        duration: done ? 1.5 : 2.5,
        repeat: done ? 0 : Infinity,
        ease: "linear",
        repeatDelay: done ? 0 : 3,
      }}
      style={{
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
      }}
    />
  );
}

export function DailyQuests() {
  const dailyQuests = useUserStore((s) => s.dailyQuests);

  if (!dailyQuests.length) return null;

  const allDone = dailyQuests.every((q) => q.progress >= q.target);

  return (
    <section className="mb-8 sm:mb-10">
      <SectionHeader title="Daily Quests" subtitle="Complete tasks for bonus gems" />

      <div className="grid gap-3 sm:gap-4">
        {dailyQuests.map((quest, i) => {
          const Icon = iconMap[quest.icon] || Zap;
          const done = quest.progress >= quest.target;
          const pct = Math.min(quest.progress / quest.target, 1);

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={!done ? { y: -2, transition: { type: "spring", stiffness: 200 } } : {}}
              className="relative"
            >
              {/* Pulsing glow */}
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                animate={{
                  boxShadow: done
                    ? [
                        "inset 0 0 40px rgba(34,197,94,0.0)",
                        "inset 0 0 40px rgba(34,197,94,0.10)",
                        "inset 0 0 40px rgba(34,197,94,0.0)",
                      ]
                    : pct > 0
                      ? [
                          "inset 0 0 40px rgba(99,102,241,0.0)",
                          `inset 0 0 40px rgba(99,102,241,${0.04 * pct})`,
                          "inset 0 0 40px rgba(99,102,241,0.0)",
                        ]
                      : "inset 0 0 40px rgba(99,102,241,0.0)",
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              <GlassCard
                intensity="light"
                className={`relative flex items-center gap-4 p-4 transition-shadow duration-300 sm:p-5 ${
                  done ? "ring-1 ring-success/30" : ""
                }`}
              >
                {/* Icon */}
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 14 }}
                      >
                        <CheckCircle2 className="size-5" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Icon className="size-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${done ? "text-success" : ""}`}>
                      {quest.title}
                    </p>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-br from-amber-400/15 to-amber-500/5 border border-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Gem className="size-3" />
                      {quest.reward}
                    </span>
                  </div>

                  {/* Custom progress bar */}
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={`h-full rounded-full ${
                        done
                          ? "bg-gradient-to-r from-success to-emerald-500"
                          : "bg-gradient-to-r from-primary to-[#8b5cf6]"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                    <ShimmerBar done={done} />
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {quest.progress}/{quest.target}
                    </p>
                    {done && (
                      <span className="text-[10px] font-semibold text-success">
                        Complete
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="relative mt-5 flex items-center justify-center overflow-hidden rounded-2xl bg-success/5 py-4"
        >
          {/* Floating particles */}
          {GLOW_PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-success/30"
              style={{ width: p.size, height: p.size, left: `${p.x}%`, bottom: 0 }}
              animate={{
                y: [0, -80 - (i % 3) * 20],
                opacity: [0, 0.6, 0],
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

          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-success/15">
              <Sparkles className="size-4 text-success" />
            </span>
            <span className="bg-gradient-to-r from-success to-emerald-500 bg-clip-text text-sm font-bold text-transparent">
              All quests completed!
            </span>
          </div>
        </motion.div>
      )}
    </section>
  );
}
