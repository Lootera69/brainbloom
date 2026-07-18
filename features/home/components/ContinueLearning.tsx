"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { categories } from "@/constants/home";
import { GlassCard } from "@/components/ui/glass-card";

export function ContinueLearning() {
  const lastPlayedCategory = useUserStore((s) => s.lastPlayedCategory);

  if (!lastPlayedCategory) return null;

  const category = categories.find((c) => c.id === lastPlayedCategory);
  if (!category) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 18 }}
    >
      <div
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/60 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.03] shadow-lg shadow-black/[0.04] dark:shadow-black/20 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[0.06] dark:hover:shadow-black/30"
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -inset-10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 50%, ${category.color}30, transparent 60%)`,
          }}
        />

        <div className="relative z-10 flex items-center justify-between p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span
              className="flex size-13 items-center justify-center rounded-2xl shadow-lg sm:size-14"
              style={{ 
                backgroundColor: `${category.color}12`,
                boxShadow: `0 4px 20px ${category.color}15, inset 0 1px 0 rgba(255,255,255,0.6)`,
              }}
            >
              <Play className="size-6 sm:size-7" style={{ color: category.color }} />
            </span>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Continue Learning</p>
              <p className="font-heading text-lg font-bold text-foreground sm:text-xl">
                {category.title}
              </p>
            </div>
          </div>
          <ArrowRight className="size-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </div>
    </motion.div>
  );
}
