"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useUserStore } from "@/store/user-store";

export function SoundToggle() {
  const soundEnabled = useUserStore((s) => s.soundEnabled);
  const setSoundEnabled = useUserStore((s) => s.setSoundEnabled);

  return (
    <button
      onClick={() => setSoundEnabled(!soundEnabled)}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={soundEnabled ? "Mute sounds" : "Enable sounds"}
    >
      {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
