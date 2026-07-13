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
