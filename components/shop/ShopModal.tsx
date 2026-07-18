"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gem, Heart, Snowflake, Sparkles, X, Crown, ShoppingBag, ChevronRight,
} from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { useRouter } from "next/navigation";
import { SHOP_PRODUCTS, type PricingConfig, getProductPriceLabel } from "@/lib/subscription";
import { getPricingConfig } from "@/services/pricing-service";
import { purchaseProduct } from "@/services/purchase-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PremiumTab } from "@/features/shop/components/PremiumTab";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { PurchaseRainEffect } from "@/features/shop/components/PurchaseRainEffect";

type ModalTab = "premium" | "gems" | "hearts";

const MODAL_TABS: { id: ModalTab; label: string; icon: typeof Crown }[] = [
  { id: "premium", label: "Premium", icon: Crown },
  { id: "gems", label: "Gems", icon: Gem },
  { id: "hearts", label: "Hearts & Freezes", icon: Heart },
];

interface ShopModalProps {
  onClose: () => void;
}

export function ShopModal({ onClose }: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("premium");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [rainParams, setRainParams] = useState<{ type: "gems" | "hearts" | "snowflakes"; amount: number } | null>(null);
  const rainTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gems = useUserStore((s) => s.gems);
  const router = useRouter();

  useEffect(() => {
    getPricingConfig().then(setPricing);
    return () => { if (rainTimer.current) clearTimeout(rainTimer.current); };
  }, []);

  const addGems = useUserStore((s) => s.addGems);
  const restoreHearts = useUserStore((s) => s.restoreHearts);
  const addStreakFreezes = useUserStore((s) => s.addStreakFreezes);
  const setTier = useUserStore((s) => s.setTier);

  const handleProductPurchase = useCallback(async (product: typeof SHOP_PRODUCTS[number]) => {
    if (purchasing) return;
    setPurchasing(product.id);
    const result = await purchaseProduct(product.id);
    if (!result.success) {
      toast.error("Purchase failed. Please try again.", { position: "top-center" });
      setPurchasing(null);
      return;
    }
    if (product.effect.gems) {
      addGems(product.effect.gems);
      setRainParams({ type: "gems", amount: product.effect.gems });
      if (rainTimer.current) clearTimeout(rainTimer.current);
      rainTimer.current = setTimeout(() => setRainParams(null), 3000);
    }
    if (product.effect.hearts) {
      restoreHearts();
      setRainParams({ type: "hearts", amount: 0 });
      if (rainTimer.current) clearTimeout(rainTimer.current);
      rainTimer.current = setTimeout(() => setRainParams(null), 3000);
    }
    if (product.effect.streakFreezes) {
      addStreakFreezes(product.effect.streakFreezes);
      setRainParams({ type: "snowflakes", amount: 0 });
      if (rainTimer.current) clearTimeout(rainTimer.current);
      rainTimer.current = setTimeout(() => setRainParams(null), 3000);
    }
    if (product.effect.tier === "premium" && product.effect.days) {
      const expiry = Date.now() + product.effect.days * 86400000;
      setTier("premium", expiry);
    }
    setPurchased(product.id);
    setTimeout(() => setPurchased(null), 2000);
    setPurchasing(null);
  }, [purchasing, addGems, restoreHearts, setTier, addStreakFreezes]);

  const nonPremiumProducts = SHOP_PRODUCTS.filter((p) => p.category !== "premium");

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
              <ShoppingBag className="size-4 text-primary" />
              <h2 className="text-sm font-bold">Shop</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-500">
                <Gem className="size-3" />
                {gems}
              </span>
              <button
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-full bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="relative flex gap-1 border-b border-border/30 px-5 py-2 shrink-0">
            {MODAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative px-3 py-2 text-[11px] font-semibold transition-colors rounded-lg",
                    isActive
                      ? "text-foreground bg-muted/30"
                      : "text-muted-foreground hover:text-foreground/80",
                  )}
                >
                  <Icon className="inline size-3 mr-1" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeTab === "premium" && (
              <PremiumTab onClose={onClose} />
            )}

            {activeTab !== "premium" && (
              <div className="space-y-2">
                {nonPremiumProducts
                  .filter((p) =>
                    activeTab === "gems"
                      ? p.category === "gems"
                      : p.category === "hearts" || p.category === "streak_freeze",
                  )
                  .map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priceLabel={
                        pricing
                          ? getProductPriceLabel(product.id, pricing)
                          : product.priceLabel
                      }
                      purchasing={purchasing === product.id}
                      purchased={purchased === product.id}
                      onPurchase={() => handleProductPurchase(product)}
                      index={i}
                      particleType={
                        product.category === "streak_freeze" ? "snowflakes"
                        : product.category === "hearts" ? "hearts"
                        : "gems"
                      }
                      particleCount={
                        product.category === "streak_freeze" || product.category === "hearts" ? undefined
                        : product.effect.gems && product.effect.gems >= 1000 ? 10
                        : product.effect.gems && product.effect.gems >= 500 ? 7
                        : 4
                      }
                      particleIntensity={
                        product.category === "streak_freeze" || product.category === "hearts" ? undefined
                        : product.effect.gems && product.effect.gems >= 1000 ? "energetic"
                        : product.effect.gems && product.effect.gems >= 500 ? "medium"
                        : "subtle"
                      }
                    />
                  ))}
              </div>
            )}

            {/* View full store */}
            <div className="mt-4 pt-3 border-t border-border/30">
              <button
                onClick={() => {
                  onClose();
                  router.push("/shop");
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-muted/20 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <Sparkles className="size-3" />
                View full store
                <ChevronRight className="size-3" />
              </button>
            </div>

            {/* Bottom safe area */}
            <div className="h-1" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
