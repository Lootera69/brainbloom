"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle?: string;
  delay?: number;
}

export function SectionHeader({ title, subtitle, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mb-5 sm:mb-6"
    >
      <div className="flex items-center gap-3">
        <span className="relative h-8 w-1 overflow-hidden rounded-full bg-gradient-to-b from-violet-500 via-primary to-primary/10 dark:from-primary dark:via-[#8b5cf6] dark:to-primary/10">
          <motion.span
            aria-hidden
            className="absolute inset-x-0 h-3 rounded-full bg-white/60 blur-[2px] dark:bg-white/40"
            animate={{ top: ["-30%", "130%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
          />
        </span>
        <div>
          <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/60 dark:to-foreground bg-clip-text">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
