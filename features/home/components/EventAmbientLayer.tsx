"use client";

// Event "Moments" — the ambient particle layer (canvas port of Flutter
// `event_ambient_layer.dart`). A subtle, low-alpha field that drifts behind the
// Home content when a Moment is active: bats glide, snow settles, petals/leaves
// tumble, diyas/hearts rise, confetti flutters down, fireworks bloom, stars and
// sparkles twinkle, π-glyphs float for Pi Day, jigsaw pieces drift for Puzzle
// Day. Renders nothing off-event or when the particle is "none".

import { useEffect, useRef } from "react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { type Rgba, rgba, lerp, hex, fromArgb, WHITE, BLACK } from "@/lib/events/event-colors";
import { paintBat, batFlap } from "@/lib/events/event-bat";
import type { EventParticle } from "@/lib/events/event-theme";

const LOOP_MS = 24000;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Drifter {
  x: number; y: number; speed: number; size: number;
  phase: number; drift: number; hue: number; spin: number;
}

function fieldFor(kind: EventParticle, rand: () => number): Drifter[] {
  const rng = (a: number, b: number) => a + rand() * (b - a);
  const spin = () => rng(0.6, 1.6) * (rand() < 0.5 ? 1 : -1);
  const make = (
    n: number,
    o: { minSize: number; maxSize: number; minSpeed: number; maxSpeed: number;
      minDrift?: number; maxDrift?: number; minY?: number; maxY?: number },
  ): Drifter[] => {
    const minDrift = o.minDrift ?? 0.02, maxDrift = o.maxDrift ?? 0.06;
    const minY = o.minY ?? 0, maxY = o.maxY ?? 1;
    return Array.from({ length: n }, () => ({
      x: rng(0, 1), y: rng(minY, maxY), speed: rng(o.minSpeed, o.maxSpeed),
      size: rng(o.minSize, o.maxSize), phase: rng(0, Math.PI * 2),
      drift: rng(minDrift, maxDrift), hue: rng(0, 1), spin: spin(),
    }));
  };
  switch (kind) {
    case "bats": return make(7, { minSize: 20, maxSize: 40, minSpeed: 0.5, maxSpeed: 0.9, minY: 0.04, maxY: 0.5 });
    case "snow": return make(40, { minSize: 2, maxSize: 6, minSpeed: 0.4, maxSpeed: 0.8 });
    case "petals":
    case "leaves": return make(24, { minSize: 8, maxSize: 15, minSpeed: 0.35, maxSpeed: 0.7, minDrift: 0.03, maxDrift: 0.08 });
    case "confetti": return make(30, { minSize: 6, maxSize: 12, minSpeed: 0.5, maxSpeed: 0.9, minDrift: 0.03, maxDrift: 0.09 });
    case "fireworks": return make(6, { minSize: 42, maxSize: 84, minSpeed: 0.7, maxSpeed: 1.3, minY: 0.12, maxY: 0.6 });
    case "stars": return make(34, { minSize: 3, maxSize: 9, minSpeed: 0.15, maxSpeed: 0.4 });
    case "sparkles": return make(20, { minSize: 7, maxSize: 15, minSpeed: 0.2, maxSpeed: 0.5 });
    case "piDigits": return make(16, { minSize: 14, maxSize: 24, minSpeed: 0.3, maxSpeed: 0.6 });
    case "jigsaw": return make(14, { minSize: 13, maxSize: 22, minSpeed: 0.3, maxSpeed: 0.6 });
    case "diyas":
    case "hearts": return make(18, { minSize: 6, maxSize: 13, minSpeed: 0.3, maxSpeed: 0.6, minDrift: 0.02, maxDrift: 0.05 });
    case "none": return make(22, { minSize: 5, maxSize: 12, minSpeed: 0.25, maxSpeed: 0.55 });
    default: return [];
  }
}

const VIVIDS: Rgba[] = [0xef4444, 0xf59e0b, 0xfacc15, 0x22c55e, 0x38bdf8, 0xa855f7, 0xec4899].map(hex);

function fallsKind(kind: EventParticle): boolean {
  return kind === "snow" || kind === "petals" || kind === "leaves" || kind === "confetti";
}

function paintField(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number,
  field: Drifter[], kind: EventParticle, accent: Rgba, orb: Rgba,
): void {
  if (kind === "fireworks") {
    for (const d of field) firework(ctx, W, H, t, d, accent);
    return;
  }
  for (const d of field) {
    const travel = t * d.speed;
    let ny: number;
    if (kind === "bats") ny = d.y + Math.sin(d.phase + t * Math.PI * 2) * d.drift;
    else if (fallsKind(kind)) ny = (d.y + travel) % 1.0;
    else { ny = (d.y - travel) % 1.0; if (ny < 0) ny += 1.0; }
    let nx: number;
    if (kind === "bats") nx = (d.x + travel) % 1.0;
    else { nx = (d.x + Math.sin(d.phase + t * Math.PI * 2) * d.drift) % 1.0; if (nx < 0) nx += 1.0; }
    drawParticle(ctx, nx * W, ny * H, t, d, kind, accent, orb);
  }
}

