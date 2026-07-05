"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Gem } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";

export function DailyRewardChest() {
  const canClaim = useUserStore((s) => s.canClaimReward);
  const claim = useUserStore((s) => s.claimDailyReward);
  const streak = useUserStore((s) => s.streak);
  const [mounted, setMounted] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (!canClaim()) return null;

  const handleClaim = () => {
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      const amount = claim();
      setReward(amount);
      setClaimed(true);
    }, 600);
  };

  return (
    <GlassCard intensity="light" className="mb-6 overflow-hidden sm:mb-8">
      <AnimatePresence mode="wait">
        {!claimed ? (
          <motion.div
            key="chest"
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex cursor-pointer items-center justify-between p-5 sm:p-6"
            onClick={handleClaim}
          >
            <div>
              <p className="text-sm text-muted-foreground">Daily Reward</p>
              <p className="font-heading text-lg font-bold">Claim your reward!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Streak bonus: +{Math.min(5 + streak * 2, 50)} gems
              </p>
            </div>
            <motion.span
              animate={shaking ? { rotate: [0, -20, 20, -20, 20, 0] } : { y: [0, -4, 0] }}
              transition={shaking ? { duration: 0.4 } : { duration: 2, repeat: Infinity }}
              className="flex size-14 items-center justify-center rounded-2xl bg-warning/15"
            >
              <Gift className="size-7 text-warning" />
            </motion.span>
          </motion.div>
        ) : (
          <motion.div
            key="reward"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 text-center sm:p-6"
          >
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/15"
            >
              <Gem className="size-7 text-primary" />
            </motion.span>
            <p className="font-heading text-lg font-bold">+{reward} Gems</p>
            <p className="text-sm text-muted-foreground">Come back tomorrow for more!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
