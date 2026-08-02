"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/user-store";
import { Button } from "@/components/ui/button";
import {
  checkExistingSubscription,
  getPushStatus,
  requestNotificationPermission,
  subscribeToPush,
} from "@/services/notification-service";

export function PushReminderBanner() {
  const userId = useUserStore((s) => s.userId);
  const isGuest = useUserStore((s) => s.isGuest);
  const pushPromptedDate = useUserStore((s) => s.pushPromptedDate);
  const markPushPrompted = useUserStore((s) => s.markPushPrompted);

  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || isGuest) return;
    let cancelled = false;
    const status = getPushStatus();
    if (!status.supported || !status.configured) {
      setSubscribed(true);
      return;
    }
    checkExistingSubscription().then((has) => {
      if (!cancelled) setSubscribed(has);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isGuest]);

  const today = typeof window !== "undefined" ? new Date().toDateString() : "";
  const show = Boolean(userId) && !isGuest && subscribed === false && pushPromptedDate !== today;

  if (!show) return null;

  const handleEnable = async () => {
    setLoading(true);
    try {
      const status = getPushStatus();
      if (!status.supported) {
        toast.error("Push notifications are not supported on this browser.", { position: "top-center" });
        return;
      }
      if (!status.configured) {
        toast.error("Push notifications are not configured yet.", { position: "top-center" });
        return;
      }
      const perm = await requestNotificationPermission();
      if (perm !== "granted") {
        markPushPrompted();
        if (perm === "denied") {
          toast.error("Notifications blocked. Enable them in your browser settings.", { position: "top-center" });
        }
        return;
      }
      const result = await subscribeToPush({ uid: userId });
      if (!result.success) {
        toast.error(result.error ?? "Failed to enable notifications", { position: "top-center" });
        return;
      }
      setSubscribed(true);
      toast.success("You're in — we'll nudge you when your next challenge awaits!", { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mb-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-4 py-3.5 shadow-sm dark:border-indigo-500/20 dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-fuchsia-500/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Keep your mind sharp, every day</p>
              <p className="truncate text-xs text-muted-foreground">
                We'll call you when a new challenge awaits — your streak deserves it.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={handleEnable}
              disabled={loading}
              size="sm"
              className="h-9 gap-1.5 bg-gradient-to-r from-primary to-[#8b5cf6]"
            >
              <BellRing className="size-4" />
              {loading ? "Enabling…" : "Enable"}
            </Button>
            <Button
              onClick={markPushPrompted}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-xs text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
