"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  categories,
} from "@/constants/home";

import { DailySetCard } from "@/features/home/components/DailySetCard";
import { CategoryCard } from "@/features/home/components/CategoryCard";
import { StreakBar } from "@/features/home/components/StreakBar";
import { ContinueLearning } from "@/features/home/components/ContinueLearning";
import { RecentActivity } from "@/features/home/components/RecentActivity";
import { DailyRewardChest } from "@/features/home/components/DailyRewardChest";
import { WeeklyInsights } from "@/features/home/components/WeeklyInsights";
import { LeaderboardCard } from "@/features/home/components/LeaderboardCard";
import { SectionHeader } from "@/features/home/components/SectionHeader";
import { DailyQuests } from "@/features/home/components/DailyQuests";
import { WeeklyCipherCard } from "@/features/home/components/WeeklyCipherCard";
import { getDailySet } from "@/services/daily-set";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { type Puzzle } from "@/types/puzzle";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { EventBanner } from "@/features/home/components/EventBanner";
import { EventAmbientLayer } from "@/features/home/components/EventAmbientLayer";
import { EventSpecialPuzzle } from "@/features/home/components/EventSpecialPuzzle";
import { EventStringLights } from "@/features/home/components/EventStringLights";
import { EventCornerDecor } from "@/features/home/components/EventCornerDecor";
import { fromArgb, rgba, type Rgba } from "@/lib/events/event-colors";

export default function HomePage() {
  const [dailySet, setDailySet] = useState<Puzzle[]>([]);
  const uid = useUserStore((state) => state.userId);
  const [dailySetError, setDailySetError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [dailySetLoading, setDailySetLoading] = useState(true);
  const [dailySetCategories, setDailySetCategories] = useState<string[]>([]);

  // Active Moment palette recolours the ambient aurora when a seasonal event is
  // live; falls back to the default violet/pink (light) & indigo/fuchsia (dark).
  const { palette } = useActiveMoment();
  const orb = (core: Rgba, mid: Rgba, a1: number, a2: number) =>
    `radial-gradient(circle, ${rgba(core, a1)}, ${rgba(mid, a2)}, transparent 70%)`;
  const acc = palette ? fromArgb(palette.accent) : null;
  const o1 = palette ? fromArgb(palette.orb1) : null;
  const o3 = palette ? fromArgb(palette.orb3) : null;
  const bTo = palette ? fromArgb(palette.bannerTo) : null;
  const lightOrb1 = acc && o1 ? orb(acc, o1, 0.35, 0.15)
    : "radial-gradient(circle, rgba(167,139,250,0.35), rgba(139,92,246,0.15), transparent 70%)";
  const lightOrb2 = bTo && o3 ? orb(bTo, o3, 0.3, 0.12)
    : "radial-gradient(circle, rgba(244,114,182,0.3), rgba(236,72,153,0.12), transparent 70%)";
  const darkOrb1 = acc && o1 ? orb(acc, o1, 0.5, 0.22)
    : "radial-gradient(circle, rgba(99,102,241,0.5), rgba(79,70,229,0.22), transparent 70%)";
  const darkOrb2 = bTo && o3 ? orb(bTo, o3, 0.42, 0.18)
    : "radial-gradient(circle, rgba(217,70,239,0.42), rgba(168,85,247,0.18), transparent 70%)";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDailySetLoading(true);
      setDailySetError(null);
      try {
        const set = await getDailySet(dailySetCategories);
        if (!cancelled) setDailySet(set);
      } catch (error) {
        if (!cancelled) setDailySetError(error instanceof Error ? error.message : 'Connect and retry.');
      } finally {
        if (!cancelled) setDailySetLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dailySetCategories, uid, retry]);

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Animated aurora mesh — light mode only */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden dark:hidden">
        <motion.div
          animate={{ y: [0, -40, 0], x: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-48 -left-48 size-[600px] rounded-full opacity-70 blur-[50px]"
          style={{ background: lightOrb1 }}
        />
        <motion.div
          animate={{ y: [0, 35, 0], x: [0, -25, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-40 size-[500px] rounded-full opacity-60 blur-[45px]"
          style={{ background: lightOrb2 }}
        />
      </div>

      {/* Animated aurora mesh — dark mode: jewel-toned ambient light on near-black */}
      <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden dark:block">
        <motion.div
          animate={{ y: [0, -45, 0], x: [0, 35, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-52 -left-52 size-[640px] rounded-full opacity-70 blur-[55px]"
          style={{ background: darkOrb1 }}
        />
        <motion.div
          animate={{ y: [0, 40, 0], x: [0, -30, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 23, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-44 -right-44 size-[540px] rounded-full opacity-60 blur-[50px]"
          style={{ background: darkOrb2 }}
        />
        {/* Top vignette for OLED depth */}
        <div
          className="absolute inset-x-0 top-0 h-64"
          style={{ background: "linear-gradient(to bottom, rgba(7,7,10,0.9), transparent)" }}
        />
      </div>

      {/* Event "Moments" ambient particle field — behind cards, above the orbs. */}
      <EventAmbientLayer />

      <div className="relative">
        <StreakBar />
        <EventStringLights />
      </div>

      <EventBanner />

      <DailyRewardChest />

      <EventSpecialPuzzle />

      <div className="mb-6 sm:mb-8">
        {dailySetError && <div role="alert" className="mb-3 rounded-xl border p-3 text-sm">
          <p>{dailySetError}</p><button className="mt-2 font-semibold text-primary" onClick={() => setRetry((value) => value + 1)}>Retry Daily Set</button>
        </div>}
        <DailySetCard
          set={dailySet}
          loading={dailySetLoading}
          categories={dailySetCategories}
          onCategoriesChange={setDailySetCategories}
        />
      </div>

      <div className="mb-6">
        <WeeklyCipherCard />
      </div>

      <DailyQuests />

      <div className="mb-8 sm:mb-10">
        <ContinueLearning />
      </div>

      <section className="mb-8 sm:mb-10">
        <SectionHeader
          title="Explore Categories"
          subtitle="Pick a category to start learning"
          action={
            <Link
              href="/learn"
              className="group flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:text-foreground hover:shadow-md dark:border-white/[0.06] dark:bg-white/[0.03]"
            >
              See all
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {categories.filter((category) => category.id !== "wonders").map((category, i) => (
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

      {/* Event "Moments" signature corner flourish — on top, scrolls with content. */}
      <EventCornerDecor />
    </main>
  );
}
