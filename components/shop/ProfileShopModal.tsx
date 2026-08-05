"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gem, Heart } from "lucide-react";
import { GemsTab } from "@/features/shop/components/GemsTab";
import { HeartsTab } from "@/features/shop/components/HeartsTab";
import { PurchaseRainEffect } from "@/features/shop/components/PurchaseRainEffect";

interface Props {
  type: "gems" | "hearts";
  onClose: () => void;
}

export function ProfileShopModal({ type, onClose }: Props) {
  const [rainParams, setRainParams] = useState<{ type: "gems" | "hearts" | "snowflakes"; amount: number } | null>(null);
  const rainTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handlePurchaseSuccess = useCallback((rainType: "gems" | "hearts" | "snowflakes", amount: number) => {
    setRainParams({ type: rainType, amount });
    if (rainTimer.current) clearTimeout(rainTimer.current);
    rainTimer.current = setTimeout(() => setRainParams(null), 3000);
  }, []);

  return (
    <>
      {rainParams && (
        <PurchaseRainEffect active type={rainParams.type} amount={rainParams.amount} />
      )}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl sm:rounded-3xl border border-border/50 bg-card/95 backdrop-blur-2xl sm:mx-4 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/30 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2">
                {type === "gems" ? (
                  <Gem className="size-4 text-cyan-400" />
                ) : (
                  <Heart className="size-4 text-rose-400" />
                )}
                <h2 className="text-sm font-bold">
                  {type === "gems" ? "Gems" : "Hearts & Freezes"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-full bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {type === "gems" ? (
                <GemsTab onPurchaseSuccess={handlePurchaseSuccess} />
              ) : (
                <HeartsTab onPurchaseSuccess={handlePurchaseSuccess} />
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
