"use client";

import { motion } from "framer-motion";
import { Trophy, Zap, Brain, Flame, Gem, Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { achievementsList } from "@/constants/achievements";

const iconMap: Record<string, typeof Brain> = {
  Brain, Flame, Zap, Compass: Trophy, Sun: Trophy,
  TrendingUp: Trophy, Heart: Trophy, Target: Trophy,
};

export default function AchievementsPage() {
  const achievements = useUserStore((s) => s.achievements);
  const unlockedIds = new Set(achievements.map((a) => a.id));

  const unlocked = achievementsList.filter((a) => unlockedIds.has(a.id));
  const locked = achievementsList.filter((a) => !unlockedIds.has(a.id));

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Trophy className="size-5 text-primary" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            {unlocked.length} / {achievementsList.length} unlocked
          </p>
        </div>
      </motion.div>

      <div className="space-y-3">
        {unlocked.map((achievement, i) => {
          const Icon = iconMap[achievement.icon] ?? Trophy;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard intensity="light" className="flex items-center gap-4 p-4 sm:p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <Icon className="size-6 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-base font-semibold">{achievement.title}</p>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-medium text-primary">+{achievement.xp} XP</p>
                  <p className="flex items-center gap-1">
                    <Gem className="size-3" />+{achievement.gems}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {locked.map((achievement, i) => {
          const Icon = iconMap[achievement.icon] ?? Trophy;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (unlocked.length + i) * 0.04 }}
            >
              <GlassCard
                intensity="light"
                className="flex items-center gap-4 p-4 opacity-50 sm:p-5"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Lock className="size-5 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-base font-semibold">{achievement.title}</p>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="text-muted-foreground">Locked</p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
