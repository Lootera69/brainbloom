"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Sparkles } from "lucide-react";
import { avatars, getAvatarById } from "@/components/avatars/avatar-svgs";
import { avatarSounds } from "@/services/sound-service";
import AvatarWithEyes from "@/components/onboarding/AvatarWithEyes";

interface AvatarStepProps {
  selectedAvatar: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}

// A line each guide "says" when chosen — gives them personality.
const GUIDE_LINES: Record<string, string> = {
  owl: "Wise choice. I'll help you see what others miss.",
  fox: "Clever pick. Let's outsmart every puzzle together.",
  cat: "Purr-fect. I'll keep you curious and quick.",
  dog: "Yes! I'll cheer you on, every single day.",
  rooster: "At dawn we rise. I'll never let you skip a day.",
  turtle: "Slow and steady. We'll go the distance together.",
};

export default function AvatarStep({ selectedAvatar, onSelect, onNext }: AvatarStepProps) {
  const handleSelect = (id: string) => {
    const avatar = avatars.find((a) => a.id === id);
    if (avatar?.premium) return;
    onSelect(id);
    try { avatarSounds[id]?.(); } catch { /* no-op */ }
  };

  const selectedName = selectedAvatar ? getAvatarById(selectedAvatar)?.name : null;
  const line = selectedAvatar
    ? GUIDE_LINES[selectedAvatar] ?? "Great pick. Let's grow together."
    : "Tap a guide to meet them.";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-heading text-2xl font-bold text-foreground md:text-3xl"
      >
        Choose your guide
      </motion.h2>

      {/* Big living preview + speech bubble */}
      <div className="mt-6 flex min-h-[132px] flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedAvatar ?? "none"}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
          >
            {selectedAvatar ? (
              <>
                <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl" />
                <AvatarWithEyes avatarId={selectedAvatar} size={92} />
              </>
            ) : (
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="flex size-[92px] items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 text-muted-foreground/30"
              >
                <Sparkles className="size-8" />
              </motion.span>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="mt-3 max-w-[16rem] text-center text-sm text-muted-foreground"
          >
            {selectedName && (
              <span className="font-semibold text-foreground">{selectedName}: </span>
            )}
            {line}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Guide grid */}
      <div className="mt-6 grid w-full max-w-sm grid-cols-4 gap-2.5">
        {avatars.map((avatar, i) => {
          const isSelected = selectedAvatar === avatar.id;
          const AvatarComp = avatar.component;
          const isPremium = avatar.premium;
          return (
            <motion.button
              key={avatar.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 + i * 0.04 }}
              onClick={() => handleSelect(avatar.id)}
              whileTap={{ scale: 0.92 }}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border p-2.5 transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : isPremium
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-border/30 bg-muted/30 dark:border-white/5 dark:bg-white/5 hover:border-border/50 hover:bg-muted/50 dark:hover:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              <span className="relative">
                <AvatarComp size={44} className={isPremium ? "opacity-60" : ""} />
                {isPremium && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Lock className="size-4 text-amber-400/80" />
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isPremium ? "text-amber-400/60" : "text-muted-foreground/60"
                }`}
              >
                {avatar.name}
              </span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white"
                >
                  <Check className="size-3" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/50"
      >
        <Sparkles className="size-3 text-amber-400/60" />
        Premium guides can be unlocked later in the shop
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        onClick={onNext}
        whileTap={{ scale: 0.98 }}
        className="mt-4 flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl"
      >
        {selectedAvatar ? "Next" : "Skip for now"}
      </motion.button>
    </div>
  );
}
