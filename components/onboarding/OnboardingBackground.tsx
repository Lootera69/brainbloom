"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * A living, drifting aurora backdrop for the onboarding flow.
 * Three slow-moving gradient blobs + a field of floating motes.
 * Fully theme-aware (uses primary / secondary tokens with fixed accent hues).
 */
export default function OnboardingBackground() {
  // Deterministic mote field (no Math.random in render path to keep SSR stable).
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => {
        const seed = (i * 2654435761) % 1000; // cheap hash spread
        return {
          left: (seed % 100),
          top: ((seed * 7) % 100),
          size: 2 + (seed % 4),
          delay: (seed % 60) / 10,
          duration: 8 + (seed % 70) / 10,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Drifting aurora blobs */}
      <motion.div
        aria-hidden
        className="absolute -left-24 -top-24 size-[55vh] rounded-full bg-primary/25 blur-[90px] dark:bg-primary/20"
        animate={{ x: [0, 40, -20, 0], y: [0, 30, 60, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-24 top-1/4 size-[50vh] rounded-full bg-[#8b5cf6]/25 blur-[90px] dark:bg-[#8b5cf6]/20"
        animate={{ x: [0, -30, 20, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.2, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-24 left-1/3 size-[48vh] rounded-full bg-secondary/20 blur-[90px] dark:bg-secondary/15"
        animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating motes */}
      {motes.map((m, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-primary/40 dark:bg-white/40"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: m.size,
            height: m.size,
          }}
          animate={{ y: [0, -24, 0], opacity: [0, 0.8, 0] }}
          transition={{
            duration: m.duration,
            delay: m.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Soft vignette so foreground content stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/70" />
    </div>
  );
}
