"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Gem, Crown, Heart, Sparkles,
} from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { PremiumTab } from "./components/PremiumTab";
import { GemsTab } from "./components/GemsTab";
import { HeartsTab } from "./components/HeartsTab";
import { cn } from "@/lib/utils";

type Tab = "premium" | "gems" | "hearts";

const TABS: { id: Tab; label: string; icon: typeof Crown }[] = [
  { id: "premium", label: "Premium", icon: Crown },
  { id: "gems", label: "Gems", icon: Gem },
  { id: "hearts", label: "Hearts & Freezes", icon: Heart },
];

export function StorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam ?? "premium");
  const gems = useUserStore((s) => s.gems);
  const directionRef = useRef(1);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = useCallback((tab: Tab) => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const nextIdx = TABS.findIndex((t) => t.id === tab);
    directionRef.current = nextIdx > idx ? 1 : -1;
    setActiveTab(tab);
    router.push(`/shop?tab=${tab}`, { scroll: false });
  }, [activeTab, router]);

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 ring-1 ring-amber-500/20"
        >
          <ShoppingBag className="size-7 text-amber-400" />
        </motion.div>
        <h1 className="text-2xl font-extrabold tracking-tight">Shop</h1>
        <p className="mt-1.5 text-sm text-muted-foreground/70">
          Gems, hearts, and premium upgrades
        </p>

        {/* Gem counter in header */}
        <div className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/15 px-4 py-1.5">
          <Gem className="size-3.5 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-400">{gems}</span>
          <span className="text-[10px] text-muted-foreground/50">gems</span>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="relative mb-6 flex rounded-2xl bg-white/[0.04] border border-white/[0.06] p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-amber-400" : "")} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "premium" ? "Premium" : tab.id === "gems" ? "Gems" : "Hearts"}
              </span>
            </button>
          );
        })}
        <motion.div
          layoutId="shop-tab-pill"
          className="absolute inset-y-1 rounded-xl bg-white/[0.08] shadow-sm"
          style={{
            left: `${(TABS.findIndex((t) => t.id === activeTab) / TABS.length) * 100 + 0.5}%`,
            width: `calc(${100 / TABS.length}% - 4px)`,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>

      {/* Tab content */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={directionRef.current} initial={false}>
          <motion.div
            key={activeTab}
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {activeTab === "premium" && <PremiumTab onClose={() => router.push("/")} />}
            {activeTab === "gems" && <GemsTab />}
            {activeTab === "hearts" && <HeartsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom decoration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.03] border border-white/[0.06] px-4 py-2">
          <Sparkles className="size-3 text-amber-400/60" />
          <span className="text-[10px] text-muted-foreground/40">
            All purchases are simulated — no real charges
          </span>
        </div>
      </motion.div>
    </div>
  );
}
