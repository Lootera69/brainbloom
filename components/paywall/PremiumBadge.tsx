"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumBadge({ className, size = "sm" }: { className?: string; size?: "sm" | "xs" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-purple-500 font-semibold text-white shadow-sm",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        className,
      )}
    >
      <Sparkles className={size === "xs" ? "size-2.5" : "size-3"} />
      PREMIUM
    </span>
  );
}
