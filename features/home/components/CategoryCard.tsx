"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Lightbulb,
  Atom,
  Grid2x2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface Props {
  title: string;
  icon: keyof typeof icons;
  progress: number;
  color: string;
  description: string;
  index: number;
}

const icons = {
  brain: Brain,
  lightbulb: Lightbulb,
  atom: Atom,
  grid: Grid2x2,
  sparkles: Sparkles,
};

export function CategoryCard({
  title,
  icon,
  progress,
  color,
  description,
  index,
}: Props) {
  const Icon = icons[icon];

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        delay: 0.2 + index * 0.08,
        type: "spring",
        stiffness: 100,
        damping: 16,
      }}
    >
      <div
        className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/60 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.03] shadow-md shadow-black/[0.03] dark:shadow-black/20 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.06] dark:hover:shadow-black/30"
      >
        {/* Ambient color glow */}
        <div
          className="pointer-events-none absolute -inset-2 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-40"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color}30, transparent 60%)`,
          }}
        />

        {/* Top gradient accent */}
        <div
          className="absolute inset-x-0 top-0 h-1 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
          }}
        />

        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.3 + index * 0.08,
                type: "spring",
                stiffness: 200,
              }}
              className="relative flex size-13 shrink-0 items-center justify-center rounded-2xl sm:size-14 shadow-lg"
              style={{ 
                backgroundColor: `${color}12`,
                boxShadow: `0 4px 20px ${color}15, inset 0 1px 0 rgba(255,255,255,0.6)`,
              }}
            >
              <span
                className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-50"
                style={{ backgroundColor: `${color}40` }}
              />
              <Icon className="relative size-6 sm:size-7" style={{ color }} />
            </motion.span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
                {title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto border-t border-black/[0.03] dark:border-white/[0.04] px-5 sm:px-6 py-3">
          <div className="flex items-center justify-end">
            <motion.span
              initial={{ x: 0 }}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground"
            >
              Explore
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
