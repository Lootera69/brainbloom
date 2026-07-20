"use client";

import { useUserStore } from "@/store/user-store";
import { hasPremiumAccess } from "@/services/entitlement-service";
import { cn } from "@/lib/utils";

interface AdBannerProps {
  className?: string;
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
}

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

export function AdBanner({ className, slot, format = "auto" }: AdBannerProps) {
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);

  if (isPremium || !adsenseId) return null;

  return (
    <div className={cn("my-6 flex justify-center", className)}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseId}
        data-ad-slot={slot ?? undefined}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
