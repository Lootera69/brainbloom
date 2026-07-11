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
import { getDailyPuzzle } from "@/services/daily-puzzle";
import { type Puzzle } from "@/types/puzzle";

export default function HomePage() {
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);

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

      <div className="mb-6 grid gap-6 sm:mb-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <DailyGoalCard />
        </div>
        <div className="md:col-span-2">
          <DailyChallengeCard puzzle={dailyPuzzle} loading={dailyLoading} />
        </div>
      </div>

      <DailyRewardChest />

      <DailyQuests />

      <PracticeToHeal />

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
