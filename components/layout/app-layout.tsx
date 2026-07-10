"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation/sidebar";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { PageTransition } from "@/components/common/page-transition";
import { AnimatedBackground } from "@/features/home/components/AnimatedBackground";
import { XPToast } from "@/features/home/components/XPToast";
import { useUserStore } from "@/store/user-store";
import { useUIStore } from "@/store/ui-store";
import { Toaster, toast } from "sonner";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CelebrationProvider } from "@/components/ui/celebration-provider";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const processHeartRefill = useUserStore((s) => s.processHeartRefill);
  const hearts = useUserStore((s) => s.hearts);
  const focusMode = useUIStore((s) => s.focusMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    processHeartRefill();
    // Pull latest from Firestore on page refresh (cross-device sync)
    useUserStore.getState().loadFromFirestore();
    import("@/services/sound-service").then(({ initSounds }) => initSounds());
    const interval = setInterval(() => {
      const prev = useUserStore.getState().hearts;
      processHeartRefill();
      const next = useUserStore.getState().hearts;
      if (next > prev && prev < 5) {
        toast.custom(
          (t) => (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="flex items-center gap-3 rounded-xl border border-success/20 bg-card px-4 py-3 shadow-lg">
              <span className="flex size-8 items-center justify-center rounded-lg bg-success/10">
                <Heart className="size-4 fill-success text-success" />
              </span>
              <div>
                <p className="text-sm font-semibold text-success">Heart Refilled</p>
                <p className="text-xs text-muted-foreground">{next}/{5} hearts</p>
              </div>
            </motion.div>
          ),
          { duration: 3000, position: "top-center" },
        );
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [processHeartRefill]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const unsub = useUserStore.subscribe((state, prev) => {
      if (state.isGuest || !state.userId) return;
      const changed =
        state.xp !== prev.xp ||
        state.streak !== prev.streak ||
        state.hearts !== prev.hearts ||
        state.gems !== prev.gems ||
        state.completedPuzzleIds.length !== prev.completedPuzzleIds.length;
      if (changed) {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => state.syncToFirestore(), 3000);
      }
    });
    return () => { unsub(); if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, []);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="mx-auto size-16 rounded-full" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <XPToast />
      <Toaster position="top-center" />
      <CelebrationProvider />
      <AnimatedBackground />
      {!focusMode && <Sidebar />}
      <main
        className="relative flex-1"
        style={
          focusMode
            ? {}
            : { paddingBottom: "calc(4rem + var(--safe-area-inset-bottom))" }
        }
      >
        <PageTransition>{children}</PageTransition>
      </main>
      {!focusMode && <BottomNav />}
    </div>
  );
}
