"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Monitor, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useUserStore } from "@/store/user-store";
import { playClick } from "@/services/sound-service";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "system" as const, icon: Monitor, label: "System" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useUserStore((s) => s.theme);
  const setThemeStore = useUserStore((s) => s.setTheme);
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (value: "light" | "system" | "dark") => {
    playClick();
    setTheme(value);
    setThemeStore(value);
  };

  if (!mounted) {
    return (
      <div className={cn("flex h-9 w-[132px] items-center rounded-xl bg-muted/50", className)} />
    );
  }

  return (
    <div className={cn("relative flex h-9 w-[132px] items-center rounded-xl border border-border/50 bg-white/60 p-[3px] backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]", className)}>
      {/* Sliding indicator */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="absolute left-[3px] top-[3px] h-[26px] w-[40px] rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-md shadow-primary/20 dark:shadow-primary/10"
        style={{
          left: theme === "light" ? "3px" : theme === "system" ? "45px" : "87px",
        }}
      />

      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center rounded-[10px] transition-colors duration-200",
              active ? "text-white" : "text-muted-foreground/60 hover:text-foreground",
            )}
            title={opt.label}
          >
            <Icon className="size-[14px]" />
          </button>
        );
      })}
    </div>
  );
}
