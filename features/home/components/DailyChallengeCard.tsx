"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  description: string;
  xp: number;
}

export function DailyChallengeCard({
  title,
  description,
  xp,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 16 }}
    >
      <div className="glow-primary group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.06)_50%,transparent_75%)] bg-[length:250%_250%] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -right-12 size-44 rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-10 -left-10 size-36 rounded-full bg-white/5 blur-2xl"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 right-1/4 size-24 rounded-full bg-white/5 blur-xl"
        />

        <div className="relative">
          <div className="mb-4 flex items-center gap-3 sm:mb-5">
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
              className="glass-tint flex size-11 items-center justify-center rounded-xl sm:size-12"
            >
              <Brain className="size-6 sm:size-7" />
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-tint flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            >
              <Sparkles className="size-3" />
              Bonus XP
            </motion.span>
          </div>

          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="font-heading text-xl font-bold sm:text-2xl"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-2 text-sm text-white/80 sm:text-base"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-4 flex items-center gap-1.5 text-sm text-white/70 sm:mt-5"
          >
            <Zap className="size-4" />
            <span>+{xp} XP today</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button className="glass-tint mt-5 h-11 rounded-xl px-6 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/25 hover:shadow-lg active:scale-[0.95] sm:mt-6 sm:h-12 sm:px-8">
              Start Challenge
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
