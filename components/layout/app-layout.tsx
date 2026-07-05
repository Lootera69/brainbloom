"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/navigation/sidebar";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { PageTransition } from "@/components/common/page-transition";
import { AnimatedBackground } from "@/features/home/components/AnimatedBackground";
import { XPToast } from "@/features/home/components/XPToast";
import { useUserStore } from "@/store/user-store";
import { Toaster } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const processHeartRefill = useUserStore((s) => s.processHeartRefill);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    processHeartRefill();
    const interval = setInterval(processHeartRefill, 30_000);
    return () => clearInterval(interval);
  }, [processHeartRefill]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

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
      <Toaster />
      <AnimatedBackground />
      <Sidebar />
      <main
        className="relative flex-1"
        style={{
          paddingBottom: "calc(4rem + var(--safe-area-inset-bottom))",
        }}
      >
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
