"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Sparkles, Infinity, Heart, Crown, BarChart3, Zap, Ban, Gem, Loader2,
} from "lucide-react";
import { PREMIUM_BENEFITS, type PricingConfig } from "@/lib/subscription";
import { getPricingConfig } from "@/services/pricing-service";
import { purchaseProduct } from "@/services/purchase-service";
import { useUserStore } from "@/store/user-store";
import { hasPremiumAccess } from "@/services/entitlement-service";
import { toast } from "sonner";

const benefitIconMap: Record<string, typeof Infinity> = {
  Infinity, Heart, Sparkles, Crown, Frame: Crown, BarChart3, Zap, Ban,
};

interface PricingCardProps {
  onClose: () => void;
}

export function PricingCard({ onClose }: PricingCardProps) {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const setTier = useUserStore((s) => s.setTier);
  const alreadyPremium = hasPremiumAccess(tier, subscriptionExpiry);

  useEffect(() => {
    getPricingConfig().then(setPricing);
  }, []);

  const handlePurchase = useCallback(async () => {
    const id = plan === "monthly" ? "premium_monthly" : "premium_yearly";
    if (purchasing) return;
    setPurchasing(id);

    const result = await purchaseProduct(id);
    if (!result.success) {
      toast.error("Purchase failed. Please try again.", { position: "top-center" });
      setPurchasing(null);
      return;
    }

    const days = plan === "monthly" ? 30 : 365;
    const expiry = Date.now() + days * 86400000;
    setTier("premium", expiry);
    toast.success("Welcome to Premium! 🎉", { position: "top-center" });
    setPurchasing(null);
    onClose();
  }, [plan, purchasing, setTier, onClose]);

  if (!pricing) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (alreadyPremium) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="flex size-16 items-center justify-center rounded-full bg-amber-500/20"
        >
          <Crown className="size-8 text-amber-400" />
        </motion.span>
        <h3 className="font-heading text-xl font-bold">You&apos;re a Premium Member!</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Enjoy all the benefits of your membership. Thank you for supporting BrainBloom!
        </p>
        <button
          onClick={onClose}
          className="mt-2 h-11 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground"
        >
          Continue
        </button>
      </div>
    );
  }

  const offerPrice = plan === "monthly" ? pricing.monthlyOffer : pricing.yearlyOffer;
  const basePrice = plan === "monthly" ? pricing.monthlyBase : pricing.yearlyBase;
  const displayPrice = pricing.offerActive ? offerPrice : basePrice;
  const computedPercentOff = (bp: number, op: number) => Math.round((1 - op / bp) * 100);
  const percentOff = computedPercentOff(basePrice, offerPrice);
  const monthlyPercentOff = computedPercentOff(pricing.monthlyBase, pricing.monthlyOffer);
  const yearlyPercentOff = computedPercentOff(pricing.yearlyBase, pricing.yearlyOffer);
  const savings = basePrice - offerPrice;
  const formattedSavings = savings < 1 ? `${Math.round(savings * 100)}¢` : `$${savings.toFixed(2)}`;

  const perMonthPrice = plan === "yearly" ? (displayPrice / 12).toFixed(2) : null;

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Offer badge */}
      {pricing.offerActive && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mx-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-4 py-1.5"
        >
          <Sparkles className="size-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">
            {pricing.offerLabel} &middot; Save {formattedSavings}
          </span>
        </motion.div>
      )}

      {/* Plan toggle */}
      <div className="relative mx-auto flex rounded-xl bg-muted p-1">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold transition-colors ${
              plan === p ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "monthly" ? "Monthly" : "Yearly"}
            {pricing.offerActive && p !== plan && (
              <span className="ml-1 text-[10px] text-emerald-500">
                Save {p === "monthly" ? monthlyPercentOff : yearlyPercentOff}%
              </span>
            )}
          </button>
        ))}
        <motion.div
          layoutId="plan-pill"
          className="absolute inset-y-1 rounded-lg bg-card shadow-sm"
          style={{ left: plan === "monthly" ? 4 : "50%", width: "calc(50% - 8px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>

      {/* Price display */}
      <motion.div
        key={plan}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-baseline justify-center gap-2">
          {pricing.offerActive && (
            <span className="text-2xl font-bold text-muted-foreground line-through decoration-destructive">
              ${basePrice.toFixed(2)}
            </span>
          )}
          <span className="text-5xl font-extrabold tracking-tight">
            ${displayPrice.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">{plan === "monthly" ? "/mo" : "/yr"}</span>
        </div>
        {perMonthPrice && (
          <p className="mt-1 text-xs text-muted-foreground">
            ${perMonthPrice}/month — billed annually
          </p>
        )}
        {pricing.offerActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1"
          >
            <span className="text-[11px] font-bold text-emerald-500">{percentOff}% OFF</span>
          </motion.div>
        )}
      </motion.div>

      {/* Benefits list */}
      <div className="space-y-2">
        {PREMIUM_BENEFITS.map((benefit, i) => {
          const Icon = benefitIconMap[benefit.icon] || Sparkles;
          return (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.03 }}
              className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-2.5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Icon className="size-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{benefit.title}</p>
                <p className="text-[11px] text-muted-foreground">{benefit.description}</p>
              </div>
              <CheckCircle2 className="ml-auto size-4 shrink-0 text-emerald-500" />
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        disabled={!!purchasing}
        onClick={handlePurchase}
        className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-base font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
      >
        {purchasing ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <>
            <Sparkles className="size-5" />
            {pricing.offerActive
              ? `Get Premium — $${offerPrice.toFixed(2)}`
              : `Subscribe — $${displayPrice.toFixed(2)}`}
          </>
        )}
        {!purchasing && (
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
            animate={{ left: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        )}
      </motion.button>
    </div>
  );
}
