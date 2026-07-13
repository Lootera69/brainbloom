"use client";

import { Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

interface LockedFeatureProps {
  featureName: string;
  description?: string;
  onUpgrade?: () => void;
}

export function LockedFeature({ featureName, description, onUpgrade }: LockedFeatureProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="pointer-events-none absolute inset-0 z-10 flex select-none items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg">
            <Lock className="size-6 text-primary" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-foreground">{featureName}</p>
            {description && (
              <p className="mt-0.5 max-w-[200px] text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-purple-500 px-5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Sparkles className="size-4" />
              Go Premium
            </button>
          )}
        </motion.div>
      </div>
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        <GlassCard intensity="light" className="min-h-[200px] rounded-2xl p-6" />
      </div>
    </motion.div>
  );
}
