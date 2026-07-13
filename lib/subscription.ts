export const FREE_TIER_DAILY_LIMIT = 3;
export const PREMIUM_FEATURES = ["unlimited_puzzles", "advanced_analytics", "custom_avatars"] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];
export const ADS_MAX_PER_DAY = 3;
export const REWARDED_AD_HEART_AMOUNT = 1;

export type Tier = "free" | "premium";

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  icon: string;
  category: "gems" | "hearts" | "streak_freeze" | "premium";
  effect: {
    gems?: number;
    hearts?: number;
    streakFreezes?: number;
    tier?: Tier;
    days?: number;
  };
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "gems_100",
    name: "100 Gems",
    description: "A handful of shiny gems",
    priceLabel: "Mock $0.99",
    icon: "Gem",
    category: "gems",
    effect: { gems: 100 },
  },
  {
    id: "gems_500",
    name: "500 Gems",
    description: "A pouch of precious gems",
    priceLabel: "Mock $3.99",
    icon: "Gem",
    category: "gems",
    effect: { gems: 500 },
  },
  {
    id: "gems_1200",
    name: "1200 Gems",
    description: "A treasure chest of gems",
    priceLabel: "Mock $7.99",
    icon: "Gem",
    category: "gems",
    effect: { gems: 1200 },
  },
  {
    id: "heart_refill",
    name: "Heart Refill",
    description: "Restore all 5 hearts instantly",
    priceLabel: "Mock $0.99",
    icon: "Heart",
    category: "hearts",
    effect: { hearts: 5 },
  },
  {
    id: "streak_freeze_3",
    name: "Streak Freeze (3-Pack)",
    description: "Protect your streak 3 times",
    priceLabel: "Mock $1.99",
    icon: "Snowflake",
    category: "streak_freeze",
    effect: { streakFreezes: 3 },
  },
  {
    id: "premium_monthly",
    name: "Premium Monthly",
    description: "Unlimited puzzles & premium features",
    priceLabel: "Mock $4.99",
    icon: "Sparkles",
    category: "premium",
    effect: { tier: "premium", days: 30 },
  },
  {
    id: "premium_yearly",
    name: "Premium Yearly",
    description: "All premium features at a discount",
    priceLabel: "Mock $39.99",
    icon: "Sparkles",
    category: "premium",
    effect: { tier: "premium", days: 365 },
  },
];

export const GEM_HEART_REFILL_COST = 50;
export const GEM_STREAK_FREEZE_COST = 200;

export interface PricingConfig {
  monthlyBase: number;
  monthlyOffer: number;
  monthlyOfferPercent: number;
  yearlyBase: number;
  yearlyOffer: number;
  yearlyOfferPercent: number;
  offerActive: boolean;
  offerLabel: string;
  gems_100: number;
  gems_500: number;
  gems_1200: number;
  heart_refill: number;
  streak_freeze_3: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  monthlyBase: 4.99,
  monthlyOffer: 1.0,
  monthlyOfferPercent: 80,
  yearlyBase: 39.99,
  yearlyOffer: 10.0,
  yearlyOfferPercent: 75,
  offerActive: true,
  offerLabel: "Launch Special",
  gems_100: 0.99,
  gems_500: 3.99,
  gems_1200: 7.99,
  heart_refill: 0.99,
  streak_freeze_3: 1.99,
};

export type ProductPriceKey = "gems_100" | "gems_500" | "gems_1200" | "heart_refill" | "streak_freeze_3";

export function getProductPriceLabel(productId: string, config: PricingConfig): string {
  const key = productId as ProductPriceKey;
  const price = config[key];
  if (typeof price === "number") {
    return `Mock $${price.toFixed(2)}`;
  }
  const product = SHOP_PRODUCTS.find((p) => p.id === productId);
  return product?.priceLabel ?? "Mock $0.00";
}

export interface PremiumBenefit {
  icon: string;
  title: string;
  description: string;
}

export const PREMIUM_BENEFITS: PremiumBenefit[] = [
  { icon: "Infinity", title: "Unlimited Puzzles", description: "No daily cap — play as much as you want" },
  { icon: "Heart", title: "Unlimited Hearts", description: "Never run out of hearts again" },
  { icon: "Sparkles", title: "Premium Avatars", description: "Exclusive Dragon, Phoenix & Griffin" },
  { icon: "Crown", title: "VIP Profile", description: "Golden card, crown badge, animated avatar border & shimmer" },
  { icon: "Zap", title: "2x XP Boost", description: "Level up twice as fast" },
  { icon: "Ban", title: "Ad-Free", description: "No ads, no interruptions" },
];
