"use client";

import type { PremiumFeature, Tier } from "@/lib/subscription";

function isExpired(expiry: number | null): boolean {
  if (expiry === null) return false;
  return Date.now() > expiry;
}

export function hasPremiumAccess(tier: Tier, subscriptionExpiry: number | null): boolean {
  if (tier !== "premium") return false;
  return !isExpired(subscriptionExpiry);
}

export function canAccessFeature(
  tier: Tier,
  subscriptionExpiry: number | null,
  feature: PremiumFeature,
): boolean {
  return hasPremiumAccess(tier, subscriptionExpiry);
}

export function daysRemaining(subscriptionExpiry: number | null): number {
  if (!subscriptionExpiry) return 0;
  const diff = subscriptionExpiry - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export function formatExpiry(subscriptionExpiry: number | null): string {
  const days = daysRemaining(subscriptionExpiry);
  if (days === 0) return "Expired";
  if (days === 1) return "1 day";
  return `${days} days`;
}
