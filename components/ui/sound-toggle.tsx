"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { playToggleOn, playToggleOff } from "@/services/sound-service";

export function SoundToggle() {
  const soundEnabled = useUserStore((s) => s.soundEnabled);
  const setSoundEnabled = useUserStore((s) => s.setSoundEnabled);

  return (
    <button
      onClick={() => {
        if (soundEnabled) playToggleOff(); else playToggleOn();
        setSoundEnabled(!soundEnabled);
      }}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={soundEnabled ? "Mute sounds" : "Enable sounds"}
    >
      {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
