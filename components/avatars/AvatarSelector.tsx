"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check } from "lucide-react";
import { avatars } from "./avatar-svgs";
import { AvatarDisplay } from "./AvatarDisplay";
import { avatarSounds, isSoundEnabled } from "@/services/sound-service";

interface AvatarSelectorProps {
  currentAvatarId: string | null;
  photoURL?: string | null;
  displayName?: string;
  onSelect: (avatarId: string | null) => void;
  onClose: () => void;
}

export function AvatarSelector({
  currentAvatarId,
  photoURL,
  displayName,
  onSelect,
  onClose,
}: AvatarSelectorProps) {
  const [selected, setSelected] = useState<string | null>(currentAvatarId);

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/95 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-base font-bold">Choose Avatar</h2>
            </div>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Preview */}
          <div className="flex justify-center py-6">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-primary/20 via-secondary/20 to-warning/20 blur-md" />
              <div className="relative flex size-28 items-center justify-center rounded-full bg-card shadow-xl ring-2 ring-white/10">
                <AvatarDisplay
                  avatarId={selected}
                  photoURL={photoURL}
                  name={displayName}
                  size={100}
                />
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="px-3 sm:px-6 pb-2">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Pick your character
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {avatars.map((avatar) => {
                const isSelected = selected === avatar.id;
                const SvgComponent = avatar.component;
                return (
                  <motion.button
                    key={avatar.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setSelected(avatar.id);
                      avatarSounds[avatar.id]?.();
                    }}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl p-2.5 transition-all ${
                      isSelected
                        ? "bg-primary/15 ring-2 ring-primary shadow-lg shadow-primary/10"
                        : "bg-muted/30 hover:bg-muted/60 ring-1 ring-transparent hover:ring-white/10"
                    }`}
                  >
                    <SvgComponent size={48} />
                    <span
                      className={`text-[10px] font-medium ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {avatar.name}
                    </span>
                    {isSelected && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary shadow">
                        <Check className="size-3 text-white" />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Remove option */}
          {(photoURL || currentAvatarId) && (
            <div className="px-3 sm:px-6 pt-2 pb-1">
              <button
                onClick={() => setSelected(null)}
                className={`w-full rounded-xl py-2.5 text-xs font-medium transition-colors ${
                  selected === null
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {photoURL ? "Use Google profile photo" : "Use initials"}
              </button>
            </div>
          )}

          {/* Confirm */}
          <div className="px-3 sm:px-6 py-4">
            <button
              onClick={handleConfirm}
              disabled={selected === currentAvatarId && selected !== null}
              className="relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-40"
            >
              <Check className="size-4" />
              {selected === null ? "Use fallback" : `Select ${avatars.find((a) => a.id === selected)?.name}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
