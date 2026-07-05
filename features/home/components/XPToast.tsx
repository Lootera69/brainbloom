"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/store/user-store";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export function XPToast() {
  const lastXpGain = useUserStore((s) => s.lastXpGain);
  const prevRef = useRef(0);

  useEffect(() => {
    if (lastXpGain > 0 && lastXpGain !== prevRef.current) {
      prevRef.current = lastXpGain;
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold">+{lastXpGain} XP</p>
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            </div>
          </div>
        ),
        { duration: 1500 },
      );
    }
  }, [lastXpGain]);

  return null;
}
