"use client";

import { motion } from "framer-motion";
import { Clock, Brain, Zap, Lightbulb, Atom, Grid2x2 } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/features/home/components/SectionHeader";

const categoryIcons: Record<string, typeof Brain> = {
  logic: Brain,
  riddle: Lightbulb,
  science: Atom,
  sudoku: Grid2x2,
};

function getIcon(category: string) {
  return categoryIcons[category] ?? Brain;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity() {
  const history = useUserStore((s) => s.history);

  if (history.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-8 sm:mb-10"
    >
      <SectionHeader title="Recent Activity" delay={0.25} />

      <GlassCard intensity="light" className="overflow-hidden">
        {history.slice(0, 5).map((item, i) => {
          const Icon = getIcon(item.category);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0 sm:px-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {timeAgo(item.timestamp)}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                <Zap className="size-3.5" />
                +{item.xp}
              </span>
            </motion.div>
          );
        })}
      </GlassCard>
    </motion.section>
  );
}
