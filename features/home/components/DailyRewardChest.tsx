"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Zap, Gem, Snowflake, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { claimDailyReward } from "@/services/player-actions";
import { toast } from "sonner";

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

function RadialFlash() {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0.9 }}
      animate={{ scale: 2.4, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pointer-events-none absolute size-32 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9), rgba(245,158,11,0.5) 40%, transparent 70%)" }}
    />
  );
}

function ShockwaveRing() {
  return (
    <motion.div
      initial={{ width: 40, height: 40, opacity: 0.7 }}
      animate={{ width: 240, height: 240, opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="pointer-events-none absolute rounded-full border-2"
      style={{ borderColor: "rgba(245,158,11,0.6)" }}
    />
  );
}

function OrbBeams() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: [0, 0.7, 0], scaleX: [0, 1.2, 0.3] }}
          transition={{ duration: 0.9, delay: i * 0.05, ease: "easeOut" }}
          className="absolute h-1 origin-center"
          style={{
            width: 120 + i * 20,
            background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)",
            transform: `rotate(${i * 60}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function OrbitingSparkles() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      className="pointer-events-none absolute inset-0"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 62;
        const y = Math.sin(angle) * 62;
        return (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.2, 0.7] }}
            transition={{ duration: 1.8, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 size-1.5 rounded-full bg-amber-200"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              boxShadow: "0 0 6px rgba(251,191,36,0.9)",
            }}
          />
        );
      })}
    </motion.div>
  );
}

function EnergyOrb({ phase, fadingOut }: { phase: "idle" | "shaking" | "opening"; fadingOut: boolean }) {
  const isOpen = phase === "opening";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {/* Rotating aura ring behind the orb */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full"
        style={{
          width: 150,
          height: 150,
          background:
            "conic-gradient(from 0deg, transparent, rgba(245,158,11,0.35), transparent, rgba(129,140,248,0.3), transparent)",
          filter: "blur(6px)",
          opacity: 0.7,
        }}
      />

      {isOpen && <RadialFlash />}
      {isOpen && <ShockwaveRing />}
      {isOpen && <OrbBeams />}

      {/* The orb */}
      <motion.div
        animate={
          fadingOut
            ? { opacity: 0, scale: 0.7 }
            : isOpen
              ? { scale: 1.35 }
              : { scale: [1, 1.06, 1] }
        }
        transition={
          fadingOut
            ? { duration: 0.6, ease: "easeOut" }
            : isOpen
              ? { duration: 0.5, ease: "easeOut" }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative"
        style={{ width: 132, height: 132 }}
      >
        {/* Outer soft bloom */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 60px 12px rgba(245,158,11,0.4)" }}
        />
        {/* Rotating conic halo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #fbbf24, #f59e0b, #818cf8, #22d3ee, #fbbf24)",
          }}
        />
        {/* Thin white rim */}
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ border: "1.5px solid rgba(255,255,255,0.7)" }}
        />
        {/* Radial glass core */}
        <div
          className="absolute inset-[6px] flex items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92), rgba(255,255,255,0.15) 45%, rgba(245,158,11,0.28) 100%)",
          }}
        >
          <Sparkles
            className="size-10 text-white"
            style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.85))" }}
          />
        </div>
      </motion.div>

      <OrbitingSparkles />
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

      <motion.p
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Your Reward
      </motion.p>

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
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "shaking" | "opening">("idle");
  const [reward, setReward] = useState<Reward | null>(null);
  const [showBeams, setShowBeams] = useState(false);
  const [boxFading, setBoxFading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const unlocking = useRef(false);
  const alive = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleOpen = useCallback(async () => {
    if (unlocking.current) return;
    unlocking.current = true;
    setOpen(true);
    setReward(null);
    setPhase('idle');
    setBoxFading(false);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [setTimeout(() => setPhase('shaking'), 300)];
    try {
      const [result] = await Promise.all([claimDailyReward(), new Promise((done) => setTimeout(done, 900))]);
      if (!alive.current) return;
      if (!result) {
        setOpen(false);
        unlocking.current = false;
        toast.info("Today's gift has already been claimed.");
        return;
      }
      setPhase('opening');
      setShowBeams(true);
      setBoxFading(true);
      setReward(result);
      haptic([40, 60, 40]);
      timeoutsRef.current.push(setTimeout(() => setShowBeams(false), 600));
      timeoutsRef.current.push(setTimeout(() => {
        setOpen(false);
        setPhase('idle');
        setReward(null);
        setBoxFading(false);
        unlocking.current = false;
      }, 3500));
    } catch (error) {
      if (!alive.current) return;
      setOpen(false);
      unlocking.current = false;
      toast.error(error instanceof Error ? error.message : 'Connect and retry.');
    }
  }, []);

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
              className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-amber-300/70 via-amber-500/40 to-indigo-400/50 p-[1.5px] shadow-2xl"
              style={{ pointerEvents: "none" }}
            >
              <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-card/95 backdrop-blur-2xl">
                {/* Ambient gold bloom */}
                <div
                  className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: 320, height: 320, background: "radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)" }}
                />

                <div className="relative flex flex-col items-center px-8 pt-12 pb-12">
                  <EnergyOrb phase={phase} fadingOut={boxFading} />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: boxFading ? 0 : 1 }}
                    className="mt-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {phase === "idle" && "A Reward Awaits"}
                    {phase === "shaking" && "Charging…"}
                    {phase === "opening" && "Unlocking…"}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
