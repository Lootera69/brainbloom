"use client";

// TEMP: Mock ad modal — replace with real ad SDK when available
// This entire component is temporary mock content for AdSense approval period

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, X, Crown, Gem, Heart, Brain,
  Star, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_AD_DURATION } from "@/services/ad-service";

// TEMP: Ad variations — fancy mock ads for our platform
const adVariations = [
  {
    id: "premium-monthly",
    icon: Crown,
    badge: "PREMIUM",
    title: "BrainBloom Premium",
    subtitle: "Unlock Your Full Potential",
    description: "Unlimited puzzles, ad-free experience, premium avatars, and 2x XP boost.",
    cta: "Start Free Trial",
    gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    features: ["Unlimited Puzzles", "Ad-Free", "2x XP"],
  },
  {
    id: "premium-yearly",
    icon: Star,
    badge: "BEST VALUE",
    title: "Annual Membership",
    subtitle: "Save 75% Today",
    description: "All premium features at our best price. Lock in your rate forever.",
    cta: "Get 75% Off",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    features: ["75% Savings", "Price Lock", "All Features"],
  },
  {
    id: "gems-pack",
    icon: Gem,
    badge: "GEMS",
    title: "Gem Collection",
    subtitle: "Power Up Your Progress",
    description: "Earn gems to buy heart refills, streak freezes, and exclusive items.",
    cta: "Earn Gems",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
    iconBg: "bg-gradient-to-br from-cyan-400 to-teal-500",
    features: ["Heart Refills", "Streak Freezes", "Exclusive Items"],
  },
  {
    id: "heart-refill",
    icon: Heart,
    badge: "HEARTS",
    title: "Never Stop Playing",
    subtitle: "Refill Hearts Instantly",
    description: "Don't let a broken streak ruin your day. Keep the momentum going.",
    cta: "Refill Now",
    gradient: "from-rose-500 via-pink-500 to-red-500",
    iconBg: "bg-gradient-to-br from-rose-400 to-pink-500",
    features: ["Instant Refill", "Keep Streak", "Stay Sharp"],
  },
  {
    id: "brainbloom-pro",
    icon: Brain,
    badge: "JOIN 10K+",
    title: "Train Your Mind",
    subtitle: "Science-Backed Results",
    description: "Join thousands improving memory, focus, and problem-solving daily.",
    cta: "Join Now",
    gradient: "from-indigo-500 via-blue-500 to-cyan-500",
    iconBg: "bg-gradient-to-br from-indigo-400 to-blue-500",
    features: ["Memory", "Focus", "Problem-Solving"],
  },
];

interface AdModalProps {
  onComplete: (rewarded: boolean) => void;
  onClose: () => void;
}

