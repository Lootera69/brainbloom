"use client";

import { useState, useCallback } from "react";
import { Heart, Snowflake, Gem } from "lucide-react";
import { SHOP_PRODUCTS, GEM_HEART_REFILL_COST, GEM_STREAK_FREEZE_COST } from "@/lib/subscription";
import { purchaseProduct } from "@/services/purchase-service";
import { useUserStore } from "@/store/user-store";
import { toast } from "sonner";
import { ProductCard } from "./ProductCard";

export function HeartsTab() {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const restoreHearts = useUserStore((s) => s.restoreHearts);
  const addStreakFreezes = useUserStore((s) => s.addStreakFreezes);
  const hearts = useUserStore((s) => s.hearts);
  const streakFreezes = useUserStore((s) => s.streakFreezes);

  const handlePurchase = useCallback(async (product: typeof SHOP_PRODUCTS[number]) => {
    if (purchasing) return;
    setPurchasing(product.id);
    const result = await purchaseProduct(product.id);
    if (!result.success) {
      toast.error("Purchase failed. Please try again.", { position: "top-center" });
      setPurchasing(null);
      return;
    }
    if (product.effect.hearts) restoreHearts();
    if (product.effect.streakFreezes) addStreakFreezes(product.effect.streakFreezes);
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

  const products = SHOP_PRODUCTS.filter((p) => p.category === "hearts" || p.category === "streak_freeze");

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-rose-500/5 to-pink-500/5 border border-rose-500/10 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Hearts</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tracking-tight text-rose-400">{hearts}</span>
            <span className="text-xs text-muted-foreground/60">/ 5</span>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/10 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Freezes</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tracking-tight text-blue-400">{streakFreezes}</span>
            <span className="text-xs text-muted-foreground/60">available</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priceLabel={product.priceLabel}
            purchasing={purchasing === product.id}
            purchased={purchased === product.id}
            onPurchase={() => handlePurchase(product)}
            index={i}
          />
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gem Exchange</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Heart className="size-4 text-rose-400" />
              <span className="text-xs font-medium">Heart Refill</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400">
              <Gem className="size-3" />
              {GEM_HEART_REFILL_COST}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Snowflake className="size-4 text-blue-400" />
              <span className="text-xs font-medium">Streak Freeze</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400">
              <Gem className="size-3" />
              {GEM_STREAK_FREEZE_COST}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
