import { FREE_TIER_DAILY_LIMIT } from "@/lib/subscription";

export type Tier = "free" | "premium";

export function dailyCount(playedToday: number, playedDate: string | null, today: string): number {
  return playedDate === today ? playedToday : 0;
}

export function remainingFreePlays(
  playedToday: number,
  playedDate: string | null,
  today: string,
): number {
  return Math.max(0, FREE_TIER_DAILY_LIMIT - dailyCount(playedToday, playedDate, today));
}

export function canPlayPuzzleFree(
  playedToday: number,
  playedDate: string | null,
  today: string,
): boolean {
  return dailyCount(playedToday, playedDate, today) < FREE_TIER_DAILY_LIMIT;
}

export function isPremiumActive(tier: Tier, subscriptionExpiry: number | null): boolean {
  return tier === "premium" && (!subscriptionExpiry || Date.now() < subscriptionExpiry);
}
