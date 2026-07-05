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
        <span className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-[#8b5cf6]" />
        <div>
          <h2 className="font-heading text-2xl font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
