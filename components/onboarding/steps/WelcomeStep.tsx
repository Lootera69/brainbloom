"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { playRiddleReveal } from "@/services/sound-service";

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  const [sprouted, setSprouted] = useState(false);

  const handleSprout = () => {
    if (sprouted) return;
    setSprouted(true);
    try { playRiddleReveal(); } catch { /* no-op */ }
    // Give the sprout animation a beat before advancing.
    setTimeout(onNext, 1250);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground/50"
      >
        Welcome to
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        className="font-heading bg-gradient-to-r from-primary via-[#8b5cf6] to-secondary bg-clip-text text-5xl font-bold text-transparent sm:text-6xl"
      >
        BrainBloom
      </motion.h1>

      {/* Interactive seed → sprout */}
      <div className="relative mt-12 flex h-44 w-44 items-center justify-center">
        {/* Soil glow ring */}
        <motion.div
          className="absolute bottom-2 h-3 w-28 rounded-full bg-primary/20 blur-md"
          animate={{ opacity: sprouted ? [0.4, 0.7, 0.4] : 0.3, scaleX: sprouted ? 1.2 : 1 }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <svg viewBox="0 0 120 140" className="h-full w-full overflow-visible">
          {/* Stem */}
          <motion.path
            d="M60 128 C 60 108, 58 96, 60 78"
            fill="none"
            stroke="url(#stemGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={sprouted ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {/* Left leaf */}
          <motion.path
            d="M60 104 C 44 100, 36 88, 42 80 C 52 82, 60 92, 60 104 Z"
            fill="url(#leafGrad)"
            initial={{ scale: 0, opacity: 0 }}
            animate={sprouted ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }}
            style={{ transformOrigin: "60px 100px" }}
          />
          {/* Right leaf */}
          <motion.path
            d="M60 110 C 76 106, 84 94, 78 86 C 68 88, 60 98, 60 110 Z"
            fill="url(#leafGrad)"
            initial={{ scale: 0, opacity: 0 }}
            animate={sprouted ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.55, type: "spring", stiffness: 200 }}
            style={{ transformOrigin: "60px 106px" }}
          />
          <defs>
            <linearGradient id="stemGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
        </svg>

        {/* The seed / bud button on top of the stem */}
        <motion.button
          onClick={handleSprout}
          className="absolute left-1/2 top-6 -translate-x-1/2 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#8b5cf6] text-white shadow-lg shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          animate={
            sprouted
              ? { scale: [1, 1.4, 1.2], boxShadow: "0 0 40px 8px rgba(129,140,248,0.5)" }
              : {
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(129,140,248,0)",
                    "0 0 24px 4px rgba(129,140,248,0.35)",
                    "0 0 0 0 rgba(129,140,248,0)",
                  ],
                }
          }
          transition={sprouted ? { duration: 0.6 } : { duration: 2.4, repeat: Infinity }}
          whileTap={{ scale: 0.9 }}
          aria-label="Plant your seed"
        >
          <Sparkles className="size-7" />
        </motion.button>
      </div>

      <motion.p
        key={sprouted ? "grown" : "seed"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-10 max-w-xs text-center text-base text-muted-foreground"
      >
        {sprouted ? "It begins…" : "Your mind is a seed. Tap it to grow."}
      </motion.p>
    </div>
  );
}
