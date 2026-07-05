"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Lightbulb,
  Atom,
  Grid2x2,
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
      <GlassCard
        tint={color}
        hover
        className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl p-5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(500px circle at 50% 50%, ${color}15, transparent 60%)`,
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.3 + index * 0.08,
              type: "spring",
              stiffness: 200,
            }}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12"
            style={{ backgroundColor: `${color}18` }}
          >
            <span
              className="absolute inset-0 rounded-xl opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-60"
              style={{ backgroundColor: color }}
            />
            <Icon className="relative size-5 sm:size-6" style={{ color }} />
          </motion.span>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-semibold sm:text-lg">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="flex items-center justify-end">
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground"
            >
              Explore
              <ArrowRight className="size-3.5" />
            </motion.span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
