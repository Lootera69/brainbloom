import {
  categories,
  dailyChallenge,
} from "@/constants/home";

import { DailyChallengeCard } from "@/features/home/components/DailyChallengeCard";
import { CategoryCard } from "@/features/home/components/CategoryCard";
import { StreakBar } from "@/features/home/components/StreakBar";
import { ContinueLearning } from "@/features/home/components/ContinueLearning";
import { RecentActivity } from "@/features/home/components/RecentActivity";
import { DailyGoalCard } from "@/features/home/components/DailyGoalCard";
import { DailyRewardChest } from "@/features/home/components/DailyRewardChest";
import { LeaderboardCard } from "@/features/home/components/LeaderboardCard";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { DailyQuests } from "@/features/home/components/DailyQuests";
import { PracticeToHeal } from "@/features/home/components/PracticeToHeal";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:p-6">
      <StreakBar />

      <DailyGoalCard />
      <DailyRewardChest />

      <DailyQuests />

      <PracticeToHeal />

      <section className="mb-8 sm:mb-10">
        <DailyChallengeCard {...dailyChallenge} />
      </section>

      <div className="mb-8 sm:mb-10">
        <ContinueLearning />
      </div>

      <section className="mb-8 sm:mb-10">
        <SectionHeader title="Explore Categories" subtitle="Pick a category to start learning" />

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, i) => (
            <CategoryCard
              key={category.id}
              {...category}
              index={i}
            />
          ))}
        </div>
      </section>

      <RecentActivity />

      <LeaderboardCard />
    </main>
  );
}
