"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame, Heart, Gem, CheckCircle2, Sparkles, Target } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "./SectionHeader";

const iconMap: Record<string, typeof Zap> = {
  zap: Zap,
  flame: Flame,
  heart: Heart,
};

const accentMap: Record<string, { hex: string; rgb: [number, number, number] }> = {
  zap: { hex: "#6366f1", rgb: [99, 102, 241] },
  flame: { hex: "#f97316", rgb: [249, 115, 22] },
  heart: { hex: "#f43f5e", rgb: [244, 63, 94] },
};

const GLOW_PARTICLES = Array.from({ length: 8 }).map((_, i) => ({
  x: (i % 4) * 25 + (i * 7) % 20,
  delay: i * 0.3,
  size: 2 + (i % 2),
  duration: 2.5 + (i % 2),
}));

function QuestRing({
  pct,
  done,
  accent,
  id,
  children,
}: {
  pct: number;
  done: boolean;
  accent: { hex: string; rgb: [number, number, number] };
  id: string;
  children: ReactNode;
}) {
  const R = 25;
  const C = 2 * Math.PI * R;
  const [r, g, b] = accent.rgb;
  return (
    <span className="relative flex size-[74px] items-center justify-center">
      {/* Accent halo */}
      <span
        className="pointer-events-none absolute size-[74px] rounded-full blur-md"
        style={{
          background: done
            ? "radial-gradient(circle, rgba(34,197,94,0.35), transparent 70%)"
            : `radial-gradient(circle, rgba(${r},${g},${b},0.30), transparent 70%)`,
        }}
      />
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-muted" />
        <motion.circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke={done ? "#22c55e" : `url(#grad-${id})`}
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ filter: done ? "drop-shadow(0 0 4px rgba(34,197,94,0.5))" : `drop-shadow(0 0 4px rgba(${r},${g},${b},0.45))` }}
        />
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor={accent.hex} />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="relative flex size-12 items-center justify-center rounded-full transition-colors duration-300"
        style={{
          background: done
            ? "rgba(34,197,94,0.15)"
            : `rgba(${r},${g},${b},0.12)`,
          color: done ? "#22c55e" : accent.hex,
        }}
      >
        {children}
      </span>
    </span>
  );
}

export function DailyQuests() {
  const dailyQuests = useUserStore((s) => s.dailyQuests);

  if (!dailyQuests.length) return null;

  const doneCount = dailyQuests.filter((q) => q.progress >= q.target).length;
  const allDone = doneCount === dailyQuests.length;
  const banked = dailyQuests
    .filter((q) => q.progress >= q.target)
    .reduce((sum, q) => sum + q.reward, 0);
  const remaining = dailyQuests
    .filter((q) => q.progress < q.target)
    .reduce((sum, q) => sum + q.reward, 0);

  return (
    <section className="mb-8 sm:mb-10">
      <SectionHeader
        title="Daily Quests"
        subtitle="Complete tasks for bonus gems"
        action={
          <motion.span
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]"
          >
            <span className="relative flex size-5 items-center justify-center">
              <svg viewBox="0 0 24 24" className="absolute inset-0 size-full -rotate-90">
                <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" className="stroke-muted" />
                <motion.circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke={allDone ? "#22c55e" : "url(#questHeaderGrad)"}
                  strokeDasharray={2 * Math.PI * 10}
                  initial={{ strokeDashoffset: 2 * Math.PI * 10 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 10 * (1 - doneCount / dailyQuests.length) }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="questHeaderGrad" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="relative text-[9px] font-black tabular-nums">{doneCount}</span>
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Gem className="size-3" />+{banked + remaining}
            </span>
          </motion.span>
        }
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {dailyQuests.map((quest, i) => {
          const Icon = iconMap[quest.icon] || Zap;
          const accent = accentMap[quest.icon] || accentMap.zap;
          const [ar, ag, ab] = accent.rgb;
          const done = quest.progress >= quest.target;
          const pct = Math.min(quest.progress / quest.target, 1);

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 140, damping: 16 }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 260, damping: 18 } }}
              className="relative h-full"
            >
              {/* Pulsing glow */}
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                  background: done
                    ? "radial-gradient(circle, rgba(34,197,94,0.14), transparent 70%)"
                    : pct > 0
                      ? `radial-gradient(circle, rgba(${ar},${ag},${ab},${0.10 * pct + 0.04}), transparent 70%)`
                      : "none",
                }}
                animate={pct > 0 || done ? { opacity: [0, 1, 0] } : { opacity: 0 }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              <GlassCard
                intensity="light"
                className={`relative flex h-full flex-col items-center gap-2 overflow-hidden p-3 transition-shadow duration-300 sm:gap-3 sm:p-5 ${
                  done ? "ring-1 ring-success/40 shadow-lg shadow-success/10" : ""
                }`}
                style={{
                  background: done
                    ? "linear-gradient(165deg, rgba(34,197,94,0.10), color-mix(in oklab, var(--card) 70%, transparent))"
                    : `linear-gradient(165deg, rgba(${ar},${ag},${ab},0.09), color-mix(in oklab, var(--card) 70%, transparent))`,
                }}
              >
                {/* Top accent shimmer */}
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-14"
                  style={{
                    background: done
                      ? "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.18), transparent 70%)"
                      : `radial-gradient(ellipse at 50% 0%, rgba(${ar},${ag},${ab},0.16), transparent 70%)`,
                  }}
                />

                {/* Reward chip */}
                <motion.span
                  className="relative flex items-center gap-1 self-end rounded-full border border-amber-400/25 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-600 sm:px-2.5 sm:text-[11px] dark:text-amber-400"
                  whileTap={{ scale: 0.9 }}
                >
                  <Gem className="size-2.5 sm:size-3" />
                  {quest.reward}
                </motion.span>

                <QuestRing pct={pct} done={done} accent={accent} id={quest.id}>
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 240, damping: 13 }}
                        className="flex"
                      >
                        <CheckCircle2 className="size-5 sm:size-6" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex"
                      >
                        <Icon className="size-5 sm:size-6" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </QuestRing>

                <div className="relative w-full text-center">
                  <p
                    title={quest.description}
                    className={`line-clamp-2 text-[11px] font-bold leading-tight sm:text-sm ${
                      done ? "text-success" : "text-foreground"
                    }`}
                  >
                    {quest.title}
                  </p>
                </div>

                <div className="relative mt-auto w-full space-y-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={`h-full rounded-full ${done ? "bg-gradient-to-r from-success to-emerald-400" : ""}`}
                      style={
                        done
                          ? undefined
                          : { backgroundImage: `linear-gradient(90deg, ${accent.hex}, #8b5cf6)` }
                      }
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground sm:text-xs">
                      {quest.progress}/{quest.target}
                    </span>
                    {done ? (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-success sm:text-[10px]"
                      >
                        Done
                      </motion.span>
                    ) : (
                      <Target className="size-3 text-muted-foreground/60" />
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
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-black text-amber-600 dark:text-amber-400">
              <Gem className="size-3" />+{banked}
            </span>
          </div>
        </motion.div>
      )}
    </section>
  );
}
