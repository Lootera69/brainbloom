"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Zap, Gem, Snowflake, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { cn } from "@/lib/utils";

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

function ConfettiExplosion() {
  const colors = ["#f43f5e", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    x: (i % 6 - 3) * 20 + (i * 7) % 15,
    y: -(40 + (i * 11) % 60),
    rotate: (i * 37) % 360,
    scale: 0.6 + (i % 5) * 0.15,
    color: colors[i % colors.length],
    delay: (i * 0.03) % 0.3,
    type: i % 3 === 0 ? "circle" : i % 3 === 1 ? "square" : "line",
  }));

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x * 3,
            y: p.y * 2.5,
            opacity: [1, 1, 0],
            rotate: p.rotate,
            scale: [0, p.scale, 0.3],
          }}
          transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
          className="absolute"
          style={{
            width: p.type === "line" ? 8 : 6,
            height: p.type === "line" ? 3 : 6,
            borderRadius: p.type === "circle" ? "50%" : p.type === "square" ? 2 : 0,
            backgroundColor: p.color,
          }}
        />
      ))}
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
          animate={{
            opacity: [0, 0.6, 0],
            scaleX: [0, 1, 0.5],
          }}
          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
          className="absolute h-1 origin-bottom"
          style={{
            width: 120 + i * 30,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
            transform: `rotate(${45 + i * 90}deg)`,
            bottom: "50%",
          }}
        />
      ))}
    </div>
  );
}

function SparkleRing() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * 360;
        const distance = 40 + (i * 3) % 20;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: Math.cos((angle * Math.PI) / 180) * distance,
              y: Math.sin((angle * Math.PI) / 180) * distance,
            }}
            transition={{ duration: 1.5, delay: i * 0.04, ease: "easeOut", repeat: Infinity, repeatDelay: 2 }}
            className="absolute size-1.5 rounded-full bg-white"
          />
        );
      })}
    </div>
  );
}

function GiftBox({ phase }: { phase: "idle" | "shaking" | "opening" }) {
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
        <svg width="100" height="112" viewBox="0 0 80 90">
          {/* Lid */}
          <motion.g
            animate={isOpen ? { y: -40, rotate: -15, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
            transition={isOpen ? { duration: 0.5, ease: "easeOut" } : { duration: 0.3 }}
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
        </svg>
      </motion.div>

      {phase === "idle" && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-4 rounded-full blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)" }}
        />
      )}
    </div>
  );
}

function RewardReveal({ reward }: { reward: { type: "xp" | "gems" | "streak-freeze"; amount: number; label: string } }) {
  const Icon = rewardIcons[reward.type];
  const gradient = rewardColors[reward.type];
  const color = rewardSolidColors[reward.type];

  return (
    <div className="relative flex flex-col items-center py-2">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute size-36 rounded-full blur-3xl sm:size-44"
        style={{ backgroundColor: color }}
      />

      <SparkleRing />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.1 }}
        className="relative mb-4"
      >
        <div className={cn("flex size-20 items-center justify-center rounded-full p-0.5 sm:size-24", `bg-gradient-to-br ${gradient}`)}>
          <div className="flex size-full items-center justify-center rounded-full bg-card">
            <Icon className="size-10 sm:size-12" style={{ color }} strokeWidth={1.5} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 1.5] }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          className={cn("absolute inset-0 rounded-full opacity-0", `bg-gradient-to-br ${gradient}`)}
          style={{ filter: "blur(4px)" }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 120 }}
        className="text-center"
      >
        <motion.p
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
          className={cn("font-heading text-3xl font-extrabold sm:text-4xl", `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`)}
        >
          +{reward.amount} {rewardNames[reward.type]}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-1.5 text-sm text-muted-foreground"
        >
          {reward.type === "streak-freeze" ? "Your streak is safe for one day!" : "Come back tomorrow for more!"}
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 120, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
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
  const [reward, setReward] = useState<{ type: "xp" | "gems" | "streak-freeze"; amount: number; label: string } | null>(null);
  const [showBeams, setShowBeams] = useState(false);
  const unlocking = useRef(false);

  // Block body scroll while modal is open
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

    // Shake
    const t1 = setTimeout(() => setPhase("shaking"), 300);
    // Open
    const t2 = setTimeout(() => {
      setPhase("opening");
      setShowBeams(true);
      const result = claim();
      if (result) setReward(result);
    }, 900);
    // Confetti + reveal
    const t3 = setTimeout(() => setShowBeams(false), 1400);
    // Auto-close after reward display
    const t4 = setTimeout(() => {
      setOpen(false);
      setPhase("idle");
      setReward(null);
      unlocking.current = false;
    }, 3500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [claim]);

  if (!canClaim()) return null;

  return (
    <>
      {/* Trigger card */}
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

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
            style={{ pointerEvents: "auto" }}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border bg-card shadow-2xl"
              style={{ pointerEvents: "none" }}
            >
              {/* Animating gift (shaking / opening) */}
              {!reward && (
                <div className="flex flex-col items-center px-8 pt-14 pb-12">
                  <GiftBox phase={phase} />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {phase === "idle" && "Preparing your gift..."}
                    {phase === "shaking" && "Shaking..."}
                    {phase === "opening" && "Opening..."}
                  </motion.p>
                </div>
              )}

              {/* Light beams during opening */}
              {showBeams && <LightBeams />}

              {/* Reward reveal */}
              {reward && (
                <div className="relative px-8 pt-12 pb-10">
                  <ConfettiExplosion />
                  <RewardReveal reward={reward} />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
