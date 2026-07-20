"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getAvatarById } from "@/components/avatars/avatar-svgs";
import AvatarWithEyes from "@/components/onboarding/AvatarWithEyes";
import { ConfettiEffect } from "@/features/home/components/ConfettiEffect";
import { playComplete } from "@/services/sound-service";
import { GOALS } from "./WhyStep";

interface ReadyStepProps {
  selectedAvatar: string | null;
  goals: string[];
  onComplete: () => void;
}

// Petals for the final full bloom.
const PETALS = Array.from({ length: 8 });

export default function ReadyStep({ selectedAvatar, goals, onComplete }: ReadyStepProps) {
  const [confetti, setConfetti] = useState(false);
  const avatarName = selectedAvatar ? getAvatarById(selectedAvatar)?.name ?? "Your guide" : null;

  useEffect(() => {
    const t = setTimeout(() => {
      setConfetti(true);
      try { playComplete(); } catch { /* no-op */ }
    }, 550);
    return () => clearTimeout(t);
  }, []);

  // Personalized closing line based on chosen goals.
  const goalLabels = GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label.toLowerCase());
  let message = "Your journey starts now.";
  if (goalLabels.length === 1) {
    message = `Here to ${goalLabels[0]} — let's make it happen.`;
  } else if (goalLabels.length >= 2) {
    message = `To ${goalLabels.slice(0, -1).join(", ")} and ${goalLabels[goalLabels.length - 1]} — one puzzle at a time.`;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <ConfettiEffect active={confetti} duration={2200} />

      {/* Full bloom */}
      <motion.div
        initial={{ scale: 0, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
        className="relative flex size-40 items-center justify-center"
      >
        {/* Glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/25 blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Petals */}
        {PETALS.map((_, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-14 w-7 origin-bottom rounded-full bg-gradient-to-t from-primary to-[#8b5cf6]"
            style={{ rotate: `${(360 / PETALS.length) * i}deg` }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1, translateY: -28 }}
            transition={{ delay: 0.25 + i * 0.05, type: "spring", stiffness: 200, damping: 14 }}
          />
        ))}

        {/* Center: the chosen guide (or golden core) */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.75, type: "spring", stiffness: 240, damping: 16 }}
          className="relative z-10"
        >
          {selectedAvatar ? (
            <AvatarWithEyes avatarId={selectedAvatar} size={64} />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg" />
          )}
        </motion.div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="mt-8 font-heading text-3xl font-bold text-foreground"
      >
        You&apos;re in bloom
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className="mt-2 max-w-xs text-center text-sm text-muted-foreground/70"
      >
        {avatarName && <span className="font-semibold text-foreground">{avatarName} is ready. </span>}
        {message}
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.35 }}
        onClick={onComplete}
        whileTap={{ scale: 0.97 }}
        className="mt-9 flex h-12 w-60 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/40"
      >
        Start Your Journey
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.6 }}
        className="mt-4 text-xs text-muted-foreground/40"
      >
        Sign in or continue as guest
      </motion.p>
    </div>
  );
}
