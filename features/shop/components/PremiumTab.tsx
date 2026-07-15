"use client";

import { PricingCard } from "@/components/paywall/PricingCard";

interface PremiumTabProps {
  onClose?: () => void;
}

export function PremiumTab({ onClose = () => {} }: PremiumTabProps) {
  return (
    <div className="py-2">
      <PricingCard onClose={onClose} />
    </div>
  );
}
