"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { categories } from "@/constants/home";

const FALLBACK_COLOR = "#6366f1";

function categoryColor(category: string): string {
  const id = category === "riddle" ? "riddles" : category;
  return categories.find((c) => c.id === id)?.color ?? FALLBACK_COLOR;
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-8 sm:mb-10"
    >
      <SectionHeader title="Recent Activity" delay={0.25} />

      {history.length === 0 ? (
        <GlassCard intensity="light" className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <History className="size-4 text-muted-foreground/40" />
          </span>
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </GlassCard>
      ) : (
        <GlassCard intensity="light" className="px-4 py-3 sm:px-5">
          {history.slice(0, 5).map((item, i, arr) => {
            const isLast = i === arr.length - 1;
            const color = categoryColor(item.category);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-stretch gap-3"
              >
                {/* Timeline rail: dot + connector */}
                <div className="flex w-6 flex-col items-center">
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{
                      background: `linear-gradient(to bottom right, ${color}, ${color}99)`,
                      boxShadow: `0 0 4px ${color}4d`,
                    }}
                  />
                  {!isLast && (
                    <span
                      className="w-0.5 flex-1"
                      style={{
                        background: `linear-gradient(to bottom, ${color}4d, var(--border))`,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`min-w-0 flex-1 ${isLast ? "pb-1" : "pb-4"}`}>
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</span>
                    <span className="ml-auto rounded-md bg-gradient-to-r from-primary/[0.12] to-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold text-primary">
                      +{item.xp} XP
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </GlassCard>
      )}
    </motion.section>
  );
}
