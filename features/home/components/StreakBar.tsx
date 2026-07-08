"use client";

import { motion } from "framer-motion";
import { Flame, Zap, Heart, Gem, CheckCircle2 } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { CountUp } from "@/features/home/components/CountUp";
import { GlassCard } from "@/components/ui/glass-card";
import { useMemo } from "react";

export function StreakBar() {
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const hearts = useUserStore((s) => s.hearts);
  const gems = useUserStore((s) => s.gems);
  const lastActiveDate = useUserStore((s) => s.lastActiveDate);

  const keptToday = useMemo(() => lastActiveDate === new Date().toDateString(), [lastActiveDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 20 }}
    >
      <GlassCard intensity="light" className="mb-6 sm:mb-8">
        <div className="grid grid-cols-4">
          {[
            { icon: Flame, label: "Streak", value: streak, color: "text-warning", glow: "bg-warning/10" },
            { icon: Zap, label: "Total XP", value: xp, color: "text-primary", glow: "bg-primary/10" },
            { icon: Gem, label: "Gems", value: gems, color: "text-cyan-500", glow: "bg-cyan-500/10" },
            { icon: Heart, label: "Hearts", value: hearts, color: "text-destructive", glow: "bg-destructive/10" },
          ].map(({ icon: Icon, label, value, color, glow }) => (
            <div
              key={label}
              className="relative flex flex-col items-center gap-1.5 border-l py-4 first:border-l-0"
            >
              <span className={`flex size-9 items-center justify-center rounded-xl ${glow}`}>
                <Icon className={`size-4 ${color}`} />
              </span>
              <p className="text-xs text-muted-foreground">{label}</p>
              <CountUp
                to={value}
                duration={600}
                className={`font-heading text-xl font-bold ${color}`}
              />
              {label === "Streak" && streak > 0 && (
                <span className={`mt-0.5 flex items-center gap-0.5 text-[10px] font-medium ${
                  keptToday ? "text-success" : "text-amber-500"
                }`}>
                  {keptToday ? (
                    <><CheckCircle2 className="size-2.5" />Kept today</>
                  ) : (
                    <><Flame className="size-2.5" />Do a lesson</>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}
