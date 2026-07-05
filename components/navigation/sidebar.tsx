"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { House, Brain, Trophy, User, Sparkles } from "lucide-react";
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
  const { displayName, photoURL, isGuest, level } = useUserStore();

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 flex-col rounded-3xl bg-card/60 backdrop-blur-xl saturate-150 border border-white/10 dark:border-white/5 shadow-lg md:flex">
      <div className="flex items-center gap-3 px-6 pt-8 pb-7">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#8b5cf6]">
          <Sparkles className="size-5 text-white" />
        </span>
        <div>
          <span className="font-heading text-lg font-bold">BrainBloom</span>
          <p className="-mt-0.5 text-xs text-muted-foreground">Train your mind</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="relative size-5" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
            {photoURL ? (
              <img src={photoURL} alt="" className="size-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              Level {level} {isGuest ? "• Guest" : ""}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
