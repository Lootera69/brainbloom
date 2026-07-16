"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Gem, Sparkles } from "lucide-react";
import { SHOP_PRODUCTS, getProductPriceLabel, type PricingConfig } from "@/lib/subscription";
import { purchaseProduct } from "@/services/purchase-service";
import { useUserStore } from "@/store/user-store";
import { getPricingConfig } from "@/services/pricing-service";
import { toast } from "sonner";
import { ProductCard } from "./ProductCard";
import { PurchaseRainEffect } from "./PurchaseRainEffect";

export function GemsTab() {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [rainAmount, setRainAmount] = useState<number | null>(null);
  const rainTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const addGems = useUserStore((s) => s.addGems);
  const gems = useUserStore((s) => s.gems);

  useEffect(() => {
    getPricingConfig().then(setPricing);
    return () => { if (rainTimer.current) clearTimeout(rainTimer.current); };
  }, []);

  const handlePurchase = useCallback(async (productId: string, gemAmount: number) => {
    if (purchasing) return;
    setPurchasing(productId);
    const result = await purchaseProduct(productId);
    if (!result.success) {
      toast.error("Purchase failed. Please try again.", { position: "top-center" });
      setPurchasing(null);
      return;
    }
    addGems(gemAmount);
    setPurchased(productId);
    setRainAmount(gemAmount);
    if (rainTimer.current) clearTimeout(rainTimer.current);
    rainTimer.current = setTimeout(() => setRainAmount(null), 3000);
    toast.custom(
      (tid) => (
        <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 px-4 py-3 shadow-lg">
          <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/20">
            <Gem className="size-4 text-cyan-400" />
          </span>
          <div>
            <p className="text-sm font-semibold text-cyan-400">+{gemAmount} Gems</p>
            <p className="text-xs text-cyan-400/60">Added to your wallet</p>
          </div>
        </div>
      ),
      { duration: 2000, position: "top-center" },
    );
    setTimeout(() => { setPurchased(null); setPurchasing(null); }, 2000);
  }, [purchasing, addGems]);

  const gems_products = SHOP_PRODUCTS.filter((p) => p.category === "gems");

  return (
    <>
      <PurchaseRainEffect active={rainAmount !== null} type="gems" amount={rainAmount ?? 0} />
      <div className="space-y-4 py-2">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/10 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Your Gems</p>
          <p className="text-2xl font-extrabold tracking-tight text-cyan-400">{gems}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10">
          <Gem className="size-5 text-cyan-400" />
        </span>
      </div>

      <div className="space-y-2">
        {gems_products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priceLabel={pricing ? getProductPriceLabel(product.id, pricing) : product.priceLabel}
            purchasing={purchasing === product.id}
            purchased={purchased === product.id}
            onPurchase={() => handlePurchase(product.id, product.effect.gems ?? 0)}
            index={i}
            particleType="gems"
            particleCount={
              product.effect.gems && product.effect.gems >= 1000 ? 10
              : product.effect.gems && product.effect.gems >= 500 ? 7
              : 4
            }
            particleIntensity={
              product.effect.gems && product.effect.gems >= 1000 ? "energetic"
              : product.effect.gems && product.effect.gems >= 500 ? "medium"
              : "subtle"
            }
          />
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground/40 pt-2">
        <Sparkles className="inline size-3 mr-1" />
        Gems can be used for heart refills and streak freezes
      </p>
    </div>
    </>
  );
}
