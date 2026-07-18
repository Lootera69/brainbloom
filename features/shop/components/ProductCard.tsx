"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Gem, Heart, Snowflake, Sparkles, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopProduct } from "@/lib/subscription";

const iconMap: Record<string, typeof Gem> = {
  Gem, Heart, Snowflake, Sparkles, ShoppingBag,
};

type ParticleType = "hearts" | "snowflakes" | "gems";
type ParticleIntensity = "subtle" | "medium" | "energetic";

interface ProductCardProps {
  product: ShopProduct;
  priceLabel: string;
  purchasing: boolean;
  purchased: boolean;
  onPurchase: () => void;
  index?: number;
  particleType?: ParticleType;
  particleCount?: number;
  particleIntensity?: ParticleIntensity;
}

const particleIcons: Record<ParticleType, typeof Heart> = {
  hearts: Heart,
  snowflakes: Snowflake,
  gems: Gem,
};

const particleColors: Record<ParticleType, string> = {
  hearts: "text-rose-400",
  snowflakes: "text-blue-400",
  gems: "text-cyan-400",
};

const defaultCounts: Record<ParticleType, number> = {
  hearts: 3,
  snowflakes: 3,
  gems: 4,
};

const intensityConfig: Record<ParticleIntensity, { rise: number; spread: number; speed: number; scalePeak: number }> = {
  subtle: { rise: 70, spread: 6, speed: 4.5, scalePeak: 1.0 },
  medium: { rise: 110, spread: 10, speed: 3.8, scalePeak: 1.15 },
  energetic: { rise: 150, spread: 14, speed: 3.0, scalePeak: 1.3 },
};

const MAX_PARTICLES = 15;

function generateParticles(type: ParticleType, countOverride?: number) {
  const count = Math.max(0, Math.min(countOverride ?? defaultCounts[type], MAX_PARTICLES));
  return Array.from({ length: count }).map((_, i) => ({
    x: 10 + (i * 24 + i * i * 7) % 80,
    delay: i * 0.6 + (i % 4) * 0.15,
    size: 10 + (i % 3) * 2,
    duration: 4 + (i % 4) * 0.5,
    drift: (i % 5) - 2,
  }));
}

function getAnimation(type: ParticleType, intensity: ParticleIntensity) {
  const cfg = intensityConfig[intensity];
  switch (type) {
    case "hearts":
      return {
        y: [0, -(cfg.rise + 20)],
        scale: [0.6, cfg.scalePeak * 1.0, 0.8],
      };
    case "snowflakes":
      return {
        y: [0, cfg.rise * 0.5],
        rotate: [0, 360],
        scale: [0.5, cfg.scalePeak * 0.85, 0.7],
      };
    case "gems":
      return {
        y: [0, -cfg.rise],
        scale: [0.3, cfg.scalePeak, 0.4],
      };
  }
}

export function ProductCard({ product, priceLabel, purchasing, purchased, onPurchase, index = 0, particleType, particleCount, particleIntensity = "medium" }: ProductCardProps) {
  const Icon = iconMap[product.icon] || ShoppingBag;

  const particles = useMemo(() => {
    if (!particleType) return [];
    return generateParticles(particleType, particleCount);
  }, [particleType, particleCount]);

  const ParticleIcon = particleType ? particleIcons[particleType] : null;
  const particleColor = particleType ? particleColors[particleType] : "";
  const animConfig = useMemo(() => {
    if (!particleType) return null;
    return getAnimation(particleType, particleIntensity);
  }, [particleType, particleIntensity]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.04 * index, ease: "easeOut" }}
      whileTap={{ scale: 0.97 }}
      disabled={!!purchasing || purchased}
      onClick={onPurchase}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.97]",
        purchased
          ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02]"
          : "border-border/30 bg-muted/20 hover:border-border/60 hover:bg-muted/40 hover:shadow-lg hover:shadow-black/5 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.06]",
      )}
    >
      {particleType && animConfig && (
        <>
          {particles.map((p, i) => (
            <motion.span
              key={i}
              className={`pointer-events-none absolute ${particleColor}`}
              style={{
                left: `${p.x}%`,
                bottom: particleType === "snowflakes" ? "60%" : 0,
                top: particleType === "snowflakes" ? "auto" : undefined,
              }}
              animate={{
                ...animConfig,
                x: [0, p.drift * intensityConfig[particleIntensity].spread],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: particleType === "snowflakes" ? "linear" : "easeOut",
              }}
            >
              {ParticleIcon && <ParticleIcon size={p.size} />}
            </motion.span>
          ))}
        </>
      )}

      {purchased && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -inset-px rounded-2xl ring-1 ring-emerald-500/30 pointer-events-none"
        />
      )}

      <span className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all z-10",
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

      <div className="min-w-0 flex-1 z-10">
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
        "z-10 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
        purchased
          ? "bg-emerald-500/15 text-emerald-500"
          : "bg-white/[0.06] text-muted-foreground group-hover:bg-white/[0.1] group-hover:text-foreground",
      )}>
        {purchased ? "Owned" : priceLabel}
      </span>
    </motion.button>
  );
}
