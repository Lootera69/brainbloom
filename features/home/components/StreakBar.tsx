"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Heart, Gem, X, CheckCircle2, Snowflake, CalendarDays, Calendar } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { CountUp } from "@/features/home/components/CountUp";
import { GlassCard } from "@/components/ui/glass-card";
import { MonthlyStreakView } from "@/features/home/components/MonthlyStreakView";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { hasPremiumAccess } from "@/services/entitlement-service";

export function StreakBar() {
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const hearts = useUserStore((s) => s.hearts);
  const gems = useUserStore((s) => s.gems);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const lastActiveDate = useUserStore((s) => s.lastActiveDate);
  const frozenDays = useUserStore((s) => s.frozenDays);
  const brokenDays = useUserStore((s) => s.brokenDays);
  const streakStartDate = useUserStore((s) => s.streakStartDate);
  const activeDates = useUserStore((s) => s.activeDates);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);
  const maxHearts = 5;
  const [showStreak, setShowStreak] = useState(false);
  const [streakTab, setStreakTab] = useState<"week" | "month">("week");

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const lastActiveMs = lastActiveDate ? new Date(lastActiveDate).getTime() : null;
    const streakStartMs = streakStartDate ? new Date(streakStartDate).getTime() : null;
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const days: { status: "filled" | "frozen" | "broken" | "empty"; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dateMs = todayMs - i * 86400000;
      const dateStr = new Date(dateMs).toDateString();
      const frozen = frozenDays.includes(dateStr);
      const filled = !frozen && streakStartMs != null && lastActiveMs != null ? dateMs >= streakStartMs && dateMs <= lastActiveMs : false;
      const broken = !filled && !frozen && brokenDays.includes(dateStr);
      days.push({ status: filled ? "filled" : frozen ? "frozen" : broken ? "broken" : "empty", label: dayLabels[new Date(dateMs).getDay()], isToday: i === 0 });
    }
    return days;
  }, [streak, lastActiveDate, frozenDays, brokenDays, streakStartDate]);

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
      bottom: isPremium ? (
        <div className="mt-1.5 flex items-center justify-center">
          <span className="text-lg font-bold text-rose-500">∞</span>
        </div>
      ) : (
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
    if (onClick) { setStreakTab("week"); onClick(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 20 }}
    >
      <div className="mb-6 overflow-hidden rounded-2xl border border-white/60 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.03] shadow-lg shadow-black/[0.04] dark:shadow-black/20 backdrop-blur-xl sm:mb-8">
        <div className="grid grid-cols-4 divide-x divide-black/[0.04] dark:divide-white/[0.05]">
          {stats.map(({ icon: Icon, label, value, numClass, iconBg, ring, onClick, bottom }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 140, damping: 18 }}
              className={cn(
                "group relative flex flex-col items-center px-1 py-5 transition-all duration-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:px-2 sm:py-6",
                onClick ? "cursor-pointer" : "cursor-default",
              )}
              onClick={() => handleClick(onClick)}
            >
              <span className={cn(
                "relative flex size-11 items-center justify-center rounded-xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg sm:size-12",
                iconBg,
              )}>
                <Icon className={cn("size-5 sm:size-6", numClass)} />
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
      </div>

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
              className={cn(
                "relative w-full rounded-2xl border bg-card p-6 shadow-2xl",
                streakTab === "month" ? "max-w-sm" : "max-w-xs",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowStreak(false)}
                className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
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

              {/* Week / Month tabs */}
              <div className="mb-4 flex gap-1 rounded-lg bg-muted/50 p-0.5">
                <button
                  onClick={() => setStreakTab("week")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    streakTab === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  Week
                </button>
                <button
                  onClick={() => setStreakTab("month")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    streakTab === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Calendar className="size-3.5" />
                  Month
                </button>
              </div>

              <AnimatePresence mode="wait">
                {streakTab === "week" ? (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {streakDays.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-medium text-muted-foreground">{d.label}</span>
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full border-2 transition-colors sm:size-8",
                              d.status === "filled" && "border-orange-500 bg-orange-500",
                              d.status === "frozen" && "border-blue-400 bg-blue-500/10",
                              d.status === "broken" && "border-red-400 bg-red-500/10",
                              d.status === "empty" && d.isToday && "border-muted-foreground/40",
                              d.status === "empty" && !d.isToday && "border-muted-foreground/15",
                            )}
                          >
                            {d.status === "filled" && <CheckCircle2 className="size-full p-1 text-white" />}
                            {d.status === "frozen" && <Snowflake className="size-full p-1 text-blue-400" />}
                            {d.status === "broken" && <X className="size-full p-1 text-red-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.15 }}
                  >
                    <MonthlyStreakView
                      activeDates={activeDates}
                      frozenDays={frozenDays}
                      brokenDays={brokenDays}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}