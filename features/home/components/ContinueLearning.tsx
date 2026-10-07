"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  PlayCircle,
  Brain,
  Lightbulb,
  Atom,
  Grid2x2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { categories } from "@/constants/home";
import { getPublishedByCategory } from "@/services/player-content";

const iconByKey: Record<string, LucideIcon> = {
  brain: Brain,
  lightbulb: Lightbulb,
  atom: Atom,
  grid: Grid2x2,
  sparkles: Sparkles,
};

// 42×42 ring: neutral track + accent progress arc, category icon centered.
function ProgressRing({
  progress,
  color,
  children,
}: {
  progress: number;
  color: string;
  children: React.ReactNode;
}) {
  const size = 42;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, progress))}
          />
        )}
      </svg>
      {children}
    </span>
  );
}

export function ContinueLearning() {
  const lastPlayedCategory = useUserStore((s) => s.lastPlayedCategory);
  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);
  const experiencedWonderIds = useUserStore((s) => s.experiencedWonderIds);

  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!lastPlayedCategory) return;
    let cancelled = false;
    (async () => {
      const puzzles = await getPublishedByCategory(lastPlayedCategory);
      if (cancelled) return;
      const completed = new Set([...completedPuzzleIds, ...experiencedWonderIds]);
      setTotal(puzzles.length);
      setDone(puzzles.filter((p) => completed.has(p.id)).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [lastPlayedCategory, completedPuzzleIds, experiencedWonderIds]);

  if (!lastPlayedCategory) return null;

  const category = categories.find((c) => c.id === lastPlayedCategory);
  if (!category) return null;

  const Icon = iconByKey[category.icon] ?? Brain;
  const hasProgress = total > 0;
  const progress = hasProgress ? done / total : 0;
  const pct = Math.round(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 18 }}
    >
      <Link href={`/learn?category=${category.id}`}>
        <div className="group relative flex items-center gap-3 overflow-hidden rounded-[18px] border border-primary/25 bg-gradient-to-r from-primary/[0.14] to-primary/[0.03] px-3 py-2.5 transition-all duration-300 hover:border-primary/40">
          <ProgressRing progress={progress} color="var(--primary)">
            <Icon className="size-5" style={{ color: category.color }} />
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <PlayCircle className="size-3 text-primary" />
              Continue Learning
            </p>
            <p className="truncate font-heading text-base font-extrabold leading-tight text-foreground">
              {category.title}
            </p>
            {hasProgress && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {done}/{total} solved &nbsp;·&nbsp; {pct}%
              </p>
            )}
          </div>

          <motion.span
            animate={{
              boxShadow: [
                "0 0 8px rgba(99,102,241,0.25)",
                "0 0 18px rgba(99,102,241,0.6)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-105"
          >
            <ArrowRight className="size-5" />
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
}
