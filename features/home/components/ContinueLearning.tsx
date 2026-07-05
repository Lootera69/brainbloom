"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { categories } from "@/constants/home";
import { GlassCard } from "@/components/ui/glass-card";

export function ContinueLearning() {
  const lastPlayedCategory = useUserStore((s) => s.lastPlayedCategory);

  if (!lastPlayedCategory) return null;

  const category = categories.find((c) => c.id.toString() === lastPlayedCategory);
  if (!category) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 18 }}
    >
      <GlassCard
        tint={category.color}
        hover
        className="group cursor-pointer rounded-2xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex size-12 items-center justify-center rounded-xl backdrop-blur-sm sm:size-14"
              style={{ backgroundColor: `${category.color}18` }}
            >
              <Play className="size-5 sm:size-6" style={{ color: category.color }} />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Continue Learning</p>
              <p className="font-heading text-base font-semibold sm:text-lg">
                {category.title}
              </p>
            </div>
          </div>
          <ArrowRight className="size-5 text-muted-foreground transition-all group-hover:translate-x-0.5" />
        </div>
      </GlassCard>
    </motion.div>
  );
}
