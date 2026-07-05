"use client";

import { motion } from "framer-motion";
import { Zap, Flame, Heart, Gem, CheckCircle2 } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "./SectionHeader";

const iconMap: Record<string, typeof Zap> = {
  zap: Zap,
  flame: Flame,
  heart: Heart,
};

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
            >
              <GlassCard
                intensity="light"
                className={`flex items-center gap-4 p-4 sm:p-5 ${done ? "ring-1 ring-success/30" : ""}`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${done ? "text-success line-through" : ""}`}>
                      {quest.title}
                    </p>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Gem className="size-3.5" />
                      {quest.reward}
                    </span>
                  </div>
                  <Progress value={pct * 100} className="h-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quest.progress}/{quest.target}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {allDone && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-sm font-medium text-success"
        >
          All quests completed! Great job
        </motion.p>
      )}
    </section>
  );
}