const mix = (accent: Rgba, orb: Rgba, h: number) => lerp(accent, orb, h);
function vivid(accent: Rgba, h: number): Rgba {
  const base = VIVIDS[Math.floor(h * VIVIDS.length) % VIVIDS.length];
  return lerp(base, accent, 0.25);
}

function glow(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: Rgba, alpha: number): void {
  if (s <= 0) return;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticle(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number,
  d: Drifter, kind: EventParticle, accent: Rgba, orb: Rgba,
): void {
  switch (kind) {
    case "bats": bat(ctx, cx, cy, d.size, d.phase, t, accent, 0.10); break;
    case "snow": snowflake(ctx, cx, cy, t, d); break;
    case "petals":
    case "leaves": petal(ctx, cx, cy, t, d, kind, accent); break;
    case "confetti": confetti(ctx, cx, cy, t, d, accent); break;
    case "stars": starParticle(ctx, cx, cy, t, d, accent); break;
    case "sparkles": sparkle(ctx, cx, cy, t, d, accent); break;
    case "piDigits": piGlyph(ctx, cx, cy, t, d, accent, orb); break;
    case "jigsaw": jigsaw(ctx, cx, cy, t, d, accent, orb); break;
    case "diyas": diya(ctx, cx, cy, t, d, accent); break;
    case "hearts": heart(ctx, cx, cy, t, d, accent); break;
    default: mote(ctx, cx, cy, t, d, accent, orb); break;
  }
}

function mote(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba, orb: Rgba): void {
  const tw = 0.6 + 0.4 * Math.sin(d.phase + t * Math.PI * 4);
  glow(ctx, cx, cy, d.size, mix(accent, orb, d.hue), 0.16 * tw);
}

function bat(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, phase: number, t: number, accent: Rgba, alpha: number): void {
  const flap = batFlap(t, phase, 1.5) * 0.6;
  const bank = Math.sin(phase + t * Math.PI * 2) * 0.18;
  paintBat(ctx, { center: { x: cx, y: cy }, span: s, flap, rotation: Math.PI / 2 + bank, color: accent, alpha });
}

function snowflake(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter): void {
  glow(ctx, cx, cy, d.size * 1.6, WHITE, 0.10);
  ctx.beginPath();
  ctx.arc(cx, cy, d.size * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = rgba(WHITE, 0.5);
  ctx.fill();
  if (d.size > 4) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(d.phase + t * Math.PI * 2 * d.spin * 0.3);
    ctx.strokeStyle = rgba(WHITE, 0.35);
    ctx.lineWidth = 0.8;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -d.size);
      ctx.lineTo(0, d.size);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

const WARM_DIYA = hex(0xffe9a8);
const FLAME = hex(0xfdba74);

function diya(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba): void {
  const flick = 0.85 + 0.15 * Math.sin(d.phase + t * Math.PI * 2 * 3);
  const warm = lerp(accent, WARM_DIYA, 0.5);
  glow(ctx, cx, cy, d.size * 1.8 * flick, warm, 0.24);
  const bw = d.size * 1.1;
  ctx.beginPath();
  ctx.moveTo(cx - bw, cy + d.size * 0.3);
  ctx.quadraticCurveTo(cx, cy + d.size * 0.9, cx + bw, cy + d.size * 0.3);
  ctx.closePath();
  ctx.fillStyle = rgba(lerp(accent, BLACK, 0.2), 0.4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - d.size * flick);
  ctx.quadraticCurveTo(cx + d.size * 0.3, cy, cx, cy + d.size * 0.2);
  ctx.quadraticCurveTo(cx - d.size * 0.3, cy, cx, cy - d.size * flick);
  ctx.closePath();
  ctx.fillStyle = rgba(FLAME, 0.7);
  ctx.fill();
}

const LEAF_BASE = hex(0xb45309);
const PETAL_BASE = hex(0xf9a8d4);

function petal(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, kind: EventParticle, accent: Rgba): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(d.phase + t * Math.PI * 2 * d.speed);
  const base = kind === "leaves" ? lerp(LEAF_BASE, accent, d.hue) : lerp(PETAL_BASE, accent, d.hue * 0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, d.size / 2, (d.size * 0.55) / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(base, 0.18);
  ctx.fill();
  ctx.restore();
}

function confetti(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(d.phase + t * Math.PI * 2 * d.spin);
  const flip = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(d.phase * 2 + t * Math.PI * 2 * 3 * d.spin));
  const w = d.size * flip;
  const h = d.size * 0.6;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 1.5);
  ctx.fillStyle = rgba(vivid(accent, d.hue), 0.32);
  ctx.fill();
  ctx.restore();
}

