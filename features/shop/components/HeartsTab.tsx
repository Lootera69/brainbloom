"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, Snowflake, Gem, Infinity, Shield } from "lucide-react";
import { SHOP_PRODUCTS, GEM_HEART_REFILL_COST, GEM_STREAK_FREEZE_COST } from "@/lib/subscription";
import { purchaseProduct } from "@/services/purchase-service";
import { useUserStore } from "@/store/user-store";
import { hasPremiumAccess } from "@/services/entitlement-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import { PurchaseRainEffect } from "./PurchaseRainEffect";

export function HeartsTab() {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [rainType, setRainType] = useState<"hearts" | "snowflakes" | null>(null);
  const rainTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoreHearts = useUserStore((s) => s.restoreHearts);
  const addStreakFreezes = useUserStore((s) => s.addStreakFreezes);
  const hearts = useUserStore((s) => s.hearts);
  const streakFreezes = useUserStore((s) => s.streakFreezes);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);

  useEffect(() => {
    return () => { if (rainTimer.current) clearTimeout(rainTimer.current); };
  }, []);

  const handlePurchase = useCallback(async (product: typeof SHOP_PRODUCTS[number]) => {
    if (purchasing) return;
    setPurchasing(product.id);
    const result = await purchaseProduct(product.id);
    if (!result.success) {
      toast.error("Purchase failed. Please try again.", { position: "top-center" });
      setPurchasing(null);
      return;
    }
    if (product.effect.hearts) {
      restoreHearts();
      setRainType("hearts");
      if (rainTimer.current) clearTimeout(rainTimer.current);
      rainTimer.current = setTimeout(() => setRainType(null), 3000);
    }
    if (product.effect.streakFreezes) {
      addStreakFreezes(product.effect.streakFreezes);
      setRainType("snowflakes");
      if (rainTimer.current) clearTimeout(rainTimer.current);
      rainTimer.current = setTimeout(() => setRainType(null), 3000);
    }
    setPurchased(product.id);
    toast.custom(
      (tid) => (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-500/5 px-4 py-3 shadow-lg">
          <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/20">
            {product.effect.hearts ? (
              <Heart className="size-4 text-rose-400" />
            ) : (
              <Snowflake className="size-4 text-blue-400" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground/60">Ready to use</p>
          </div>
        </div>
      ),
      { duration: 2000, position: "top-center" },
    );
    setTimeout(() => { setPurchased(null); setPurchasing(null); }, 2000);
  }, [purchasing, restoreHearts, addStreakFreezes]);

  const products = useMemo(
    () => SHOP_PRODUCTS.filter((p) => p.category === "hearts" || p.category === "streak_freeze"),
    [],
  );

  const heartFill = Math.min(hearts / 5, 1);
  const heartBars = Array.from({ length: 5 }, (_, i) => i < hearts);

  return (
    <>
      <PurchaseRainEffect active={rainType !== null} type={rainType ?? "hearts"} />
      <div className="space-y-5 py-2">
      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-pink-500/10 border border-rose-500/15 p-4"
        >
          <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-400/70 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="size-3 fill-rose-400 text-rose-400" />
                Hearts
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-rose-400">{hearts}</span>
                <span className="text-xs text-rose-400/40">/ 5</span>
              </div>
            </div>
            <span className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              isPremium
                ? "bg-amber-400/10"
                : "bg-rose-500/10",
            )}>
              {isPremium ? (
                <Infinity className="size-5 text-amber-400" />
              ) : (
                <Heart className="size-5 fill-rose-400 text-rose-400" />
              )}
            </span>
          </div>
          {!isPremium && (
            <div className="mt-3 flex gap-1">
              {heartBars.map((filled, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    filled ? "bg-rose-400/60" : "bg-rose-500/10",
                  )}
                  style={{ transitionDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          )}
          {isPremium && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-400/60">
              <Infinity className="size-3" />
              Unlimited
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-cyan-500/10 border border-blue-500/15 p-4"
        >
          <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-blue-400/70 uppercase tracking-wider flex items-center gap-1.5">
                <Snowflake className="size-3 text-blue-400" />
                Freezes
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-blue-400">{streakFreezes}</span>
                <span className="text-xs text-blue-400/40">available</span>
              </div>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Snowflake className="size-5 text-blue-400" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-blue-400/40">
            <Shield className="size-3" />
            Protects your streak
          </div>
        </motion.div>
      </div>

      {/* Product list */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Quick Buy
        </h3>
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priceLabel={product.priceLabel}
            purchasing={purchasing === product.id}
            purchased={purchased === product.id}
            onPurchase={() => handlePurchase(product)}
            index={i}
            particleType={product.category === "streak_freeze" ? "snowflakes" : "hearts"}
          />
        ))}
      </div>

      {/* Gem Exchange */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-cyan-500/[0.04] via-blue-500/[0.02] to-transparent p-4">
        <div className="pointer-events-none absolute -left-4 -bottom-4 size-24 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-500/10">
              <Gem className="size-3 text-cyan-400" />
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Gem Exchange
            </span>
          </div>
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/15 to-pink-500/15">
                  <Heart className="size-4 text-rose-400" />
                </span>
                <div>
                  <p className="text-sm font-medium">Heart Refill</p>
                  <p className="text-[10px] text-muted-foreground/50">Restore all 5 hearts instantly</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-400">
                <Gem className="size-3" />
                {GEM_HEART_REFILL_COST}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/15">
                  <Snowflake className="size-4 text-blue-400" />
                </span>
                <div>
                  <p className="text-sm font-medium">Streak Freeze</p>
                  <p className="text-[10px] text-muted-foreground/50">Protect your streak from breaking</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-400">
                <Gem className="size-3" />
                {GEM_STREAK_FREEZE_COST}
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}


