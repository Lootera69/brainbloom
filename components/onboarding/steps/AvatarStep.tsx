"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { avatars } from "@/components/avatars/avatar-svgs";
import { avatarSounds } from "@/services/sound-service";

interface AvatarStepProps {
  selectedAvatar: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}

export default function AvatarStep({ selectedAvatar, onSelect, onNext }: AvatarStepProps) {
  const handleSelect = (id: string) => {
    onSelect(id);
    avatarSounds[id]?.();
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <p className="text-sm text-muted-foreground/50">STEP 3 OF 5</p>
        <h2 className="mt-2 font-heading text-xl font-bold text-foreground md:text-2xl">
          Pick your guide
        </h2>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Your spirit guide through the labyrinth of the mind
        </p>
      </motion.div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3 sm:grid-cols-4">
        {avatars.map((avatar, i) => {
          const isSelected = selectedAvatar === avatar.id;
          const AvatarComp = avatar.component;
          return (
            <motion.button
              key={avatar.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.06 }}
              onClick={() => handleSelect(avatar.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 md:p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10"
              }`}
            >
              <AvatarComp size={52} className="md:[&_svg]:size-14" />
              <span className="text-[10px] font-medium text-muted-foreground/60 md:text-xs">
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

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        onClick={onNext}
        className="mt-8 flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl active:scale-[0.98]"
      >
        {selectedAvatar ? "Next" : "Skip for now"}
      </motion.button>
    </div>
  );
}
