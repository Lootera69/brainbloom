"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Heart, Gem, X, CheckCircle2 } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { CountUp } from "@/features/home/components/CountUp";
import { GlassCard } from "@/components/ui/glass-card";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export function StreakBar() {
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const hearts = useUserStore((s) => s.hearts);
  const gems = useUserStore((s) => s.gems);
  const lastActiveDate = useUserStore((s) => s.lastActiveDate);
  const maxHearts = 5;
  const [showStreak, setShowStreak] = useState(false);

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const lastActiveMs = lastActiveDate ? new Date(lastActiveDate).getTime() : null;
    const streakStartMs = lastActiveMs != null ? lastActiveMs - (streak - 1) * 86400000 : null;
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const days: { filled: boolean; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dateMs = todayMs - i * 86400000;
      const filled = streakStartMs != null && lastActiveMs != null ? dateMs >= streakStartMs && dateMs <= lastActiveMs : false;
      days.push({ filled, label: dayLabels[new Date(dateMs).getDay()], isToday: i === 0 });
    }
    return days;
  }, [streak, lastActiveDate]);

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
      onClick: streak > 0 ? () => setShowStreak(true) : undefined,
      bottom: null,
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
                "size-3 transition-all",
                i < hearts ? "fill-rose-500 text-rose-500" : "fill-none text-muted-foreground/25"
              )}
            />
          ))}
        </div>
      ),
    },
  ];

  const handleClick = (onClick?: () => void) => {
    if (onClick) onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 20 }}
    >
      <GlassCard intensity="light" className="mb-6 overflow-hidden sm:mb-8">
        <div className="grid grid-cols-4 divide-x divide-muted/50">
          {stats.map(({ icon: Icon, label, value, numClass, iconBg, onClick, bottom }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 140, damping: 18 }}
              className={cn(
                "group relative flex flex-col items-center px-1 py-5 transition-colors hover:bg-muted/10 sm:px-2 sm:py-6",
                onClick ? "cursor-pointer" : "cursor-default",
              )}
              onClick={() => handleClick(onClick)}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <span className={cn(
                "relative flex size-10 items-center justify-center rounded-xl ring-1 ring-inset shadow-sm transition-transform duration-300 group-hover:scale-110 sm:size-11",
                iconBg,
              )}>
                <Icon className={cn("size-4 sm:size-5", numClass)} />
              </span>

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

      {/* Streak popup */}
      <AnimatePresence>
        {showStreak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setShowStreak(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-xs rounded-2xl border bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowStreak(false)}
                className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>

              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/10">
                  <Flame className="size-5 fill-orange-500 text-orange-500" />
                </span>
                <div>
                  <p className="text-lg font-bold">{streak} Day Streak</p>
                  <p className="text-xs text-muted-foreground">
                    {keptToday ? "Streak maintained today" : "Complete a lesson to keep it going"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                {streakDays.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">{d.label}</span>
                    <div
                      className={cn(
                        "size-7 rounded-full border-2 transition-colors sm:size-8",
                        d.filled
                          ? "border-orange-500 bg-orange-500"
                          : d.isToday
                            ? keptToday
                              ? "border-orange-500 bg-orange-500"
                              : "border-muted-foreground/40"
                            : "border-muted-foreground/15",
                      )}
                    >
                      {d.filled || (d.isToday && keptToday) ? (
                        <CheckCircle2 className="size-full p-1 text-white" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}