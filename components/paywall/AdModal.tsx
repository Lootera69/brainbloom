"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { showRewardedAd } from "@/services/ad-service";

interface AdModalProps {
  onComplete: (rewarded: boolean) => void;
  onClose: () => void;
}

export function AdModal({ onComplete, onClose }: AdModalProps) {
  const [phase, setPhase] = useState<"playing" | "rewarded" | "skipped">("playing");

  useEffect(() => {
    (async () => {
      const rewarded = await showRewardedAd();
      setPhase(rewarded ? "rewarded" : "skipped");
      if (rewarded) {
        setTimeout(() => onComplete(true), 1200);
      } else {
        setTimeout(() => onComplete(false), 1200);
      }
    })();
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-card p-8 text-center shadow-2xl"
        >
          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="size-10 text-primary" />
              </motion.div>
              <p className="text-sm font-semibold">Playing ad...</p>
              <p className="text-xs text-muted-foreground">You'll get a reward in just a moment</p>
            </motion.div>
          )}

          {phase === "rewarded" && (
            <motion.div
              key="rewarded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="flex size-14 items-center justify-center rounded-full bg-success/20"
              >
                <CheckCircle2 className="size-8 text-success" />
              </motion.span>
              <p className="text-sm font-semibold text-success">Reward Earned!</p>
            </motion.div>
          )}

          {phase === "skipped" && (
            <motion.div
              key="skipped"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-destructive/20">
                <XCircle className="size-8 text-destructive" />
              </span>
              <p className="text-sm font-semibold text-destructive">Ad Skipped</p>
              <p className="text-xs text-muted-foreground">No reward this time</p>
              <button
                onClick={onClose}
                className="mt-2 h-10 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Close
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
