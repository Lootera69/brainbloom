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
import { REWARDED_AD_HEART_AMOUNT } from "@/lib/subscription";

export default function HomePage() {
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);
  const hearts = useUserStore((s) => s.hearts);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
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
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Animated aurora mesh — light mode only */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden dark:hidden">
        <motion.div
          animate={{
            y: [0, -40, 0],
            x: [0, 30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-48 -left-48 size-[600px] rounded-full opacity-70 blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.35), rgba(139,92,246,0.15), transparent 70%)" }}
        />
        <motion.div
          animate={{
            y: [0, 35, 0],
            x: [0, -25, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-40 size-[500px] rounded-full opacity-60 blur-[90px]"
          style={{ background: "radial-gradient(circle, rgba(244,114,182,0.3), rgba(236,72,153,0.12), transparent 70%)" }}
        />
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, -15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[40%] left-[30%] size-[350px] rounded-full opacity-50 blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.2), rgba(6,182,212,0.08), transparent 70%)" }}
        />
        <motion.div
          animate={{
            y: [0, 25, 0],
            x: [0, 20, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 8 }}
          className="absolute top-[60%] right-[20%] size-[280px] rounded-full opacity-40 blur-[70px]"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.2), rgba(245,158,11,0.08), transparent 70%)" }}
        />
      </div>

      {/* Animated aurora mesh — dark mode: jewel-toned ambient light on near-black */}
      <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden dark:block">
        {/* Deep indigo orb, top-left */}
        <motion.div
          animate={{ y: [0, -45, 0], x: [0, 35, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-52 -left-52 size-[640px] rounded-full opacity-70 blur-[110px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5), rgba(79,70,229,0.22), transparent 70%)" }}
        />
        {/* Royal magenta orb, bottom-right */}
        <motion.div
          animate={{ y: [0, 40, 0], x: [0, -30, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 23, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-44 -right-44 size-[540px] rounded-full opacity-60 blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(217,70,239,0.42), rgba(168,85,247,0.18), transparent 70%)" }}
        />
        {/* Cyan accent orb, center-left */}
        <motion.div
          animate={{ y: [0, -24, 0], x: [0, -18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[38%] left-[28%] size-[380px] rounded-full opacity-45 blur-[90px]"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.32), rgba(6,182,212,0.12), transparent 70%)" }}
        />
        {/* Gold shimmer orb, lower-right — the royal touch */}
        <motion.div
          animate={{ y: [0, 28, 0], x: [0, 22, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 21, repeat: Infinity, ease: "easeInOut", delay: 8 }}
          className="absolute top-[58%] right-[18%] size-[300px] rounded-full opacity-40 blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.28), rgba(245,158,11,0.1), transparent 70%)" }}
        />
        {/* Top vignette for OLED depth */}
        <div
          className="absolute inset-x-0 top-0 h-64"
          style={{ background: "linear-gradient(to bottom, rgba(7,7,10,0.9), transparent)" }}
        />
      </div>

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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/5 dark:to-pink-500/5 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400 transition-all hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-500/10 dark:hover:to-pink-500/10 active:scale-[0.98] shadow-sm"
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
              useUserStore.setState((s) => ({ hearts: Math.min(5, s.hearts + REWARDED_AD_HEART_AMOUNT) }));
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
