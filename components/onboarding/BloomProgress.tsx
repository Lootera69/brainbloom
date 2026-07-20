"use client";

import { motion } from "framer-motion";

interface BloomProgressProps {
  step: number;
  total: number;
}

/**
 * A growing flower that gains one petal per completed step.
 * Replaces the flat progress dots — the bloom *is* the progress.
 */
export default function BloomProgress({ step, total }: BloomProgressProps) {
  // Petals appear around the center as the user advances.
  const petals = Array.from({ length: total });
  const bloomed = step; // number of petals currently open (0-indexed step)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative size-9">
        {petals.map((_, i) => {
          const angle = (360 / total) * i - 90;
          const open = i < bloomed;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-3 w-2 -translate-x-1/2 origin-bottom rounded-full"
              style={{
                rotate: `${angle}deg`,
                background: open
                  ? "linear-gradient(to top, var(--primary), #8b5cf6)"
                  : "color-mix(in oklab, var(--muted-foreground) 25%, transparent)",
              }}
              initial={false}
              animate={{
                translateY: open ? -9 : -5,
                scale: open ? 1 : 0.6,
                opacity: open ? 1 : 0.4,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            />
          );
        })}
        {/* Flower core */}
        <motion.span
          className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-sm"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground/50">
        {Math.min(step + 1, total)} / {total}
      </span>
    </div>
  );
}
