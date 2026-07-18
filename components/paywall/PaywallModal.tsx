"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Heart, Sparkles, Play, Gem, X } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { AdModal } from "@/components/paywall/AdModal";
import { FREE_TIER_DAILY_LIMIT, ADS_MAX_PER_DAY, REWARDED_AD_HEART_AMOUNT } from "@/lib/subscription";

interface PaywallModalProps {
  type: "limit" | "hearts";
  onClose: () => void;
  onGoPremium: () => void;
}

export function PaywallModal({ type, onClose, onGoPremium }: PaywallModalProps) {
  const [showAd, setShowAd] = useState(false);
  const adsWatchedToday = useUserStore((s) => s.adsWatchedToday);
  const adsWatchDate = useUserStore((s) => s.adsWatchDate);
  const canWatchAd = useUserStore((s) => s.canWatchAd);
  const incrementAdWatched = useUserStore((s) => s.incrementAdWatched);
  const incrementPuzzlePlayed = useUserStore((s) => s.incrementPuzzlePlayed);
  const setShowShop = useUIStore((s) => s.setShowShop);
  const today = new Date().toDateString();
  const remaining = ADS_MAX_PER_DAY - (adsWatchDate === today ? adsWatchedToday : 0);

  const handleAdComplete = (rewarded: boolean) => {
    setShowAd(false);
    if (!rewarded) return;
    incrementAdWatched();
    if (type === "limit") {
      incrementPuzzlePlayed();
    } else {
      useUserStore.setState((s) => ({ hearts: Math.min(5, s.hearts + REWARDED_AD_HEART_AMOUNT) }));
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {showAd ? (
        <AdModal
          onComplete={handleAdComplete}
          onClose={() => setShowAd(false)}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="relative px-6 pb-6 pt-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg"
              >
                {type === "limit" ? (
                  <Lock className="size-7 text-primary" />
                ) : (
                  <Heart className="size-7 fill-destructive text-destructive" />
                )}
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-heading text-xl font-bold"
              >
                {type === "limit" ? "Daily Limit Reached" : "No Hearts Left"}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-sm text-muted-foreground"
              >
                {type === "limit"
                  ? `Free tier allows ${FREE_TIER_DAILY_LIMIT} puzzles per day. Go Premium for unlimited access!`
                  : "You're all out of hearts. Recharge to keep playing."}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-6 flex flex-col gap-3"
              >
                {canWatchAd() && (
                  <button
                    onClick={() => setShowAd(true)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold transition-all hover:bg-white/10 active:scale-[0.98]"
                  >
                    <Play className="size-4" />
                    Watch Ad{type === "hearts" ? " for +1 Heart" : " for +1 Play"}
                    <span className="text-[11px] text-muted-foreground">({remaining} left)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onClose();
                    onGoPremium();
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Sparkles className="size-4" />
                  Go Premium — Unlimited
                </button>

                {type === "hearts" && (
                  <button
                    onClick={() => {
                      onClose();
                      setShowShop(true);
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-sm font-semibold text-cyan-500 transition-all hover:bg-cyan-500/20 active:scale-[0.98]"
                  >
                    <Gem className="size-4" />
                    Buy Heart Refill (50 Gems)
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
