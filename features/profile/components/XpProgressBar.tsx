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
interface Streak { x: number; y: number; length: number; opacity: number; thickness: number; vx: number; phase: number; }
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tint = particleColorFn(premium);

    const rng = mulberry32(42);
    const sparkles: Sparkle[] = [];
    const streaks: Streak[] = [];
    const waves: Wave[] = [];
    for (let i = 0; i < 60; i++)
      sparkles.push({ x: rng(), y: rng(), size: 0.5 + rng() * 1.5, vx: 0.003 + rng() * 0.006, phase: rng() * Math.PI * 2, twinkle: 3 + rng() * 4 });
    for (let i = 0; i < 200; i++)
      streaks.push({ x: rng() * 1.2 - 0.1, y: rng(), length: 20 + rng() * 40, opacity: 0.15 + rng() * 0.25, thickness: 0.5 + rng(), vx: 0.002 + rng() * 0.004, phase: rng() * Math.PI * 2 });
    for (let i = 0; i < 3; i++) waves.push({ phase: (i / 3) * Math.PI * 2, speed: 0.8 + rng() * 0.4 });
    const draw = (fillW: number, time: number) => {
      const w = Math.max(1, fillW);
      const h = BAR_HEIGHT;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      // Layer 2 — comet streaks.
      for (const s of streaks) {
        const px = s.x * w;
        const py = s.y * h;
        const alpha = s.opacity * (Math.sin(time * 2 + s.phase) * 0.3 + 0.7);
        const [r, g, b] = tint(clamp01(s.x / w));
        const tailX = px - s.length;
        const grad = ctx.createLinearGradient(tailX, py, px, py);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(0.7, `rgba(${r},${g},${b},${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, py);
        ctx.lineTo(px, py);
        ctx.stroke();
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

      // Diagonal shimmer sweep (-18°).
      const bandW = w * 0.5 + h * 2;
      const bx = -bandW + (w + bandW * 2) * ((time * 0.3) % 1);
      const cx = bx + bandW / 2;
      ctx.save();
      ctx.translate(cx, h / 2);
      ctx.rotate(-Math.PI / 10);
      ctx.translate(-cx, -h / 2);
      const sg = ctx.createLinearGradient(bx, 0, bx + bandW, 0);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.25, "rgba(255,255,255,0.06)");
      sg.addColorStop(0.5, "rgba(255,255,255,0.12)");
      sg.addColorStop(0.75, "rgba(255,255,255,0.06)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(bx, -h, bandW, h * 3);
      ctx.restore();
    };

    if (reduce) {
      fill.style.width = `${value * 100}%`;
      const fillW = track.clientWidth * value;
      if (fillW > 0) draw(fillW, 0);
      return;
    }

    const startTs = performance.now();
    let last = startTs;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - startTs) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const scale = Math.max(0.2, Math.min(3, dt * 60));
      for (const s of streaks) { s.x += s.vx * scale; if (s.x > 1.2) s.x -= 1.2; }
      for (const sp of sparkles) { sp.x += sp.vx * scale; if (sp.x > 1) sp.x -= 1; }
      const grow = Math.min(1, elapsed / 1.5);
      const eased = 1 - Math.pow(1 - grow, 3);
      const v = value * eased;
      fill.style.width = `${v * 100}%`;
      const fillW = track.clientWidth * v;
      if (fillW > 0) draw(fillW, elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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

