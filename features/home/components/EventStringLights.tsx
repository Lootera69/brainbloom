"use client";

// Event "Moments" — festive string lights (port of Flutter `event_string_lights.dart`).
// A palette-driven garland of fairy lights on a gently sagging wire, twinkling
// out of phase. Every active Moment gets a set (bespoke for diyas/snow/hearts/
// bats/leaves, palette fallback otherwise). Renders nothing off-event.

import { useEffect, useRef } from "react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { type Rgba, rgba, lerp, hex, fromArgb, WHITE } from "@/lib/events/event-colors";
import type { EventParticle, EventPalette } from "@/lib/events/event-theme";

const LOOP_MS = 6000;
const WARM_WHITE = hex(0xfff3d6);

function bulbColors(kind: EventParticle, p: EventPalette): Rgba[] {
  const accent = fromArgb(p.accent);
  switch (kind) {
    case "diyas": return [hex(0xffc24b), hex(0xff8a3d), hex(0xff5d73), WARM_WHITE];
    case "snow": return [hex(0xef4444), hex(0x22c55e), hex(0xfacc15), hex(0x60a5fa), WARM_WHITE];
    case "hearts": return [hex(0xfb7185), hex(0xf472b6), hex(0xffb3c1), WARM_WHITE];
    case "bats": return [accent, hex(0x9333ea), hex(0xf97316), lerp(accent, WARM_WHITE, 0.4)];
    case "leaves": return [hex(0xf59e0b), hex(0xb45309), hex(0xef4444), WARM_WHITE];
    default: return [accent, fromArgb(p.bannerFrom), fromArgb(p.bannerTo), WARM_WHITE];
  }
}

export function EventStringLights() {
  const { event, palette } = useActiveMoment();
  const ref = useRef<HTMLCanvasElement>(null);
  const active = !!event && !!palette;

  useEffect(() => {
    if (!active || !event || !palette) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bulbs = bulbColors(event.particle, palette);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0, dpr = 1;
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      if (!r) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    const start = performance.now();
    const draw = (now: number) => {
      const t = reduce ? 0.3 : ((now - start) % LOOP_MS) / LOOP_MS;
      const W = canvas.width / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, canvas.height / dpr);
      paintLights(ctx, W, t, bulbs, !reduce);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    if (reduce) draw(start); else raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [active, event, palette]);

  if (!active) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[30px]" />;
}

function paintLights(ctx: CanvasRenderingContext2D, W: number, t: number, bulbs: Rgba[], animate: boolean): void {
  const inset = 14;
  if (W <= inset * 2 || bulbs.length === 0) return;
  const left = inset, right = W - inset, span = right - left, baseY = 4;
  const sagDepth = 8;
  const arcs = Math.max(2, Math.round(span / 110));
  const arcW = span / arcs;
  const wireY = (x: number) => {
    const local = (x - left) / arcW;
    const frac = local - Math.floor(local);
    return baseY + sagDepth * Math.sin(frac * Math.PI);
  };
  // Wire.
  ctx.beginPath();
  ctx.moveTo(left, wireY(left));
  for (let x = left; x <= right; x += 4) ctx.lineTo(x, wireY(x));
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Bulbs.
  const count = Math.max(3, Math.round(span / 26));
  for (let i = 0; i <= count; i++) {
    const x = left + span * (i / count);
    const y = wireY(x);
    const color = bulbs[i % bulbs.length];
    const phase = i * 1.9;
    const twinkle = animate ? 0.55 + 0.45 * Math.sin(t * Math.PI * 2 + phase) : 0.85;
    bulb(ctx, x, y, color, twinkle);
  }
}

function bulb(ctx: CanvasRenderingContext2D, wx: number, wy: number, color: Rgba, twinkle: number): void {
  const stem = 5, r = 3.4;
  const cx = wx, cy = wy + stem + r;
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + stem); ctx.stroke();
  const glowR = r * (2.4 + 1.6 * twinkle);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0, rgba(color, 0.55 * twinkle));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(lerp(color, WHITE, 0.15 * twinkle), 0.65 + 0.35 * twinkle);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(WHITE, 0.6 * twinkle);
  ctx.beginPath(); ctx.arc(cx - 1, cy - 1.2, 0.4 * r, 0, Math.PI * 2); ctx.fill();
}
