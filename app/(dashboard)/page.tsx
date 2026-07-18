"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  categories,
} from "@/constants/home";

import { DailyChallengeCard } from "@/features/home/components/DailyChallengeCard";
import { CategoryCard } from "@/features/home/components/CategoryCard";
import { StreakBar } from "@/features/home/components/StreakBar";
import { ContinueLearning } from "@/features/home/components/ContinueLearning";
import { RecentActivity } from "@/features/home/components/RecentActivity";
import { DailyGoalCard } from "@/features/home/components/DailyGoalCard";
import { DailyRewardChest } from "@/features/home/components/DailyRewardChest";
import { WeeklyInsights } from "@/features/home/components/WeeklyInsights";
import { LeaderboardCard } from "@/features/home/components/LeaderboardCard";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { DailyQuests } from "@/features/home/components/DailyQuests";
import { PracticeToHeal } from "@/features/home/components/PracticeToHeal";
import { WeeklyCipherCard } from "@/features/home/components/WeeklyCipherCard";
import { getDailyPuzzle } from "@/services/daily-puzzle";
import { motion } from "framer-motion";
import { Play, Heart, Sparkles } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { AdModal } from "@/components/paywall/AdModal";
import { type Puzzle } from "@/types/puzzle";
import { hasPremiumAccess } from "@/services/entitlement-service";

export default function HomePage() {
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);
  const hearts = useUserStore((s) => s.hearts);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const useHeart = useUserStore((s) => s.useHeart);
  const canWatchAd = useUserStore((s) => s.canWatchAd);
  const incrementAdWatched = useUserStore((s) => s.incrementAdWatched);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);

  useEffect(() => {
    (async () => {
      const puzzle = await getDailyPuzzle();
      setDailyPuzzle(puzzle);
      setDailyLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:p-6">
      <StreakBar />

      <DailyRewardChest />

      <div className="mb-6 grid gap-6 sm:mb-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <DailyGoalCard />
        </div>
        <div className="md:col-span-2">
          <DailyChallengeCard puzzle={dailyPuzzle} loading={dailyLoading} />
        </div>
      </div>

      <div className="mb-6">
        <WeeklyCipherCard />
      </div>

      <DailyQuests />

      <PracticeToHeal />

      {!isPremium && hearts < 5 && canWatchAd() && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowAd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/10 active:scale-[0.98]"
          >
            <Play className="size-4" />
            Watch an Ad for 1 Free Heart
            <Heart className="size-4 fill-rose-400 text-rose-400" />
          </button>
        </motion.div>
      )}

      {showAd && (
        <AdModal
          onComplete={(rewarded) => {
            setShowAd(false);
            if (rewarded) {
              incrementAdWatched();
              useHeart();
            }
          }}
          onClose={() => setShowAd(false)}
        />
      )}

      <div className="mb-8 sm:mb-10">
        <Link href="/learn">
          <ContinueLearning />
        </Link>
      </div>

      <section className="mb-8 sm:mb-10">
        <SectionHeader title="Explore Categories" subtitle="Pick a category to start learning" />

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, i) => (
            <Link key={category.id} href={`/learn?category=${category.id}`}>
              <CategoryCard
                {...category}
                index={i}
              />
            </Link>
          ))}
        </div>
      </section>

      <RecentActivity />

      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <LeaderboardCard />
        </div>
        <div className="md:col-span-2">
          <WeeklyInsights compact />
        </div>
      </div>
    </main>
  );
}