export function AdModal({ onComplete, onClose }: AdModalProps) {
  const [phase, setPhase] = useState<"playing" | "rewarded" | "skipped" | "confirm-close">("playing");
  const [timeLeft, setTimeLeft] = useState(MOCK_AD_DURATION);
  const [elapsed, setElapsed] = useState(0);
  const [ad] = useState(() => adVariations[Math.floor(Math.random() * adVariations.length)]);
  const onCompleteRef = useRef(onComplete);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());
  const pausedDurationRef = useRef(0);
  const pausedAtRef = useRef<number>(0);
  const confirmCloseWatchTimeRef = useRef(0);
  const initializedRef = useRef(false);

  // eslint-disable-next-line react-hooks/refs
  onCompleteRef.current = onComplete;

  // Calculate elapsed time from refs (works correctly across pause/resume)
  const getElapsed = useCallback(() => {
    return (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000;
  }, []);

  // Timer logic — only starts on mount, resumes on phase back to "playing"
  useEffect(() => {
    if (phase !== "playing") return;

    // Only reset start time on initial mount, not on resume
    if (!initializedRef.current) {
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      initializedRef.current = true;
    } else {
      // Resuming from confirm-close: account for paused duration
      const now = Date.now();
      startTimeRef.current = now - (elapsed * 1000) - pausedDurationRef.current;
    }

    timerRef.current = setInterval(() => {
      const totalElapsed = getElapsed();
      const remaining = Math.max(0, MOCK_AD_DURATION - totalElapsed);

      setTimeLeft(Math.ceil(remaining));
      setElapsed(totalElapsed);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setPhase("rewarded");
        setTimeout(() => onCompleteRef.current(true), 1500);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, getElapsed]);

  // Handle close attempt
  const handleClose = useCallback(() => {
    if (phase !== "playing") return;

    const watchTime = getElapsed();
    pausedDurationRef.current += Date.now() - (startTimeRef.current + pausedDurationRef.current + elapsed * 1000);

    // Pause the timer by recording when we paused
    pausedAtRef.current = Date.now();
    confirmCloseWatchTimeRef.current = watchTime;
    setPhase("confirm-close");
  }, [phase, getElapsed, elapsed]);

  // Confirm close (user chose to leave without reward)
  const handleConfirmClose = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("skipped");
    setTimeout(() => onCompleteRef.current(false), 100);
  }, [onComplete]);

  // Resume watching
  const handleResume = useCallback(() => {
    if (phase !== "confirm-close") return;

    // Account for time spent in confirm-close
    const pauseDuration = Date.now() - pausedAtRef.current;
    pausedDurationRef.current += pauseDuration;

    pausedAtRef.current = 0;
    setPhase("playing");
  }, [phase]);

  const Icon = ad.icon;
  const progress = Math.min(100, (elapsed / MOCK_AD_DURATION) * 100);
  const isComplete = elapsed >= MOCK_AD_DURATION;
  const watchTime = Math.floor(elapsed);
  const confirmWatchTime = Math.floor(confirmCloseWatchTimeRef.current);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl dark:border-white/10"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
          >
            <X className="size-4" />
          </button>

          {/* Countdown — top left */}
          <div className="absolute left-3 top-3 z-20">
            <span className={cn(
              "rounded px-2 py-1 text-xs font-bold tabular-nums backdrop-blur-sm",
              isComplete ? "bg-emerald-500/30 text-emerald-300" : "bg-black/30 text-white/70"
            )}>
              {timeLeft}s
            </span>
          </div>

          {/* PHASE: Playing (ad content) */}
          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              {/* Ad background gradient */}
              <div className={cn("h-48 bg-gradient-to-br p-6", ad.gradient)}>
                <div className="flex h-full flex-col items-center justify-center text-center text-white">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mb-3"
                  >
                    <span className={cn("flex size-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm", ad.iconBg)}>
                      <Icon className="size-8 text-white" />
                    </span>
                  </motion.div>

                  {/* Badge */}
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-1 rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
                  >
                    {ad.badge}
                  </motion.span>

                  {/* Title */}
                  <motion.h3
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-lg font-bold"
                  >
                    {ad.title}
                  </motion.h3>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs text-white/80"
                  >
                    {ad.subtitle}
                  </motion.p>
                </div>
              </div>

              {/* Ad body */}
              <div className="p-5">
                <p className="text-sm text-muted-foreground">{ad.description}</p>

                {/* Features */}
                <div className="mt-3 flex gap-2">
                  {ad.features.map((feature, i) => (
                    <motion.span
                      key={feature}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {feature}
                    </motion.span>
                  ))}
                </div>

                {/* CTA button (visual only) */}
                <div className="mt-4">
                  <div className={cn(
                    "flex h-11 items-center justify-center rounded-xl bg-gradient-to-r font-semibold text-white shadow-lg",
                    ad.gradient
                  )}>
                    {ad.cta}
                  </div>
                </div>
              </div>

              {/* Progress bar — visible at bottom of ad */}
              <div className="px-5 pb-4">
                <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", ad.gradient)}
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* PHASE: Confirm close (warning) */}
          {phase === "confirm-close" && (
            <motion.div
              key="confirm-close"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="flex size-14 items-center justify-center rounded-full bg-amber-500/20"
                >
                  <AlertTriangle className="size-7 text-amber-500" />
                </motion.span>

                <div>
                  <h3 className="text-base font-bold text-foreground">Close Ad?</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    You&apos;ve watched {confirmWatchTime}s of {MOCK_AD_DURATION}s. You need to watch the full ad to earn your reward.
                    <span className="mt-1 block text-amber-500 font-medium">
                      Leave now and you won&apos;t get your reward.
                    </span>
                  </p>
                </div>

                <div className="flex w-full gap-3">
                  <button
                    onClick={handleResume}
                    className="flex-1 h-11 rounded-xl border border-border/50 bg-muted/30 text-sm font-semibold transition-all hover:bg-muted/50 active:scale-[0.98]"
                  >
                    Keep Watching
                  </button>
                  <button
                    onClick={handleConfirmClose}
                    className="flex-1 h-11 rounded-xl bg-destructive/10 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20 active:scale-[0.98]"
                  >
                    Leave Without Reward
                  </button>
                </div>

                {/* Timer paused indicator */}
                <p className="text-[10px] text-muted-foreground/60">
                  Timer paused — {MOCK_AD_DURATION - confirmWatchTime}s remaining
                </p>
              </div>
            </motion.div>
          )}

          {/* PHASE: Rewarded */}
          {phase === "rewarded" && (
            <motion.div
              key="rewarded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 p-8"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20"
              >
                <CheckCircle2 className="size-9 text-emerald-500" />
              </motion.span>
              <div className="text-center">
                <p className="text-base font-bold text-emerald-500">Reward Earned!</p>
                <p className="mt-1 text-xs text-muted-foreground">Thanks for watching</p>
              </div>
            </motion.div>
          )}

          {/* PHASE: Skipped */}
          {phase === "skipped" && (
            <motion.div
              key="skipped"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 p-8"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-destructive/20">
                <XCircle className="size-9 text-destructive" />
              </span>
              <div className="text-center">
                <p className="text-base font-bold text-destructive">No Reward</p>
                <p className="mt-1 text-xs text-muted-foreground">You left before the ad finished</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 h-10 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Close
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
