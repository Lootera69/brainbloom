"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Gem, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "achievement" | "level-up";
  title: string;
  subtitle?: string;
  rewards?: { xp?: number; gems?: number };
}

const CONFETTI_COLORS = ["#f59e0b", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#ec4899"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      particlesRef.current = [];
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < 60; i++) {
      particlesRef.current.push({
        x: randomBetween(0, canvas.width),
        y: -20,
        vx: randomBetween(-6, 6),
        vy: randomBetween(2, 8),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: randomBetween(4, 10),
        life: 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.005;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (particlesRef.current.length > 0) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active]);

  return canvasRef;
}

export function CelebrationModal({ open, onClose, type, title, subtitle, rewards }: Props) {
  const canvasRef = useConfetti(open);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}>
          <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border bg-card p-8 text-center shadow-2xl">
            <button onClick={onClose}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>

            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className={cn(
                "mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl",
                type === "achievement" ? "bg-amber-500/10" : "bg-primary/10",
              )}>
              <Sparkles className={cn("size-8", type === "achievement" ? "text-amber-500" : "text-primary")} />
            </motion.div>

            <h2 className="font-heading text-xl font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}

            {rewards && (rewards.xp || rewards.gems) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="mt-5 flex items-center justify-center gap-4">
                {rewards.xp && (
                  <span className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                    <Zap className="size-4" />+{rewards.xp} XP
                  </span>
                )}
                {rewards.gems && (
                  <span className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-500">
                    <Gem className="size-4" />+{rewards.gems} Gems
                  </span>
                )}
              </motion.div>
            )}

            <button onClick={onClose}
              className="mt-6 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
              Awesome!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
