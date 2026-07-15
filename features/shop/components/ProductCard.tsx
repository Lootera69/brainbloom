"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Gem, Heart, Snowflake, Sparkles, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopProduct } from "@/lib/subscription";

const iconMap: Record<string, typeof Gem> = {
  Gem, Heart, Snowflake, Sparkles, ShoppingBag,
};

interface ProductCardProps {
  product: ShopProduct;
  priceLabel: string;
  purchasing: boolean;
  purchased: boolean;
  onPurchase: () => void;
  index?: number;
}

export function ProductCard({ product, priceLabel, purchasing, purchased, onPurchase, index = 0 }: ProductCardProps) {
  const Icon = iconMap[product.icon] || ShoppingBag;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.04 * index, ease: "easeOut" }}
      whileTap={{ scale: 0.97 }}
      disabled={!!purchasing || purchased}
      onClick={onPurchase}
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.97]",
        purchased
          ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02]"
          : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/5",
      )}
    >
      {purchased && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -inset-px rounded-2xl ring-1 ring-emerald-500/30 pointer-events-none"
        />
      )}

      <span className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all",
        purchased
          ? "bg-emerald-500/15"
          : "bg-white/[0.06] group-hover:bg-white/[0.09]",
      )}>
        {purchased ? (
          <CheckCircle2 className="size-5 text-emerald-500" />
        ) : purchasing ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <Icon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm font-semibold transition-colors",
          purchased ? "text-emerald-500" : "text-foreground",
        )}>
          {product.name}
        </p>
        <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">
          {product.description}
        </p>
      </div>

      <span className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
        purchased
          ? "bg-emerald-500/15 text-emerald-500"
          : "bg-white/[0.06] text-muted-foreground group-hover:bg-white/[0.1] group-hover:text-foreground",
      )}>
        {purchased ? "Owned" : priceLabel}
      </span>
    </motion.button>
  );
}
