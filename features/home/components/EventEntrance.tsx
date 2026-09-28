"use client";

// Event "Moments" — the app-open cinematic entrance (port of Flutter
// `event_entrance.dart`). On the first show of an active Moment per session, a
// particle field over an accent-tinted scrim dissolves to reveal the app.
// Tap to skip; honours reduced-motion (skipped entirely).

import { useEffect, useRef, useState } from "react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { type Rgba, rgba, lerp, hex, fromArgb, WHITE, BLACK } from "@/lib/events/event-colors";
import { paintBat, batFlap } from "@/lib/events/event-bat";
import type { EventParticle, EventTheme } from "@/lib/events/event-theme";

const DURATION = 2400;
const playedThisSession = new Set<string>();

interface P {
  x0: number; y0: number; vx: number; vy: number; size: number;
  delay: number; spin: number; wobble: number; hue: number; phase: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function spawn(kind: EventParticle, r: () => number): P[] {
  const rng = (a: number, b: number) => a + r() * (b - a);
  const ph = () => rng(0, Math.PI * 2);
  const base = (n: number, f: (i: number) => Omit<P, "phase">): P[] => Array.from({ length: n }, (_, i) => ({ ...f(i), phase: ph() }));
  switch (kind) {
    case "bats": return base(28, () => { const x0 = rng(0.05, 0.95), depth = rng(0, 1); return { x0, y0: rng(0.5, 1.25), vx: (x0 - 0.5) * rng(0.7, 1.6) + rng(-0.18, 0.18), vy: rng(-1.5, -1.0) - depth * 0.25, size: 20 + depth * 46, delay: rng(0, 0.34), spin: rng(7, 12), wobble: rng(0.02, 0.07), hue: depth }; });
    case "snow": return base(46, () => ({ x0: rng(0, 1), y0: rng(-0.2, 0.4), vx: rng(-0.06, 0.06), vy: rng(0.7, 1.25), size: rng(3, 8), delay: rng(0, 0.5), spin: rng(1, 2.5), wobble: rng(0.02, 0.05), hue: rng(0, 0.4) }));
    case "petals": case "leaves": return base(34, () => ({ x0: rng(0, 1), y0: rng(-0.25, 0.3), vx: rng(-0.12, 0.12), vy: rng(0.75, 1.2), size: rng(10, 20), delay: rng(0, 0.45), spin: rng(2, 5), wobble: rng(0.03, 0.08), hue: rng(0, 1) }));
    case "confetti": return base(56, () => { const a = rng(-Math.PI, Math.PI), sp = rng(0.6, 1.3); return { x0: 0.5, y0: 0.55, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.4, size: rng(7, 14), delay: rng(0, 0.12), spin: rng(4, 9), wobble: 0, hue: rng(0, 1) }; });
    case "fireworks": return base(60, (i) => { const a = (i / 60) * Math.PI * 2 + rng(-0.1, 0.1), sp = rng(0.5, 0.95); return { x0: rng(0.35, 0.65), y0: rng(0.35, 0.5), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rng(3, 7), delay: rng(0, 0.2), spin: 0, wobble: 0, hue: rng(0, 1) }; });
    case "hearts": return base(28, () => ({ x0: rng(0.1, 0.9), y0: rng(0.8, 1.2), vx: rng(-0.08, 0.08), vy: rng(-1.15, -0.8), size: rng(14, 30), delay: rng(0, 0.4), spin: rng(1, 3), wobble: rng(0.03, 0.07), hue: rng(0, 0.5) }));
    case "diyas": return base(30, () => ({ x0: rng(0.05, 0.95), y0: rng(0.85, 1.15), vx: rng(-0.04, 0.04), vy: rng(-1.05, -0.7), size: rng(6, 14), delay: rng(0, 0.45), spin: rng(2, 4), wobble: rng(0.02, 0.05), hue: rng(0, 0.6) }));
    default: return base(38, () => ({ x0: rng(0, 1), y0: rng(0, 1), vx: rng(-0.1, 0.1), vy: rng(-0.35, -0.05), size: rng(6, 16), delay: rng(0, 0.55), spin: rng(2, 5), wobble: rng(0.02, 0.06), hue: rng(0, 1) }));
  }
}

function eOut(x: number): number { return 1 - Math.pow(1 - x, 3); }
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function paintEntrance(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number,
  field: P[], event: EventTheme, accent: Rgba, bannerFrom: Rgba, bannerTo: Rgba,
): void {
  const reveal = t < 0.5 ? 0 : eOut((t - 0.5) / 0.5);
  const scrimAlpha = clamp01(1 - reveal);
  const shortest = Math.min(W, H);
  const mix = (h: number) => h < 0.5 ? lerp(accent, bannerFrom, h * 2) : lerp(bannerFrom, bannerTo, (h - 0.5) * 2);

  if (scrimAlpha > 0.001) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(lerp(BLACK, bannerFrom, 0.28), scrimAlpha));
    g.addColorStop(1, rgba(BLACK, scrimAlpha));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const glow = Math.sin(clamp01(t) * Math.PI);
    const rg = ctx.createRadialGradient(0.5 * W, 0.46 * H, 0, 0.5 * W, 0.46 * H, shortest * 0.9);
    rg.addColorStop(0, rgba(accent, 0.28 * glow * scrimAlpha));
    rg.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  const scrimFloor = clamp01(1 - reveal * 0.85);
  for (const d of field) {
    const local = clamp01((t - d.delay) / (1 - d.delay));
    if (local <= 0) continue;
    const e = eOut(local);
    const wob = Math.sin(d.phase + local * 4 * Math.PI) * d.wobble;
    const nx = d.x0 + d.vx * e + wob;
    const ny = d.y0 + d.vy * e;
    const cx = nx * W, cy = ny * H;
    const fadeIn = clamp01(local / 0.12);
    const fadeOut = local > 0.7 ? 1 - (local - 0.7) / 0.3 : 1;
    const alpha = clamp01(fadeIn * fadeOut * scrimFloor);
    if (alpha <= 0.01) continue;
    drawEntrance(ctx, cx, cy, local, alpha, d, event.particle, accent, mix);
  }

