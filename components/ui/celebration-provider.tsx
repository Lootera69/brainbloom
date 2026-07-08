"use client";

import { useUserStore } from "@/store/user-store";
import { CelebrationModal } from "@/components/ui/celebration-modal";

export function CelebrationProvider() {
  const pending = useUserStore((s) => s.pendingCelebration);
  const clearCelebration = useUserStore((s) => s.clearCelebration);

  if (!pending) return null;

  return (
    <CelebrationModal
      open={!!pending}
      onClose={clearCelebration}
      type={pending.type}
      title={pending.title}
      subtitle={pending.subtitle}
      rewards={{ xp: pending.xp, gems: pending.gems }}
    />
  );
}
