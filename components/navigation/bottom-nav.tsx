"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useMotionValue, animate } from "framer-motion";
import { House, Brain, Trophy, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/learn", label: "Learn", icon: Brain },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

const clampIndex = (i: number) => Math.min(navItems.length - 1, Math.max(0, i));

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [slotWidth, setSlotWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);

  const routeIndex = navItems.findIndex((it) => it.href === pathname);
  const onNav = routeIndex !== -1;
  const activeIndex = onNav ? routeIndex : 0;
  const [displayIndex, setDisplayIndex] = useState(activeIndex);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSlotWidth(el.clientWidth / navItems.length);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (slotWidth === 0) return;
    const unsub = x.on("change", (v) => setDisplayIndex(clampIndex(Math.round(v / slotWidth))));
    return unsub;
  }, [x, slotWidth]);

  useEffect(() => {
    if (slotWidth === 0 || dragging) return;
    const controls = animate(x, activeIndex * slotWidth, {
      type: "spring",
      stiffness: 420,
      damping: 34,
      mass: 0.7,
    });
    return () => controls.stop();
  }, [activeIndex, slotWidth, dragging, x]);

  const handleDragEnd = () => {
    setDragging(false);
    if (slotWidth === 0) return;
    const idx = clampIndex(Math.round(x.get() / slotWidth));
    animate(x, idx * slotWidth, { type: "spring", stiffness: 520, damping: 36, mass: 0.7 });
    if (navItems[idx].href !== pathname) router.push(navItems[idx].href);
  };

  const PillIcon = navItems[displayIndex].icon;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-3xl
        before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/10 before:to-transparent dark:before:via-white/20
        bg-background/75 backdrop-blur-2xl saturate-[1.8] supports-[backdrop-filter]:bg-background/80
        dark:bg-background/60 dark:supports-[backdrop-filter]:bg-background/70"
      style={{
        paddingBottom: "var(--safe-area-inset-bottom)",
        height: "calc(4rem + var(--safe-area-inset-bottom))",
      }}
    >
      <div ref={containerRef} className="relative flex h-full items-center px-2">
        {navItems.map(({ href, label, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-current={onNav && i === activeIndex ? "page" : undefined}
            className={cn(
              "relative z-0 flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition-colors duration-200",
              onNav && i === displayIndex ? "text-transparent" : "text-muted-foreground",
            )}
          >
            <span className="flex size-8 items-center justify-center">
              <Icon className="size-5" />
            </span>
            <span className="truncate px-0.5">{label}</span>
          </Link>
        ))}

        {slotWidth > 0 && onNav && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: (navItems.length - 1) * slotWidth }}
            dragElastic={0.06}
            dragMomentum={false}
            onDragStart={() => setDragging(true)}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: 0.94 }}
            style={{ x, width: slotWidth }}
            className="absolute left-0 top-1/2 z-10 flex h-14 -translate-y-1/2 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <motion.div
              layout
              className="relative flex h-[3.25rem] w-[calc(100%-0.4rem)] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[1.25rem] text-primary
                border border-white/50 dark:border-white/15
                bg-white/30 dark:bg-white/10 backdrop-blur-xl saturate-150
                shadow-[0_10px_28px_-10px_rgba(79,70,229,0.5),inset_0_1px_1px_rgba(255,255,255,0.7),inset_0_-6px_12px_-8px_rgba(79,70,229,0.35)]
                dark:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.18)]"
            >
              <span className="pointer-events-none absolute inset-x-0 -top-1/2 h-full bg-gradient-to-b from-white/60 to-transparent dark:from-white/25" />
              <span className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
              <PillIcon className="relative size-5" />
              <span className="relative truncate px-1 text-xs font-medium">
                {navItems[displayIndex].label}
              </span>
            </motion.div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
