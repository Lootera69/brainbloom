"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { avatars, getAvatarById } from "@/components/avatars/avatar-svgs";

interface ReadyStepProps {
  selectedAvatar: string | null;
  onComplete: () => void;
}

export default function ReadyStep({ selectedAvatar, onComplete }: ReadyStepProps) {
  const avatarName = selectedAvatar ? getAvatarById(selectedAvatar)?.name ?? "Guide" : "Guide";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(99,102,241,0)",
              "0 0 40px 8px rgba(99,102,241,0.25)",
              "0 0 0 0 rgba(99,102,241,0)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="mb-6"
        >
          <span className="flex size-16 md:size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/30">
            <Sparkles className="size-8 md:size-10 text-white" />
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="font-heading text-2xl font-bold text-foreground md:text-3xl"
        >
          You&apos;re ready to bloom
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-3 text-center text-sm text-muted-foreground/60"
        >
          {selectedAvatar
            ? `${avatarName} will guide you.`
            : "Your journey starts now."}
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          onClick={onComplete}
          className="mt-10 flex h-12 w-56 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
        >
          Start Your Journey
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="mt-4 text-xs text-muted-foreground/30"
        >
          Sign in or continue as guest
        </motion.p>
      </motion.div>
    </div>
  );
}
