import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.ComponentProps<"div"> {
  tint?: string;
  intensity?: "light" | "default" | "strong";
  hover?: boolean;
}

export function GlassCard({
  className,
  tint,
  intensity = "default",
  hover = false,
  style,
  ...props
}: GlassCardProps) {
  const glassClass =
    intensity === "strong"
      ? "glass-strong"
      : intensity === "light"
        ? "glass-tint"
        : "glass";

  return (
    <div
      className={cn(
        glassClass,
        "rounded-2xl shadow-sm shadow-black/[0.02] dark:shadow-black/20",
        hover && "transition-all duration-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-none dark:hover:shadow-primary/5",
        className,
      )}
      style={
        tint
          ? {
              ...style,
              background: `color-mix(in oklab, ${tint}08, color-mix(in oklab, var(--card) 60%, transparent))`,
            }
          : style
      }
      {...props}
    />
  );
}
