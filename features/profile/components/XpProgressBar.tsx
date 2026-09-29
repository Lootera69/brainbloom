"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

const BAR_HEIGHT = 27;

const FREE_FILL =
  "linear-gradient(to right, #1e0a4a, #3b1578, #5b21b6, #7c3aed, #8b5cf6, #a78bfa, #c4b5fd, #e9e0ff, #ffffff)";
const PREMIUM_FILL =
  "linear-gradient(to right, #78350f, #b45309, #d97706, #fbbf24, #fcd34d, #fde68a, #fef3c7, #ffffff)";

// Deterministic PRNG (mulberry32) so the particle field is stable across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Sparkle { x: number; y: number; size: number; vx: number; phase: number; twinkle: number; }
interface Streak { x: number; y: number; length: number; opacity: number; thickness: number; vx: number; phase: number; grad: CanvasGradient | null; }
interface Wave { phase: number; speed: number; }

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t); }
function rgbOf(hex: number) { return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] as const; }
function mixRgb(a: number, b: number, t: number): [number, number, number] {
  const [ar, ag, ab] = rgbOf(a);
  const [br, bg, bb] = rgbOf(b);
  return [Math.round(lerp(ar, br, t)), Math.round(lerp(ag, bg, t)), Math.round(lerp(ab, bb, t))];
}

