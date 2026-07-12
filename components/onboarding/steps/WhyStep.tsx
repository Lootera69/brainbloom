"use client";

import { motion } from "framer-motion";
import { Sparkles, Flame, Brain, Bird } from "lucide-react";

const cards = [
  {
    icon: Sparkles,
    title: "Grow Beyond",
    description:
      "This isn't about puzzles. It's about expanding how you think, every single day.",
    gradient: "from-primary/20 to-[#8b5cf6]/10",
    iconColor: "text-primary",
  },
  {
    icon: Flame,
    title: "Build Discipline",
    description:
      "A streak isn't just a number — it's proof that you showed up for yourself.",
    gradient: "from-[#f59e0b]/20 to-[#ef4444]/10",
    iconColor: "text-[#f59e0b]",
  },
  {
    icon: Brain,
    title: "Train Your Mind",
    description:
      "Every puzzle rewires the way you approach problems. Sharpen your thinking daily.",
    gradient: "from-secondary/20 to-[#06b6d4]/10",
    iconColor: "text-secondary",
  },
  {
    icon: Bird,
    title: "Your Guide Awaits",
    description:
      "A spirit guide will accompany you through every puzzle. Pick yours when you start.",
    gradient: "from-[#8b5cf6]/20 to-primary/10",
    iconColor: "text-[#8b5cf6]",
  },
];

interface WhyStepProps {
  onNext: () => void;
}

export default function WhyStep({ onNext }: WhyStepProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
            className={`group rounded-2xl border border-white/5 bg-gradient-to-br ${card.gradient} p-4 md:p-5 backdrop-blur-xl transition-all hover:border-white/10`}
          >
            <div className="flex items-start gap-3 md:gap-4">
              <span className={`flex size-9 md:size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ${card.iconColor}`}>
                <card.icon className="size-4 md:size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="mb-0.5 font-heading text-sm font-bold text-foreground md:text-base">
                  {card.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground/70 md:text-sm">
                  {card.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        onClick={onNext}
        className="mt-8 flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl active:scale-[0.98]"
      >
        Next
      </motion.button>
    </div>
  );
}
