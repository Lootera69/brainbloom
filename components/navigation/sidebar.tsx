"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { House, Brain, Trophy, User, Sparkles, Heart, Zap, Gem, ShoppingBag, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { AvatarDisplay } from "@/components/avatars/AvatarDisplay";
import { PremiumBadge } from "@/components/paywall/PremiumBadge";
import { hasPremiumAccess } from "@/services/entitlement-service";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/learn", label: "Learn", icon: Brain },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { displayName, photoURL, avatarId, isGuest, level, xp, hearts, gems, tier, subscriptionExpiry } = useUserStore();
  const setShowShop = useUIStore((s) => s.setShowShop);
  const isPremium = hasPremiumAccess(tier, subscriptionExpiry);

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
          className="group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all hover:bg-muted/50"
        >
          {isPremium && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10" />
          )}
          <span className="relative flex size-10 shrink-0 items-center justify-center">
            <span className={`absolute inset-0 rounded-full p-[2px] ${
              isPremium
                ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500"
                : "bg-gradient-to-br from-primary to-[#8b5cf6]"
            }`}>
              <span className="block size-full rounded-full bg-card" />
            </span>
            <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full">
              <AvatarDisplay avatarId={avatarId} photoURL={photoURL} name={displayName} size={36} />
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold transition-colors ${
              isPremium ? "text-amber-300" : "group-hover:text-primary"
            }`}>{displayName.split(" ")[0]}</p>
            <p className="text-[11px] text-muted-foreground">Level {level}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
              <Zap className="size-3" />
              {xp}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
              <Heart className="size-3" />
              {isPremium ? "∞" : hearts}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShop(true); }}
              className="flex items-center gap-1 text-[11px] font-medium text-cyan-500 transition-colors hover:text-cyan-400"
            >
              <Gem className="size-3" />
              {gems}
            </button>
          </div>
        </Link>
      </div>
    </aside>
  );
}