// Streak/sparkle tint ramp, sampled along the fill (mirrors Flutter _particleColor).
function particleColorFn(premium: boolean) {
  return (x: number): [number, number, number] => {
    if (premium) {
      return x < 0.5 ? mixRgb(0xd97706, 0xfcd34d, x / 0.5) : mixRgb(0xfcd34d, 0xffffff, (x - 0.5) / 0.5);
    }
    return x < 0.5 ? mixRgb(0x7c3aed, 0xa78bfa, x / 0.5) : mixRgb(0xa78bfa, 0xffffff, (x - 0.5) / 0.5);
  };
}
export function XpProgressBar({
  level,
  progress,
  xpToNext,
  premium,
}: {
  level: number;
  progress: number;
  xpToNext: number;
  premium: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const value = clamp01(progress);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fill = fillRef.current;
    const track = fill?.parentElement;
    if (!canvas || !fill || !track) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // iOS renders at dpr 3 — a dpr-2 backing store is plenty for particles and
    // keeps per-frame fill cost far lower on iPhones.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tint = particleColorFn(premium);

    const rng = mulberry32(42);
    const sparkles: Sparkle[] = [];
    const streaks: Streak[] = [];
    const waves: Wave[] = [];
    for (let i = 0; i < 60; i++)
      sparkles.push({ x: rng(), y: rng(), size: 0.5 + rng() * 1.5, vx: 0.003 + rng() * 0.006, phase: rng() * Math.PI * 2, twinkle: 3 + rng() * 4 });
    for (let i = 0; i < 200; i++)
      streaks.push({ x: rng() * 1.2 - 0.1, y: rng(), length: 20 + rng() * 40, opacity: 0.15 + rng() * 0.25, thickness: 0.5 + rng(), vx: 0.002 + rng() * 0.004, phase: rng() * Math.PI * 2, grad: null });
    for (let i = 0; i < 3; i++) waves.push({ phase: (i / 3) * Math.PI * 2, speed: 0.8 + rng() * 0.4 });

    // Canvas is laid out at the FINAL fill width and clipped by the fill div —
    // it never resizes while the bar grows, so iOS never reallocates a backing
    // store mid-animation. Gradients are created once per streak (their colour
    // is static) and painted under a translate, instead of 200× per frame.
    let cssW = 1;
    let bandW = 1;
    let shimmerGrad: CanvasGradient | null = null;

    const layout = () => {
      const w = Math.max(1, Math.round(track.clientWidth * value));
      if (w === cssW && shimmerGrad) return;
      cssW = w;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(BAR_HEIGHT * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${BAR_HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of streaks) {
        s.grad = ctx.createLinearGradient(-s.length, 0, 0, 0);
        const [r, g, b] = tint(clamp01(s.x));
        s.grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        s.grad.addColorStop(0.7, `rgba(${r},${g},${b},0.5)`);
        s.grad.addColorStop(1, "rgba(255,255,255,1)");
      }
      bandW = cssW * 0.5 + BAR_HEIGHT * 2;
      shimmerGrad = ctx.createLinearGradient(0, 0, bandW, 0);
      shimmerGrad.addColorStop(0, "rgba(255,255,255,0)");
      shimmerGrad.addColorStop(0.25, "rgba(255,255,255,0.06)");
      shimmerGrad.addColorStop(0.5, "rgba(255,255,255,0.12)");
      shimmerGrad.addColorStop(0.75, "rgba(255,255,255,0.06)");
      shimmerGrad.addColorStop(1, "rgba(255,255,255,0)");
    };

    const draw = (time: number) => {
      const w = cssW;
      const h = BAR_HEIGHT;
      ctx.clearRect(0, 0, w, h);

      // Layer 1 — drifting sine waves.
      for (const wv of waves) {
        const wt = time * wv.speed + wv.phase;
        const yOff = Math.sin(wt) * (h * 0.15) + h * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, yOff);
        for (let x = 0; x <= w; x += 4) ctx.lineTo(x, yOff + Math.sin(x * 0.02 + wt * 2) * 3);
        ctx.strokeStyle = `rgba(167,139,250,${Math.max(0, 0.03 + Math.sin(wt) * 0.02)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Layer 2 — comet streaks (cached gradients, moved by translate).
      for (const s of streaks) {
        const px = s.x * w;
        const py = s.y * h;
        const alpha = s.opacity * (Math.sin(time * 2 + s.phase) * 0.3 + 0.7);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(px, py);
        ctx.strokeStyle = s.grad!;
        ctx.lineWidth = s.thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-s.length, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.restore();
      }
      // Layer 3 — twinkling sparkles.
      for (const sp of sparkles) {
        const tw = Math.sin(time * sp.twinkle + sp.phase);
        if (tw < 0.3) continue;
        ctx.fillStyle = `rgba(255,255,255,${(tw - 0.3) / 0.7})`;
        ctx.beginPath();
        ctx.arc(sp.x * w, sp.y * h, sp.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 4 — diagonal shimmer sweep (the one large-motion effect; skipped
      // for prefers-reduced-motion, where tiny drifting particles still run).
      if (!reduce && shimmerGrad) {
        const bandPos = (time * 0.3) % 1;
        const bx = -bandW + (w + bandW * 2) * bandPos;
        const cx = bx + bandW / 2;
        ctx.save();
        ctx.translate(cx, h / 2);
        ctx.rotate(-Math.PI / 10);
        ctx.translate(-cx, -h / 2);
        ctx.translate(bx, 0);
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(0, -h, bandW, h * 3);
        ctx.restore();
      }
    };

    layout();

    const startTs = performance.now();
    let raf = 0;
    let growRaf = 0;
    let last = startTs;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const scale = Math.max(0.2, Math.min(3, dt * 60));
      for (const s of streaks) { s.x += s.vx * scale; if (s.x > 1.2) s.x -= 1.2; }
      for (const sp of sparkles) { sp.x += sp.vx * scale; if (sp.x > 1) sp.x -= 1; }
      layout();
      draw((now - startTs) / 1000);
      raf = requestAnimationFrame(tick);
    };

    // One-shot fill grow-in, independent of the particle loop so the shimmer
    // keeps running after the bar has settled.
    if (!reduce) {
      const growTick = (now: number) => {
        const e = Math.min(1, (now - startTs) / 1500);
        fill.style.width = `${value * (1 - Math.pow(1 - e, 3)) * 100}%`;
        if (e < 1) growRaf = requestAnimationFrame(growTick);
      };
      growRaf = requestAnimationFrame(growTick);
    } else {
      fill.style.width = `${value * 100}%`;
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(growRaf);
    };
  }, [value, premium]);

  const glow = premium ? "245,158,11" : "167,139,250";
  const trackColor = premium
    ? "color-mix(in srgb, #f59e0b 15%, transparent)"
    : "color-mix(in srgb, var(--primary) 14%, transparent)";

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        {premium ? (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5">
            <Sparkles className="size-3.5 shrink-0 text-white" />
            <span className="truncate text-xs font-bold text-white">Level {level}</span>
          </span>
        ) : (
          <span className="truncate text-sm font-bold text-foreground/90">Level {level}</span>
        )}
        <span className="shrink-0 text-[11px] text-muted-foreground">{xpToNext} XP remaining</span>
      </div>

      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          height: BAR_HEIGHT,
          background: trackColor,
          boxShadow: `inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.04), 0 0 6px rgba(${glow},${0.1 + 0.15 * value})`,
        }}
      >
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 overflow-hidden rounded-xl"
          style={{ width: 0, background: premium ? PREMIUM_FILL : FREE_FILL }}
        >
          <canvas ref={canvasRef} className="absolute left-0 top-0" />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-[60px]"
            style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15))" }}
          />
        </div>
      </div>
    </div>
  );
}
