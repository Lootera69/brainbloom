"use client";

import { useUserStore } from "@/store/user-store";
import { hasPremiumAccess } from "@/services/entitlement-service";
import { cn } from "@/lib/utils";
import { Gem, Sparkles, Brain, Heart, Trophy, Zap, Crown, Star, Target, Lightbulb } from "lucide-react";

interface AdBannerProps {
  className?: string;
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
}

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

const sampleAds = [
  {
    icon: Brain,
    title: "Sharpen Your Mind Daily",
    description: "Join thousands training with puzzles, riddles, and brain teasers.",
    cta: "Start Free",
    color: "from-primary/20 to-purple-500/20",
    iconColor: "text-primary",
  },
  {
    icon: Trophy,
    title: "Challenge Your Friends",
    description: "Compete on leaderboards and prove your puzzle-solving skills.",
    cta: "Play Now",
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Sparkles,
    title: "Unlock Premium Features",
    description: "Unlimited puzzles, ad-free experience, and exclusive content.",
    cta: "Go Premium",
    color: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-500",
  },
  {
    icon: Heart,
    title: "Train Your Memory",
    description: "Science-backed exercises to boost cognitive function.",
    cta: "Learn More",
    color: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-500",
  },
  {
    icon: Zap,
    title: "Daily Brain Training",
    description: "Just 5 minutes a day for a sharper, faster mind.",
    cta: "Try Free",
    color: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-500",
  },
  {
    icon: Target,
    title: "Solve Crosswords & More",
    description: "Hundreds of puzzles across multiple difficulty levels.",
    cta: "Explore",
    color: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Lightbulb,
    title: "Riddles That Challenge",
    description: "Think outside the box with our curated riddle collection.",
    cta: "Solve Now",
    color: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-500",
  },
  {
    icon: Crown,
    title: "Premium Membership",
    description: "Ad-free experience with unlimited access to all features.",
    cta: "Upgrade",
    color: "from-amber-400/20 to-yellow-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Star,
    title: "Achievements Await",
    description: "Unlock badges and track your cognitive growth journey.",
    cta: "View Progress",
    color: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-500",
  },
  {
    icon: Gem,
    title: "Earn Gems & Rewards",
    description: "Complete puzzles to earn gems for hearts and streak freezes.",
    cta: "Start Earning",
    color: "from-cyan-400/20 to-teal-500/20",
    iconColor: "text-cyan-400",
  },
];

function SampleAdBanner({ className }: { className?: string }) {
  const adIndex = Math.floor(Math.random() * sampleAds.length);
  const ad = sampleAds[adIndex];
  const Icon = ad.icon;

  return (
    <div className={cn("my-6 flex w-full justify-center overflow-hidden", className)}>
      <div className="relative w-full max-w-[728px] overflow-hidden rounded-xl border border-border/30 bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20 p-4 sm:p-5">
        {/* Ad label */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Ad
          </span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary/60">
            Sample
          </span>
        </div>

        {/* Ad content */}
        <div className="flex items-center gap-4 pt-6">
          <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", ad.color)}>
            <Icon className={cn("size-6", ad.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">{ad.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground/70 line-clamp-1">{ad.description}</p>
          </div>
          <button className="shrink-0 rounded-lg bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
            {ad.cta}
          </button>
        </div>

        {/* Subtle pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>
    </div>
  );
}

export function AdBanner({ className, slot, format = "auto" }: AdBannerProps) {
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);

  if (isPremium) return null;

  // If we have a real AdSense ID and slot, show real ad
  if (adsenseId && slot) {
    return (
      <div className={cn("my-6 flex w-full justify-center overflow-hidden", className)}>
        <ins
          className="adsbygoogle"
          style={{ display: "block", maxWidth: "100%" }}
          data-ad-client={adsenseId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Otherwise show sample ad placeholder
  return <SampleAdBanner className={className} />;
}
