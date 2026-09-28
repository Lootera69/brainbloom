"use client";

// Event "Moments" — the Home banner (port of Flutter `event_banner.dart`).
// A premium, fully-themed strip that greets the user on an active Moment: the
// event's gradient, its emoji in a soft glass chip, greeting + crafted subtitle,
// a low-alpha in-banner particle echo, and a slow shine sweep. Dismissible per
// day (persisted). Renders nothing on an ordinary day or once dismissed.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import {
  BANNER_DISMISSED_KEY, addToken, eventDayToken, readTokenSet,
} from "@/lib/events/event-runtime";
import { type Rgba, rgba, lerp, hex, fromArgb, WHITE, BLACK } from "@/lib/events/event-colors";
import { paintBat } from "@/lib/events/event-bat";
import type { EventTheme, EventParticle } from "@/lib/events/event-theme";

const ECHO_LOOP_MS = 14000;

/** Greeting with any trailing emoji/symbol token removed (the chip carries it). */
function greetingText(copy: string): string {
  const parts = copy.trim().split(/\s+/);
  const alnum = /[A-Za-z0-9]/;
  while (parts.length > 1 && !alnum.test(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}

function subtitleText(e: EventTheme): string {
  if (e.bannerSubtitle) return e.bannerSubtitle;
  return e.tier === "hero"
    ? "Tap in for today’s themed moment."
    : "A little seasonal touch, just for today.";
}

export function EventBanner({ onTap }: { onTap?: () => void }) {
  const { event, palette } = useActiveMoment();
  const token = event ? eventDayToken(event.id, new Date()) : "";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setDismissed(readTokenSet(BANNER_DISMISSED_KEY).has(token));
    });
    return () => { cancelled = true; };
  }, [token]);

  if (!event || !palette || dismissed) return null;

  const onAccent = fromArgb(palette.onAccent);
  const accent = fromArgb(palette.accent);
  const bannerFrom = fromArgb(palette.bannerFrom);
  const bannerTo = fromArgb(palette.bannerTo);
  const deep = lerp(bannerTo, BLACK, 0.22);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.215, 0.61, 0.355, 1] }}
      className="mb-4"
    >
      <div
        role={onTap ? "button" : undefined}
        onClick={onTap}
        className="relative overflow-hidden rounded-[18px]"
        style={{
          boxShadow: `0 8px 18px ${rgba(accent, 0.28)}`,
          cursor: onTap ? "pointer" : undefined,
        }}
      >
        {/* Base three-stop diagonal gradient. */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${rgba(bannerFrom)} 0%, ${rgba(bannerTo)} 62%, ${rgba(deep)} 100%)` }}
        />
        {/* Accent bloom top-right. */}
        <div
          className="pointer-events-none absolute -right-[30px] -top-[40px] size-[130px] rounded-full"
          style={{ background: `radial-gradient(circle, ${rgba(accent, 0.55)}, ${rgba(accent, 0)})` }}
        />
        {/* In-banner particle echo. */}
        <BannerEcho event={event} accent={accent} onAccent={onAccent} />
        {/* Glassy sheen: top highlight + bottom vignette. */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 50%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.14), rgba(0,0,0,0) 50%)" }} />
        {/* Moving shine sweep. */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
          style={{ background: "linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.14), rgba(255,255,255,0))" }}
          initial={{ left: "-40%" }}
          animate={{ left: ["-40%", "140%"] }}
          transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
        />
        {/* Hairline bevel border. */}
        <div className="pointer-events-none absolute inset-0 rounded-[18px]" style={{ border: "1px solid rgba(255,255,255,0.18)" }} />
        {/* Content. */}
        <div className="relative flex items-center gap-3.5 py-3.5 pl-3.5 pr-1.5">
          <EmojiChip emoji={event.emoji} onAccent={onAccent} />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[16px] font-extrabold leading-[1.1]"
              style={{ color: rgba(onAccent), letterSpacing: "0.2px", textShadow: "0 1px 6px rgba(0,0,0,0.22)" }}
            >
              {greetingText(event.bannerCopy)}
            </p>
            <motion.p
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, delay: 0.18, ease: [0.215, 0.61, 0.355, 1] }}
              className="mt-[3px] line-clamp-2 text-[12px] font-medium leading-[1.25]"
              style={{ color: rgba(onAccent, 0.86), letterSpacing: "0.1px", textShadow: "0 1px 4px rgba(0,0,0,0.16)" }}
            >
              {subtitleText(event)}
            </motion.p>
          </div>
          <button
            aria-label="Dismiss"
            onClick={(e) => { e.stopPropagation(); addToken(BANNER_DISMISSED_KEY, token); setDismissed(true); }}
            className="flex size-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            <X className="size-[18px]" style={{ color: rgba(onAccent, 0.85) }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmojiChip({ emoji, onAccent }: { emoji: string; onAccent: Rgba }) {
  return (
    <motion.div
      animate={{ y: [0, 2, 0, -2, 0] }}
      transition={{ duration: ECHO_LOOP_MS / 1000, ease: "easeInOut", repeat: Infinity }}
      className="flex size-[46px] shrink-0 items-center justify-center rounded-full text-2xl"
      style={{
        background: `radial-gradient(circle at 40% 25%, ${rgba(onAccent, 0.3)}, ${rgba(onAccent, 0.12)})`,
        border: `1px solid ${rgba(onAccent, 0.3)}`,
        boxShadow: `0 3px 8px rgba(0,0,0,0.18), 0 0 14px ${rgba(onAccent, 0.16)}`,
      }}
    >
      <span>{emoji}</span>
    </motion.div>
  );
}

// ── In-banner particle echo (port of `_bannerField` + `_BannerParticlePainter`) ──

interface Fx {
  x: number; y: number; size: number; phase: number; hue: number; spin: number; speed: number;
}

function bhash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function brng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function bannerField(kind: EventParticle, rand: () => number): Fx[] {
  const rng = (a: number, b: number) => a + rand() * (b - a);
  const n = kind === "bats" ? 4 : kind === "snow" || kind === "stars" ? 12 : kind === "fireworks" ? 3 : 8;
  const minS = kind === "bats" ? 16 : kind === "snow" || kind === "stars" ? 2 : 7;
  const maxS = kind === "bats" ? 26 : kind === "snow" || kind === "stars" ? 5 : kind === "fireworks" ? 30 : 13;
  return Array.from({ length: n }, () => ({
    x: rng(0, 1), y: rng(0.08, 0.92), size: rng(minS, maxS),
    phase: rng(0, Math.PI * 2), hue: rng(0, 1),
    spin: rng(0.6, 1.6) * (rand() < 0.5 ? 1 : -1), speed: rng(0.5, 1.2),
  }));
}

const B_VIVIDS: Rgba[] = [0xef4444, 0xf59e0b, 0xfacc15, 0x22c55e, 0x38bdf8, 0xa855f7, 0xec4899].map(hex);
const B_WARM = hex(0xffe9a8);
const B_LEAF = hex(0xb45309);
const B_PETAL = hex(0xf9a8d4);

function BannerEcho({ event, accent, onAccent }: { event: EventTheme; accent: Rgba; onAccent: Rgba }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const kind = event.particle;
    const field = bannerField(kind, brng(bhash(event.id) ^ 0x9e3779b9));
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
    const frame = (now: number) => {
      const t = ((now - start) % ECHO_LOOP_MS) / ECHO_LOOP_MS;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const d of field) {
        const nx = (d.x + t * d.speed * 0.35) % 1.0;
        const ny = Math.max(0, Math.min(1, d.y + Math.sin(d.phase + t * Math.PI * 2) * 0.05));
        drawEcho(ctx, nx * w, ny * h, t, d, kind, accent, onAccent);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [event, accent, onAccent]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}

function bvivid(accent: Rgba, h: number): Rgba {
  return lerp(B_VIVIDS[Math.floor(h * B_VIVIDS.length) % B_VIVIDS.length], accent, 0.3);
}
function bglow(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: Rgba, alpha: number): void {
  if (s <= 0) return;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.fill();
}

function drawEcho(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, kind: EventParticle, accent: Rgba, onAccent: Rgba): void {
  switch (kind) {
    case "bats": {
      const flap = Math.sin(d.phase + t * Math.PI * 2 * 2) * 0.5;
      paintBat(ctx, { center: { x: cx, y: cy }, span: d.size, flap, rotation: Math.PI / 2, color: onAccent, alpha: 0.16 });
      break;
    }
    case "snow":
      ctx.beginPath(); ctx.arc(cx, cy, d.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(WHITE, 0.45); ctx.fill(); break;
    case "petals":
    case "leaves": echoRotOval(ctx, cx, cy, t, d, kind, accent); break;
    case "confetti": echoRect(ctx, cx, cy, t, d, accent); break;
    case "stars": echoStar(ctx, cx, cy, t, d, accent, 5); break;
    case "sparkles": echoStar(ctx, cx, cy, t, d, accent, 4); break;
    case "diyas": bglow(ctx, cx, cy, d.size, lerp(accent, B_WARM, 0.5), 0.30); break;
    case "hearts": echoHeart(ctx, cx, cy, t, d, accent); break;
    case "piDigits": echoPi(ctx, cx, cy, t, d, accent, onAccent); break;
    case "jigsaw": echoJigsaw(ctx, cx, cy, t, d, accent, onAccent); break;
    case "fireworks": echoBurst(ctx, cx, cy, t, d, accent); break;
    default: bglow(ctx, cx, cy, d.size, onAccent, 0.14); break;
  }
}

function echoRotOval(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, kind: EventParticle, accent: Rgba): void {
  ctx.save(); ctx.translate(cx, cy);
  ctx.rotate(d.phase + t * Math.PI * 2 * d.spin * 0.4);
  const base = kind === "leaves" ? lerp(B_LEAF, accent, d.hue) : lerp(B_PETAL, accent, d.hue * 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, d.size / 2, (d.size * 0.55) / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(base, 0.24); ctx.fill();
  ctx.restore();
}

function echoRect(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, accent: Rgba): void {
  ctx.save(); ctx.translate(cx, cy);
  ctx.rotate(d.phase + t * Math.PI * 2 * d.spin);
  const flip = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(d.phase * 2 + t * Math.PI * 6 * d.spin));
  const w = d.size * flip, h = d.size * 0.6;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 1.5);
  ctx.fillStyle = rgba(bvivid(accent, d.hue), 0.34); ctx.fill();
  ctx.restore();
}

function echoStarPath(ctx: CanvasRenderingContext2D, points: number, outer: number, inner: number): void {
  const n = points * 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function echoStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, accent: Rgba, points: number): void {
  const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(d.phase + t * Math.PI * 2 * 3));
  const s = d.size * (0.7 + 0.3 * tw);
  const color = lerp(WHITE, accent, 0.4);
  bglow(ctx, cx, cy, s * 1.3, color, 0.10 * tw);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(d.phase * 0.2);
  echoStarPath(ctx, points, s, s * (points === 4 ? 0.18 : 0.42));
  ctx.fillStyle = rgba(color, 0.30 + 0.35 * tw); ctx.fill();
  ctx.restore();
}

function echoHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, accent: Rgba): void {
  const tw = 0.8 + 0.2 * Math.sin(d.phase + t * Math.PI * 2 * 2);
  const s = d.size * tw, w = s, h = s;
  ctx.save(); ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.35);
  ctx.bezierCurveTo(-w * 0.5, -h * 0.25, -w * 0.9, h * 0.35, 0, h * 0.85);
  ctx.bezierCurveTo(w * 0.9, h * 0.35, w * 0.5, -h * 0.25, 0, h * 0.35);
  ctx.closePath();
  ctx.fillStyle = rgba(lerp(accent, WHITE, 0.15), 0.28); ctx.fill();
  ctx.restore();
}

function echoPi(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, accent: Rgba, onAccent: Rgba): void {
  const s = d.size;
  ctx.save(); ctx.translate(cx, cy);
  ctx.rotate(Math.sin(d.phase + t * Math.PI * 2 * d.speed) * 0.22);
  ctx.strokeStyle = rgba(lerp(onAccent, accent, d.hue), 0.30);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.4, s * 0.11);
  const w = s * 0.5, top = -s * 0.32, bot = s * 0.34;
  ctx.beginPath();
  ctx.moveTo(-w, top); ctx.lineTo(w, top);
  ctx.moveTo(-w * 0.55, top); ctx.lineTo(-w * 0.7, bot);
  ctx.moveTo(w * 0.4, top); ctx.lineTo(w * 0.5, bot);
  ctx.stroke();
  ctx.restore();
}

function echoJigsaw(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, accent: Rgba, onAccent: Rgba): void {
  const s = d.size * 0.9, half = s * 0.5, knob = s * 0.22;
  ctx.save(); ctx.translate(cx, cy);
  ctx.rotate(d.phase + t * Math.PI * 2 * d.spin * 0.3);
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, 2);
  ctx.moveTo(knob, -half); ctx.arc(0, -half, knob, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lerp(onAccent, accent, d.hue), 0.24); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath(); ctx.arc(half, 0, knob, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.restore();
  ctx.restore();
}

function echoBurst(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Fx, accent: Rgba): void {
  const cycle = (t * d.speed + d.phase / (Math.PI * 2)) % 1.0;
  const color = bvivid(accent, d.hue);
  const ease = 1 - Math.pow(1 - cycle, 3);
  const radius = d.size * ease;
  const fade = 1 - cycle;
  if (fade <= 0.05) return;
  bglow(ctx, cx, cy, d.size * 0.4 * (1 - cycle), color, 0.14 * fade);
  ctx.fillStyle = rgba(color, 0.5 * fade * fade);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + d.phase;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 1.4 * (0.6 + 0.4 * fade), 0, Math.PI * 2);
    ctx.fill();
  }
}

