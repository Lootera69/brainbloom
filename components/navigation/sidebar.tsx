"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { House, Brain, Trophy, User, Sparkles, Heart, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/learn", label: "Learn", icon: Brain },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { displayName, photoURL, isGuest, level, xp, hearts } = useUserStore();

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 flex-col md:flex">
      {/* Frosted glass body */}
      <div className="absolute inset-0 rounded-r-3xl bg-background/75 backdrop-blur-2xl saturate-[1.8] supports-[backdrop-filter]:bg-background/80 dark:bg-background/60 dark:supports-[backdrop-filter]:bg-background/70 border-r border-white/10 dark:border-white/5 shadow-lg" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-6 pt-8 pb-7">
        <motion.span
          whileHover={{ rotate: 15, scale: 1.05 }}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] shadow-lg shadow-primary/20"
        >
          <Sparkles className="size-5 text-white" />
        </motion.span>
        <div>
          <span className="font-heading text-lg font-bold tracking-tight">BrainBloom</span>
          <p className="-mt-0.5 text-[11px] font-medium text-muted-foreground">Train your mind</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex flex-1 flex-col gap-1.5 px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              {/* Left active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-[#8b5cf6]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <motion.span
                whileHover={isActive ? {} : { scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "relative flex size-9 shrink-0 items-center justify-center rounded-xl transition-all",
                  isActive
                    ? "bg-gradient-to-br from-primary/20 to-purple-500/10 shadow-sm"
                    : "bg-transparent group-hover:bg-muted",
                )}
              >
                <Icon className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              </motion.span>

              <span className="relative font-semibold">{label}</span>

              {/* Hover right arrow indicator */}
              {!isActive && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="ml-auto text-muted-foreground/40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="relative border-t border-white/10 dark:border-white/5 p-4">
        <Link
          href="/profile"
          className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all hover:bg-muted/50"
        >
          {/* Avatar with gradient ring */}
          <span className="relative flex size-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-[#8b5cf6] p-[2px]">
              <span className="block size-full rounded-full bg-card" />
            </span>
            <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/10 text-xs font-bold text-foreground">
              {photoURL ? (
                <img src={photoURL} alt="" className="size-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold group-hover:text-primary transition-colors">{displayName.split(" ")[0]}</p>
            <p className="text-[11px] text-muted-foreground">Level {level}{isGuest ? " • Guest" : ""}</p>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
              <Zap className="size-3" />
              {xp}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
              <Heart className="size-3" />
              {hearts}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
