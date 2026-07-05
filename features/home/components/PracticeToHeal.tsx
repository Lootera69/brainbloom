"use client";

import { motion } from "framer-motion";
import { Heart, RotateCcw } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export function PracticeToHeal() {
  const hearts = useUserStore((s) => s.hearts);
  const usePracticeHeart = useUserStore((s) => s.usePracticeHeart);
  const practiceHeartsToday = useUserStore((s) => s.practiceHeartsToday);
  const lastPracticeDate = useUserStore((s) => s.lastPracticeDate);
  const addXp = useUserStore((s) => s.addXp);
  const logActivity = useUserStore((s) => s.logActivity);

  const today = typeof window !== "undefined" ? new Date().toDateString() : "";
  const practicesUsed = lastPracticeDate === today ? practiceHeartsToday : 0;
  const practicesLeft = 3 - practicesUsed;
  const show = hearts < 5 && practicesLeft > 0;

  if (!show) return null;

  const handlePractice = () => {
    usePracticeHeart();
    addXp(10);
    logActivity({
      type: "challenge",
      category: "practice",
      title: "Practice session",
      xp: 10,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 sm:mb-10"
    >
      <GlassCard intensity="light" className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <Heart className="size-5 text-destructive" />
            </span>
            <div>
              <p className="text-sm font-medium">Practice to restore hearts</p>
              <p className="text-xs text-muted-foreground">
                {hearts}/5 hearts &middot; {practicesLeft} practice{practicesLeft !== 1 ? "es" : ""} left today
              </p>
            </div>
          </div>

          <Button
            onClick={handlePractice}
            size="sm"
            className="h-9 shrink-0 gap-1.5"
          >
            <RotateCcw className="size-4" />
            Practice (+10 XP)
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
