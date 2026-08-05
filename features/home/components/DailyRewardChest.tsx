"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Zap, Gem, Snowflake } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const rewardIcons: Record<string, typeof Zap> = {
  xp: Zap,
  gems: Gem,
  "streak-freeze": Snowflake,
};

const rewardColors: Record<string, string> = {
  xp: "from-indigo-400 to-purple-500",
  gems: "from-cyan-400 to-teal-500",
  "streak-freeze": "from-blue-400 to-indigo-500",
};

const rewardNames: Record<string, string> = {
  xp: "XP",
  gems: "Gems",
  "streak-freeze": "Streak Freeze",
};

const rewardSolidColors: Record<string, string> = {
  xp: "#818cf8",
  gems: "#22d3ee",
  "streak-freeze": "#60a5fa",
};

type Reward = { type: "xp" | "gems" | "streak-freeze"; amount: number; label: string };

const CONFETTI_COLORS = ["#f43f5e", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#ec4899", "#fbbf24", "#34d399"];

function ConfettiExplosion() {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const angle = (i / 25) * Math.PI * 2;
      const spread = 50 + (i * 7) % 80;
      return {
        x: Math.cos(angle) * spread * 3.5,
        y: Math.sin(angle) * spread * 2.5 + 100,
        rotate: (i * 37) % 540,
        scale: 0.5 + (i % 5) * 0.15,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: (i * 0.04) % 0.3,
        shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "square" : "line",
      };
    });
  }, []);

  const [alive, setAlive] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    particles.forEach((_, i) => {
      timers.push(setTimeout(() => setAlive((p) => [...p, i]), particles[i].delay * 1000));
    });
    return () => timers.forEach(clearTimeout);
  }, [particles]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {alive.map((i) => {
        const p = particles[i];
        return (
          <div
            key={i}
            className="confetti-particle"
            style={{
              "--cx": `${p.x}px`,
              "--cy": `${p.y}px`,
              "--cr": `${p.rotate}deg`,
              "--cs": p.scale,
              "--cd": `${p.delay}s`,
              width: p.shape === "line" ? 8 : 6,
              height: p.shape === "line" ? 3 : 6,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : 0,
              backgroundColor: p.color,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

function LightBeams() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: [0, 0.7, 0], scaleX: [0, 1.2, 0.3] }}
          transition={{ duration: 0.9, delay: i * 0.06, ease: "easeOut" }}
          className="absolute h-1.5 origin-bottom"
          style={{
            width: 140 + i * 35,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`,
            transform: `rotate(${45 + i * 90}deg)`,
            bottom: "50%",
          }}
        />
      ))}
    </div>
  );
}

function SonarRipple({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.3, opacity: 0.6 }}
          animate={{ scale: [0.3, 2.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, delay, ease: "easeOut" }}
          className="absolute size-24 rounded-full border-2"
          style={{ borderColor: `${color}60` }}
        />
      ))}
    </div>
  );
}

function CountUpNumber({ target, rewardType, gradient, delay = 0 }: { target: number; rewardType: string; gradient: string; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 800;
      startRef.current = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * target));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [target, delay]);

  return (
    <motion.span
      initial={{ scale: 0.5 }}
      animate={{ scale: [0.5, 1.15, 1] }}
      transition={{ delay: delay / 1000, duration: 0.5, times: [0, 0.7, 1], ease: "easeOut" }}
      className={cn("font-heading text-3xl font-extrabold sm:text-4xl", `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`)}
    >
      +{display} {rewardNames[rewardType] ?? "XP"}
    </motion.span>
  );
}

function GiftBox({ phase, fadingOut }: { phase: "idle" | "shaking" | "opening"; fadingOut: boolean }) {
  const isOpen = phase === "opening";
  const lidColor = "#f59e0b";
  const baseColor = "#d97706";
  const ribbonColor = "#ef4444";

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={
          phase === "idle"
            ? { y: [0, -3, 0] }
            : phase === "shaking"
              ? { rotate: [0, -8, 8, -6, 6, 0], x: [0, 3, -3, 2, -2, 0] }
              : { scale: 0.85 }
        }
        transition={
          phase === "idle"
            ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
            : phase === "shaking"
              ? { duration: 0.5, ease: "easeInOut" }
              : { duration: 0.4 }
        }
        className="relative"
      >
        <motion.svg
          width="100" height="112" viewBox="0 0 80 90"
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={fadingOut ? { opacity: 0, scale: 0.7, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Lid */}
          <motion.g
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={isOpen ? { y: -45, rotate: -20, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
            transition={isOpen ? { duration: 0.6, ease: "easeOut" } : { duration: 0.3 }}
          >
            <rect x="8" y="10" width="64" height="22" rx="4" fill={lidColor} />
            <rect x="8" y="10" width="64" height="22" rx="4" fill="url(#lidGrad)" />
            <rect x="30" y="10" width="20" height="22" rx="2" fill={ribbonColor} opacity="0.85" />
            <rect x="36" y="4" width="8" height="34" rx="4" fill={ribbonColor} opacity="0.9" />
            <motion.ellipse cx="30" cy="6" rx="10" ry="5" fill={ribbonColor}
              animate={phase === "shaking" ? { rx: [10, 8, 10] } : {}} transition={{ duration: 0.2 }} opacity="0.85" />
            <motion.ellipse cx="50" cy="6" rx="10" ry="5" fill={ribbonColor}
              animate={phase === "shaking" ? { rx: [10, 8, 10] } : {}} transition={{ duration: 0.2, delay: 0.1 }} opacity="0.85" />
            <circle cx="40" cy="6" r="4" fill="#dc2626" />
            <rect x="12" y="13" width="20" height="4" rx="2" fill="white" opacity="0.2" />
            <rect x="12" y="20" width="14" height="3" rx="1.5" fill="white" opacity="0.12" />
          </motion.g>

          {/* Base */}
          <motion.g animate={isOpen ? { y: 5 } : { y: 0 }} transition={{ duration: 0.3 }}>
            <rect x="6" y="34" width="68" height="50" rx="4" fill={baseColor} />
            <rect x="6" y="34" width="68" height="50" rx="4" fill="url(#baseGrad)" />
            <rect x="30" y="34" width="20" height="50" rx="2" fill={ribbonColor} opacity="0.85" />
            <rect x="6" y="52" width="68" height="14" rx="2" fill={ribbonColor} opacity="0.9" />
            <rect x="10" y="38" width="18" height="4" rx="2" fill="white" opacity="0.15" />
            <line x1="6" y1="34" x2="74" y2="34" stroke="#92400e" strokeWidth="1.5" opacity="0.3" />
          </motion.g>

          <defs>
            <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>

      {phase === "idle" && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-4 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)" }}
        />
      )}
    </div>
  );
}

function RewardReveal({ reward }: { reward: Reward }) {
  const Icon = rewardIcons[reward.type];
  const gradient = rewardColors[reward.type];
  const color = rewardSolidColors[reward.type];

  return (
    <div className="relative flex flex-col items-center py-2">
      <SonarRipple color={color} />

      <motion.div
        initial={{ scale: 0, rotate: -180, y: 30 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.15 }}
        className="relative mb-4"
      >
        <div className="absolute -inset-6 rounded-full" style={{ backgroundColor: `${color}15` }} />

        <div className={cn("relative flex size-20 items-center justify-center rounded-full p-0.5 sm:size-24", `bg-gradient-to-br ${gradient}`)}>
          <div className="flex size-full items-center justify-center rounded-full bg-card">
            <Icon className="size-10 sm:size-12" style={{ color }} strokeWidth={1.5} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.3, 1.8] }}
          transition={{ duration: 1.8, delay: 0.3, repeat: Infinity, repeatDelay: 1 }}
          className={cn("absolute inset-0 rounded-full opacity-0", `bg-gradient-to-br ${gradient}`)}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 120 }}
        className="text-center"
      >
        <CountUpNumber target={reward.amount} rewardType={reward.type} gradient={gradient} delay={350} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-1.5 text-sm text-muted-foreground"
        >
          {reward.type === "streak-freeze" ? "Your streak is safe for one day!" : "Come back tomorrow for more!"}
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 120, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
        className={cn("mt-4 h-0.5 rounded-full", `bg-gradient-to-r from-transparent ${color} to-transparent`)}
        style={{ opacity: 0.3 }}
      />
    </div>
  );
}

export function DailyRewardChest() {
  const canClaim = useUserStore((s) => s.canClaimDailyBonus);
  const claim = useUserStore((s) => s.claimDailyBonus);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "shaking" | "opening">("idle");
  const [reward, setReward] = useState<Reward | null>(null);
  const [showBeams, setShowBeams] = useState(false);
  const [boxFading, setBoxFading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const unlocking = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleOpen = useCallback(() => {
    if (unlocking.current) return;
    unlocking.current = true;
    setOpen(true);
    setPhase("idle");
    setBoxFading(false);

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const t1 = setTimeout(() => setPhase("shaking"), 300);
    const t2 = setTimeout(() => {
      setPhase("opening");
      setShowBeams(true);
      haptic([40, 60, 40]);
      const result = claim();
      if (result) setReward(result);
    }, 900);
    const t3 = setTimeout(() => {
      setBoxFading(true);
      cardRef.current?.classList.add("animate-pulse-scale");
    }, 1000);
    const t4 = setTimeout(() => setShowBeams(false), 1500);
    const t5 = setTimeout(() => {
      cardRef.current?.classList.remove("animate-pulse-scale");
    }, 1500);
    const t6 = setTimeout(() => {
      setOpen(false);
      setPhase("idle");
      setReward(null);
      setBoxFading(false);
      unlocking.current = false;
    }, 4500);

    timeoutsRef.current = [t1, t2, t3, t4, t5, t6];
  }, [claim]);

  if (!canClaim() && !open) return null;

  return (
    <>
      <style>{`
        @keyframes pulse-scale {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .animate-pulse-scale {
          animation: pulse-scale 0.4s ease-out;
        }
        @keyframes confetti-fly {
          0% { transform: translate(0, 0) rotate(0deg) scale(0); opacity: 1; }
          15% { transform: translate(calc(var(--cx) * 0.4), calc(var(--cy) * -0.6)) rotate(calc(var(--cr) * 0.3)) scale(var(--cs)); opacity: 1; }
          50% { transform: translate(calc(var(--cx) * 0.8), calc(var(--cy) * -1.2)) rotate(calc(var(--cr) * 0.7)) scale(calc(var(--cs) * 0.9)); opacity: 0.85; }
          100% { transform: translate(var(--cx), calc(var(--cy) * -1.8)) rotate(var(--cr)) scale(calc(var(--cs) * 0.5)); opacity: 0; }
        }
        .confetti-particle {
          position: absolute;
          animation: confetti-fly 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>

      <GlassCard intensity="light" className="mb-6 overflow-hidden sm:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleOpen}
          className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-muted/20 sm:p-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Login Bonus
            </p>
            <p className="mt-0.5 font-heading text-lg font-bold">Tap to claim your gift!</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Free gift every day &mdash; XP, Gems &amp; more!
            </p>
          </div>
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-14 items-center justify-center rounded-2xl bg-warning/15 sm:size-16"
          >
            <Gift className="size-7 text-warning sm:size-8" />
          </motion.span>
        </motion.div>
      </GlassCard>

      <AnimatePresence>
        {open && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            style={{ pointerEvents: "auto" }}
          >
            <motion.div
              key="modal-content"
              ref={cardRef}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border bg-card shadow-2xl"
              style={{ pointerEvents: "none" }}
            >
              <div className="flex flex-col items-center px-8 pt-14 pb-12">
                <GiftBox phase={phase} fadingOut={boxFading} />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: boxFading ? 0 : 1 }}
                  className="mt-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {phase === "idle" && "Preparing your gift..."}
                  {phase === "shaking" && "Shaking..."}
                  {phase === "opening" && "Opening..."}
                </motion.p>
              </div>

              {showBeams && <LightBeams />}

              <AnimatePresence mode="wait">
                {reward && (
                  <motion.div
                    key="reward"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.05, type: "spring", stiffness: 100, damping: 15 }}
                    className="absolute inset-0 flex items-center justify-center px-8 pt-12 pb-10"
                  >
                    <ConfettiExplosion />
                    <RewardReveal reward={reward} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