function firework(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, d: Drifter, accent: Rgba): void {
  const cycle = (t * d.speed + d.phase / (Math.PI * 2)) % 1.0;
  const burstX = d.x * W;
  const burstY = d.y * H;
  const color = vivid(accent, d.hue);
  if (cycle < 0.18) {
    const p = cycle / 0.18;
    const y = burstY + (H - burstY) * (1 - p);
    ctx.beginPath();
    ctx.arc(burstX, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.5 * (0.4 + 0.6 * p));
    ctx.fill();
    return;
  }
  const bp = (cycle - 0.18) / 0.82;
  const ease = 1 - Math.pow(1 - bp, 3);
  const radius = d.size * ease;
  const fade = 1 - bp;
  const alpha = fade * fade;
  if (alpha <= 0.02) return;
  glow(ctx, burstX, burstY, d.size * 0.5 * (1 - bp), color, 0.18 * fade);
  const sparks = 14;
  ctx.fillStyle = rgba(color, 0.55 * alpha);
  for (let i = 0; i < sparks; i++) {
    const a = (i / sparks) * Math.PI * 2 + d.phase;
    const rr = radius * (0.85 + 0.15 * Math.sin(a * 3));
    ctx.beginPath();
    ctx.arc(burstX + Math.cos(a) * rr, burstY + Math.sin(a) * rr, 1.6 * (0.6 + 0.4 * fade), 0, Math.PI * 2);
    ctx.fill();
  }
}

function buildStarPath(ctx: CanvasRenderingContext2D, points: number, outer: number, inner: number): void {
  const n = points * 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function starParticle(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba): void {
  const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(d.phase + t * Math.PI * 2 * 3));
  const color = lerp(WHITE, vivid(accent, d.hue), 0.35);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(d.phase * 0.2);
  buildStarPath(ctx, 5, d.size * (0.7 + 0.3 * tw), d.size * 0.42);
  ctx.fillStyle = rgba(color, 0.25 + 0.35 * tw);
  ctx.fill();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba): void {
  const tw = 0.5 + 0.5 * Math.sin(d.phase + t * Math.PI * 2 * 2.4);
  const s = d.size * (0.5 + 0.5 * tw);
  const color = lerp(WHITE, accent, 0.5);
  glow(ctx, cx, cy, s * 1.4, color, 0.14 * tw);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(d.phase * 0.1);
  buildStarPath(ctx, 4, s, s * 0.16);
  ctx.fillStyle = rgba(color, 0.35 + 0.4 * tw);
  ctx.fill();
  ctx.restore();
}

function piGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba, orb: Rgba): void {
  const s = d.size;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(d.phase + t * Math.PI * 2 * d.speed) * 0.25);
  ctx.strokeStyle = rgba(mix(accent, orb, d.hue), 0.30);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, s * 0.11);
  const w = s * 0.5, top = -s * 0.32, bot = s * 0.34;
  ctx.beginPath();
  ctx.moveTo(-w, top); ctx.lineTo(w, top);
  ctx.moveTo(-w * 0.55, top); ctx.lineTo(-w * 0.7, bot);
  ctx.moveTo(w * 0.4, top); ctx.lineTo(w * 0.5, bot);
  ctx.stroke();
  ctx.restore();
}

function jigsaw(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba, orb: Rgba): void {
  const s = d.size;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(d.phase + t * Math.PI * 2 * d.spin * 0.4);
  const half = s * 0.5, knob = s * 0.22;
  const color = mix(accent, orb, d.hue);
  // Body + tab (union via a single nonzero fill).
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, 2);
  ctx.moveTo(0 + knob, -half);
  ctx.arc(0, -half, knob, 0, Math.PI * 2);
  ctx.fillStyle = rgba(color, 0.22);
  ctx.fill();
  // Notch cut into the right edge.
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(half, 0, knob, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  // Outline.
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, 2);
  ctx.moveTo(0 + knob, -half);
  ctx.arc(0, -half, knob, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(color, 0.30);
  ctx.stroke();
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, d: Drifter, accent: Rgba): void {
  const tw = 0.75 + 0.25 * Math.sin(d.phase + t * Math.PI * 2 * 2);
  const s = d.size * tw;
  glow(ctx, cx, cy, d.size * 1.3, accent, 0.14);
  ctx.save();
  ctx.translate(cx, cy);
  const w = s, h = s;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.35);
  ctx.bezierCurveTo(-w * 0.5, -h * 0.25, -w * 0.9, h * 0.35, 0, h * 0.85);
  ctx.bezierCurveTo(w * 0.9, h * 0.35, w * 0.5, -h * 0.25, 0, h * 0.35);
  ctx.closePath();
  ctx.fillStyle = rgba(accent, 0.24);
  ctx.fill();
  ctx.restore();
}

export function EventAmbientLayer() {
  const { event, palette } = useActiveMoment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = !!event && !!palette && event.particle !== "none";

  useEffect(() => {
    if (!active || !event || !palette) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const kind = event.particle;
    const accent = fromArgb(palette.accent);
    const orb = fromArgb(palette.orb2);
    const field = fieldFor(kind, mulberry32(hashStr(event.id)));
    let raf = 0;
    let dpr = 1;

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
    const frame = (now: number) => {
      const t = ((now - start) % LOOP_MS) / LOOP_MS;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      paintField(ctx, window.innerWidth, window.innerHeight, t, field, kind, accent, orb);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, event, palette]);

  if (!active) return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
