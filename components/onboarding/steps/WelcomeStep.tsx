"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(99,102,241,0)",
              "0 0 30px 4px rgba(99,102,241,0.2)",
              "0 0 0 0 rgba(99,102,241,0)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mb-6"
        >
          <span className="flex size-16 md:size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/25">
            <Sparkles className="size-8 md:size-10 text-white" />
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="font-heading bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary bg-clip-text text-4xl font-bold text-transparent sm:text-5xl md:text-6xl"
        >
          BrainBloom
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-4 text-center text-lg text-muted-foreground md:text-xl"
        >
          Your mind deserves to grow
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-2 text-sm text-muted-foreground/50"
        >
          Every journey starts with a single step
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          onClick={onNext}
          className="mt-10 flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
        >
          Begin
        </motion.button>
      </motion.div>
    </div>
  );
}
