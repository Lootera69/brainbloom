"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackNavigationProps {
  href: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function BackNavigation({ href, label = "Back to puzzles", className, onClick }: BackNavigationProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 md:ml-64 pointer-events-none ${className ?? ""}`}>
      {/* Gradient accent line along the top */}
      <div className="h-[2px] w-full bg-gradient-to-r from-primary/60 via-[#8b5cf6]/40 to-transparent" />

      {/* Floating pill */}
      <motion.div
        className="pointer-events-auto ml-4 mt-3"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -20, filter: "blur(4px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      >
        <motion.button
          onClick={onClick ?? (() => router.push(href))}
          className="group relative flex items-center gap-2.5 overflow-hidden rounded-2xl border border-border/40 bg-card/70 px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-lg shadow-black/[0.03] backdrop-blur-xl saturate-[1.5] transition-colors hover:border-primary/30 hover:text-foreground dark:shadow-black/20 dark:hover:border-primary/20"
          whileHover={shouldReduceMotion ? undefined : { x: -2 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Hover gradient fill */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/[0.06] to-[#8b5cf6]/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Arrow with glow */}
          <motion.div className="relative z-10 flex items-center">
            <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </motion.div>

          {/* Label */}
          <span className="relative z-10">{label}</span>

          {/* Subtle animated shimmer on the left edge */}
          <div className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary/50 via-[#8b5cf6]/30 to-transparent opacity-60" />
        </motion.button>
      </motion.div>
    </div>
  );
}
