"use client";

import { motion } from "framer-motion";
import { Flame, Zap, Heart, Gem, CheckCircle2 } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { CountUp } from "@/features/home/components/CountUp";
import { GlassCard } from "@/components/ui/glass-card";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function StreakBar() {
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const hearts = useUserStore((s) => s.hearts);
  const gems = useUserStore((s) => s.gems);
  const lastActiveDate = useUserStore((s) => s.lastActiveDate);
  const maxHearts = 5;

  const keptToday = useMemo(() => lastActiveDate === new Date().toDateString(), [lastActiveDate]);

  const stats = [
    {
      icon: Flame,
      label: "Day Streak",
      value: streak,
      numClass: "text-orange-500",
      gradient: "from-orange-500/20 to-amber-500/10",
      iconBg: "bg-gradient-to-br from-orange-500/25 to-amber-500/10",
      ring: "ring-orange-500/20",
      bottom: streak > 0 ? (
        <span className={cn(
          "mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
          keptToday
            ? "bg-success/10 text-success"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {keptToday ? (
            <><CheckCircle2 className="size-2.5" /> Kept today</>
          ) : (
            <><Flame className="size-2.5" /> Do a lesson</>
          )}
        </span>
      ) : null,
    },
    {
      icon: Zap,
      label: "Total XP",
      value: xp,
      numClass: "text-primary",
      gradient: "from-primary/20 to-purple-500/10",
      iconBg: "bg-gradient-to-br from-primary/25 to-purple-500/10",
      ring: "ring-primary/20",
      bottom: null,
    },
    {
      icon: Gem,
      label: "Gems",
      value: gems,
      numClass: "text-cyan-500",
      gradient: "from-cyan-500/20 to-emerald-500/10",
      iconBg: "bg-gradient-to-br from-cyan-500/25 to-emerald-500/10",
      ring: "ring-cyan-500/20",
      bottom: null,
    },
    {
      icon: Heart,
      label: "Hearts",
      value: hearts,
      numClass: "text-rose-500",
      gradient: "from-rose-500/20 to-pink-500/10",
      iconBg: "bg-gradient-to-br from-rose-500/25 to-pink-500/10",
      ring: "ring-rose-500/20",
      bottom: (
        <div className="mt-1.5 flex items-center gap-0.5">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <Heart
              key={i}
              className={cn(
                "size-4 transition-all",
                i < hearts ? "fill-rose-500 text-rose-500" : "fill-none text-muted-foreground/25"
              )}
            />
          ))}
        </div>
      ),
    },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 20 }}
    >
      <GlassCard intensity="light" className="mb-6 overflow-hidden sm:mb-8">
        <div className="grid grid-cols-4 divide-x divide-muted/50">
          {stats.map(({ icon: Icon, label, value, numClass, iconBg, bottom }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 140, damping: 18 }}
              className="group relative flex cursor-default flex-col items-center px-1 py-5 transition-colors hover:bg-muted/10 sm:px-2 sm:py-6"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <span className={cn(
                "relative flex size-10 items-center justify-center rounded-xl ring-1 ring-inset shadow-sm transition-transform duration-300 group-hover:scale-110 sm:size-11",
                iconBg,
              )}>
                <Icon className={cn("size-4 sm:size-5", numClass)} />
              </span>

              {/* Count number — commented out for hearts, show only emoji */}
              {label !== "Hearts" && (
                <CountUp
                  to={value}
                  duration={700}
                  className={cn(
                    "mt-2 font-heading text-xl font-bold tabular-nums sm:text-2xl",
                    numClass
                  )}
                />
              )}

              {bottom}
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}