  paintTitle(ctx, W, H, t, event, scrimAlpha);
}

function paintTitle(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, event: EventTheme, scrimAlpha: number): void {
  const a = t < 0.2 ? t / 0.2 : t < 0.62 ? 1 : clamp01(1 - (t - 0.62) / 0.28);
  const vis = a * scrimAlpha;
  if (vis <= 0.01) return;
  const scale = 0.85 + 0.15 * eOut(clamp01(t / 0.5));
  const cx = 0.5 * W, cy = 0.46 * H;
  ctx.save();
  ctx.globalAlpha = vis;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${64 * scale}px "Apple Color Emoji","Segoe UI Emoji",system-ui,sans-serif`;
  ctx.fillText(event.emoji, cx, cy - 6);
  ctx.fillStyle = rgba(WHITE, 1);
  ctx.textBaseline = "top";
  ctx.font = `700 ${22 * scale}px system-ui,sans-serif`;
  ctx.save();
  // Approximate Flutter's 0.3 letterSpacing.
  const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  anyCtx.letterSpacing = "0.3px";
  ctx.fillText(event.short, cx, cy + 8);
  ctx.restore();
  ctx.restore();
}

const E_LEAF = hex(0xb45309);
const E_PETAL = hex(0xf9a8d4);
const E_WARM = hex(0xfff1b8);

function drawEntrance(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, local: number, alpha: number,
  d: P, kind: EventParticle, accent: Rgba, mix: (h: number) => Rgba,
): void {
  const s = d.size;
  switch (kind) {
    case "bats": {
      const flap = batFlap(local, d.phase, d.spin * 0.5);
      const heading = Math.atan2(d.vy, d.vx) + Math.PI / 2;
      const roll = Math.sin(d.phase + local * 6 * Math.PI) * 0.12;
      const depth = d.hue;
      const body = lerp(accent, BLACK, 0.35 + depth * 0.35);
      paintBat(ctx, { center: { x: cx, y: cy }, span: s, flap, rotation: heading + roll, color: body, alpha: clamp01(alpha * (0.55 + depth * 0.45)), glow: depth > 0.6 });
      break;
    }
    case "snow":
      ctx.fillStyle = rgba(WHITE, alpha * 0.9);
      ctx.beginPath(); ctx.arc(cx, cy, 0.5 * s, 0, Math.PI * 2); ctx.fill();
      break;
    case "confetti":
    case "jigsaw":
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.phase + local * d.spin * 2 * Math.PI);
      ctx.fillStyle = rgba(mix(d.hue), alpha);
      ctx.fillRect(-s / 2, -0.25 * s, s, 0.5 * s);
      ctx.restore();
      break;
    case "fireworks":
      ctx.fillStyle = rgba(mix(d.hue), alpha);
      ctx.beginPath(); ctx.arc(cx, cy, 0.5 * s, 0, Math.PI * 2); ctx.fill();
      break;
    case "hearts": {
      const w = s, h = s;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 0.28 * h);
      ctx.bezierCurveTo(cx + 0.5 * w, cy - 0.3 * h, cx + 0.6 * w, cy + 0.18 * h, cx, cy + 0.55 * h);
      ctx.bezierCurveTo(cx - 0.6 * w, cy + 0.18 * h, cx - 0.5 * w, cy - 0.3 * h, cx, cy + 0.28 * h);
      ctx.closePath();
      ctx.fillStyle = rgba(mix(d.hue), alpha); ctx.fill();
      break;
    }
    case "petals":
    case "leaves": {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.phase + local * d.spin * Math.PI);
      const baseCol = kind === "leaves" ? lerp(E_LEAF, accent, d.hue) : lerp(E_PETAL, accent, d.hue * 0.6);
      ctx.beginPath(); ctx.ellipse(0, 0, s / 2, (0.55 * s) / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(baseCol, alpha); ctx.fill();
      ctx.restore();
      break;
    }
    case "diyas": {
      const warm = lerp(accent, E_WARM, 0.5);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
      g.addColorStop(0, rgba(warm, alpha)); g.addColorStop(1, rgba(warm, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(WHITE, alpha);
      ctx.beginPath(); ctx.arc(cx, cy, 0.32 * s, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: {
      const tw = 0.55 + 0.45 * Math.sin(d.phase + local * d.spin * 2 * Math.PI);
      ctx.save(); ctx.translate(cx, cy);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 0.5 * s : 0.16 * s;
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(mix(d.hue), alpha * tw); ctx.fill();
      ctx.restore();
      break;
    }
  }
}

export function EventEntrance() {
  const { event } = useActiveMoment();
  const [playing, setPlaying] = useState<EventTheme | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!event) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (playedThisSession.has(event.id)) return;
    playedThisSession.add(event.id);
    if (reduce) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) setPlaying(event); });
    return () => { cancelled = true; };
  }, [event]);

  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = playing.darkPalette;
    const accent = fromArgb(p.accent), bannerFrom = fromArgb(p.bannerFrom), bannerTo = fromArgb(p.bannerTo);
    const field = spawn(playing.particle, mulberry32(hashStr(playing.id)));
    let raf = 0, dpr = 1, skipped = false, skipStart = 0, skipFrom = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    const start = performance.now();
    skipRef.current = () => { if (!skipped) { skipped = true; skipStart = performance.now(); skipFrom = Math.min(1, (skipStart - start) / DURATION); } };
    const frame = (now: number) => {
      let t: number;
      if (skipped) {
        const st = Math.min(1, (now - skipStart) / 320);
        t = skipFrom + (1 - skipFrom) * (1 - Math.pow(1 - st, 2));
      } else {
        t = Math.min(1, (now - start) / DURATION);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      paintEntrance(ctx, window.innerWidth, window.innerHeight, t, field, playing, accent, bannerFrom, bannerTo);
      if (t >= 1) { setPlaying(null); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [playing]);

  if (!playing) return null;
  return (
    <div className="fixed inset-0 z-[300]" onClick={() => skipRef.current()}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
