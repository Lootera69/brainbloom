"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gem, Heart, Snowflake, Sparkles, X, Loader2, CheckCircle2, ShoppingBag, Crown,
} from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { SHOP_PRODUCTS, type ShopProduct, type PricingConfig, getProductPriceLabel } from "@/lib/subscription";
import { getPricingConfig } from "@/services/pricing-service";
import { purchaseProduct } from "@/services/purchase-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PricingCard } from "@/components/paywall/PricingCard";

const iconMap: Record<string, typeof Gem> = {
  Gem, Heart, Snowflake, Sparkles,
};

interface ShopModalProps {
  onClose: () => void;
}

export function ShopModal({ onClose }: ShopModalProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const gems = useUserStore((s) => s.gems);

  useEffect(() => {
    getPricingConfig().then(setPricing);
  }, []);
  const addGems = useUserStore((s) => s.addGems);
  const setTier = useUserStore((s) => s.setTier);
  const restoreHearts = useUserStore((s) => s.restoreHearts);
  const addGemsToStore = useUserStore((s) => s.addGems);
  const addStreakFreezes = useUserStore((s) => s.addStreakFreezes);

  const handlePurchase = useCallback(async (product: ShopProduct) => {
    if (purchasing) return;
    setPurchasing(product.id);

    const result = await purchaseProduct(product.id);

    if (!result.success) {
      toast.error("Purchase failed. Please try again.", { position: "top-center" });
      setPurchasing(null);
      return;
    }

    if (product.effect.gems) {
      addGemsToStore(product.effect.gems);
    }
    if (product.effect.hearts) {
      restoreHearts();
    }
    if (product.effect.streakFreezes) {
      addStreakFreezes(product.effect.streakFreezes);
    }
    if (product.effect.tier === "premium" && product.effect.days) {
      const expiry = Date.now() + product.effect.days * 86400000;
      setTier("premium", expiry);
    }

    setPurchased(product.id);
    setTimeout(() => setPurchased(null), 2000);
    setPurchasing(null);
  }, [purchasing, addGemsToStore, restoreHearts, setTier, addStreakFreezes]);

  const sections = [
    { label: "Premium", category: "premium" as const },
    { label: "Gems", category: "gems" as const },
    { label: "Hearts & Freezes", category: "hearts" as const },
  ];

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
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <h2 className="font-heading text-base font-bold">Shop</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-500">
                <Gem className="size-3" />
                {gems}
              </span>
              <button
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 rounded-xl bg-amber-500/10 px-4 py-2.5 text-center text-[11px] text-amber-600 dark:text-amber-400">
              🛠 Testing Mode — No real charges. All purchases are simulated.
            </div>

            {sections.map((section) => {
              if (section.category === "premium") {
                return (
                  <div key="premium" className="mb-5">
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Crown className="size-3 text-amber-400" />
                      Premium Membership
                    </h3>
                    <PricingCard onClose={onClose} />
                  </div>
                );
              }
              const products = SHOP_PRODUCTS.filter((p) => p.category === section.category);
              if (products.length === 0) return null;
              return (
                <div key={section.label} className="mb-5">
                  <h3 className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {products.map((product) => {
                      const Icon = iconMap[product.icon] || Gem;
                      const isPurchasing = purchasing === product.id;
                      const isPurchased = purchased === product.id;

                      return (
                        <motion.button
                          key={product.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          disabled={!!purchasing}
                          onClick={() => handlePurchase(product)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all active:scale-[0.98]",
                            isPurchased
                              ? "border-success/30 bg-success/10"
                              : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10",
                          )}
                        >
                          <span className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            "bg-white/5",
                          )}>
                            {isPurchased ? (
                              <CheckCircle2 className="size-5 text-success" />
                            ) : isPurchasing ? (
                              <Loader2 className="size-5 animate-spin text-primary" />
                            ) : (
                              <Icon className="size-5 text-muted-foreground" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{product.name}</p>
                            <p className="text-[11px] text-muted-foreground">{product.description}</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            {pricing ? getProductPriceLabel(product.id, pricing) : product.priceLabel}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
