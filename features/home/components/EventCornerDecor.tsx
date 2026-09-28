"use client";

// Event "Moments" — signature corner decorations (port of Flutter
// `event_corner_decor.dart`). A framing flourish anchored in the viewport
// corners, one bespoke motif per hero event. Low-alpha, kept out of the centre
// so content is never occluded. Scrolls with the page content. Renders nothing
// off-event or for events with no motif.

import { useEffect, useRef } from "react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { type Rgba, rgba, lerp, hex, fromArgb, WHITE, BLACK } from "@/lib/events/event-colors";
import { paintBat } from "@/lib/events/event-bat";
import type { EventTheme, EventParticle } from "@/lib/events/event-theme";

const LOOP_MS = 8000;

type Motif =
  | "none" | "cobwebs" | "rangoli" | "holly" | "batSignal" | "streamers"
  | "heartsLace" | "starfield" | "piRibbon" | "jigsawFrame" | "vines"
  | "smileys" | "circuit" | "lotus";

const BY_ID: Record<string, Motif> = {
  halloween: "cobwebs", diwali: "rangoli", christmas: "holly", batman_day: "batSignal",
  new_year: "streamers", new_years_eve: "streamers", valentines: "heartsLace",
  star_wars_day: "starfield", pi_day: "piRibbon", puzzle_day: "jigsawFrame",
  earth_day: "vines", emoji_day: "smileys", world_logic_day: "circuit", yoga_day: "lotus",
};

function motifByParticle(p: EventParticle): Motif {
  switch (p) {
    case "diyas": return "rangoli";
    case "snow": return "holly";
    case "bats": return "batSignal";
    case "hearts": return "heartsLace";
    case "leaves": return "vines";
    default: return "none";
  }
}

function cornerMotifFor(e: EventTheme): Motif {
  return BY_ID[e.id] ?? motifByParticle(e.particle);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Pal { accent: Rgba; bannerFrom: Rgba; bannerTo: Rgba; }

export function EventCornerDecor() {
  const { event, palette } = useActiveMoment();
  const motif: Motif = event ? cornerMotifFor(event) : "none";
  const ref = useRef<HTMLCanvasElement>(null);
  const scrollY = useRef(0);
  const active = !!event && !!palette && motif !== "none";

  useEffect(() => {
    if (!active || !palette) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const P: Pal = { accent: fromArgb(palette.accent), bannerFrom: fromArgb(palette.bannerFrom), bannerTo: fromArgb(palette.bannerTo) };
    let raf = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    const onScroll = () => { scrollY.current = window.scrollY; };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    const start = performance.now();
    const frame = (now: number) => {
      const t = ((now - start) % LOOP_MS) / LOOP_MS;
      const W = window.innerWidth, H = window.innerHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(0, -scrollY.current);
      paintMotif(ctx, motif, W, H, t, P);
      ctx.restore();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [active, event, palette, motif]);

  if (!active) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[1]" />;
}

function glowDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: Rgba, alpha: number): void {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function paintMotif(ctx: CanvasRenderingContext2D, motif: Motif, W: number, H: number, t: number, P: Pal): void {
  switch (motif) {
    case "cobwebs": return cobwebs(ctx, W, H, t, P);
    case "rangoli": return rangoli(ctx, W, H, t, P);
    case "holly": return holly(ctx, W, H, t);
    case "batSignal": return batSignal(ctx, W, H, t, P);
    case "streamers": return streamers(ctx, W, H, t, P);
    case "heartsLace": return heartsLace(ctx, W, H, t, P);
    case "starfield": return starfield(ctx, W, H, t, P);
    case "piRibbon": return piRibbon(ctx, W, H, t, P);
    case "jigsawFrame": return jigsawFrame(ctx, W, H, t, P);
    case "vines": return vines(ctx, W, H, t, P);
    case "smileys": return smileys(ctx, W, H, t, P);
    case "circuit": return circuit(ctx, W, H, t, P);
    case "lotus": return lotus(ctx, W, H, t, P);
    default: return;
  }
}

// ── Cobwebs (Halloween) ──────────────────────────────────────────────────
function cobwebs(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const r = 0.34 * W;
  web(ctx, 0, 0, 1, 1, r, t, P);
  web(ctx, W, 0, -1, 1, 0.92 * r, t, P);
  spider(ctx, W - 0.5 * r, 0, 0.5 * r, t, P);
}

function web(ctx: CanvasRenderingContext2D, cornerX: number, cornerY: number, dirX: number, dirY: number, r: number, t: number, P: Pal): void {
  const shimmer = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const thread = lerp(WHITE, P.accent, 0.25);
  ctx.strokeStyle = rgba(thread, 0.16 + 0.1 * shimmer);
  ctx.lineWidth = 1;
  const angs: number[] = [];
  for (let i = 0; i <= 6; i++) angs.push(Math.max(0.08, Math.min(Math.PI / 2 - 0.08, (Math.PI / 2) * (i / 6))));
  const at = (a: number, rad: number) => ({ x: cornerX + dirX * Math.cos(a) * rad, y: cornerY + dirY * Math.sin(a) * rad });
  for (const a of angs) {
    const p = at(a, r);
    ctx.beginPath(); ctx.moveTo(cornerX, cornerY); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  for (let ring = 1; ring <= 4; ring++) {
    const rad = (r * ring) / 4;
    for (let i = 0; i < angs.length - 1; i++) {
      const a = at(angs[i], rad), b = at(angs[i + 1], rad);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ctrl = { x: mid.x + (cornerX - mid.x) * 0.22, y: mid.y + (cornerY - mid.y) * 0.22 };
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y); ctx.stroke();
    }
  }
}

function spider(ctx: CanvasRenderingContext2D, ax: number, ay: number, maxDrop: number, t: number, P: Pal): void {
  const drop = maxDrop * (0.55 + 0.35 * Math.sin(t * Math.PI * 2));
  const bx = ax, by = ay + drop;
  const ink = lerp(BLACK, P.accent, 0.15);
  ctx.strokeStyle = rgba(WHITE, 0.18); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = rgba(ink, 0.5); ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ly = -2 + i * 2;
      ctx.beginPath(); ctx.moveTo(bx + side * 1.5, by + ly); ctx.lineTo(bx + side * 6, by + ly - 2 + i * 1.5); ctx.stroke();
    }
  }
  ctx.fillStyle = rgba(ink, 0.5);
  ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by - 3.4, 1.8, 0, Math.PI * 2); ctx.fill();
}

// ── Rangoli (Diwali) ─────────────────────────────────────────────────────
const RANGOLI_HUES = [0xff8a3d, 0xec4899, 0xffc24b];
function rangoli(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const r = 0.3 * W;
  const hues = [P.accent, hex(RANGOLI_HUES[0]), hex(RANGOLI_HUES[1]), hex(RANGOLI_HUES[2])];
  const draw = (cx: number, cy: number, dx: number, dy: number) => {
    const tw = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    const at = (a: number, rad: number) => ({ x: cx + dx * Math.cos(a) * rad, y: cy + dy * Math.sin(a) * rad });
    glowDisc(ctx, cx, cy, r, P.accent, 0.1 + 0.06 * tw);
    for (let ring = 1; ring <= 3; ring++) {
      const rad = (r * ring) / 3.4;
      const petals = 4 + ring * 2;
      const hue = hues[ring % 4];
      const pw = rad * 0.16;
      ctx.strokeStyle = rgba(hue, 0.3 + 0.2 * tw); ctx.lineWidth = 1.2;
      for (let i = 0; i <= petals; i++) {
        const a = (Math.PI / 2) * (i / petals);
        const c = at(a, rad);
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.atan2(c.y - cy, c.x - cx));
        ctx.beginPath(); ctx.ellipse(0, 0, pw * 1.6 / 2, pw / 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    for (let i = 0; i <= 8; i++) {
      const a = (Math.PI / 2) * (i / 8);
      const c = at(a, 0.98 * r);
      ctx.fillStyle = rgba(hues[i % 4], 0.35 + 0.35 * tw);
      ctx.beginPath(); ctx.arc(c.x, c.y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  };
  draw(0, H, 1, -1);
  draw(W, H, -1, -1);
}

// ── Holly (Christmas) ────────────────────────────────────────────────────
const LEAF_DARK = hex(0x166534);
const LEAF_LIGHT = hex(0x22c55e);
const BERRY = hex(0xdc2626);

function hollyLeafPath(ctx: CanvasRenderingContext2D, L: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.25 * L, -0.2 * L, 0.4 * L, -0.12 * L);
  ctx.quadraticCurveTo(0.5 * L, -0.28 * L, 0.65 * L, -0.14 * L);
  ctx.quadraticCurveTo(0.8 * L, -0.24 * L, L, 0);
  ctx.quadraticCurveTo(0.8 * L, 0.24 * L, 0.65 * L, 0.14 * L);
  ctx.quadraticCurveTo(0.5 * L, 0.28 * L, 0.4 * L, 0.12 * L);
  ctx.quadraticCurveTo(0.25 * L, 0.2 * L, 0, 0);
  ctx.closePath();
}

function holly(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
  const sway = Math.sin(t * Math.PI * 2) * 0.06;
  const draw = (cornerX: number, dirX: number) => {
    const ox = cornerX + dirX * 26, oy = 20;
    glowDisc(ctx, ox, oy, 40, LEAF_LIGHT, 0.08);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(dirX, 1);
    for (let i = 0; i < 3; i++) {
      const base = -0.5 + i * 0.6;
      ctx.save(); ctx.rotate(base + sway);
      hollyLeafPath(ctx, 26);
      ctx.fillStyle = rgba(lerp(LEAF_LIGHT, LEAF_DARK, i / 2), 0.42); ctx.fill();
      ctx.strokeStyle = rgba(LEAF_DARK, 0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(13, -6.5, 25, -1);
      ctx.strokeStyle = rgba(WHITE, 0.28); ctx.lineWidth = 1.4; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    }
    for (const [bxp, byp] of [[4, 2], [10, 6], [2, 9]]) {
      ctx.fillStyle = rgba(BERRY, 0.72);
      ctx.beginPath(); ctx.arc(bxp, byp, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(WHITE, 0.5);
      ctx.beginPath(); ctx.arc(bxp - 0.8, byp - 0.8, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  draw(0, 1);
  draw(W, -1);
}

// ── Bat-signal + skyline (Batman Day) ────────────────────────────────────
function batSignal(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const cx = 0.82 * W, cy = 0.15 * H, r = 0.26 * W;
  glowDisc(ctx, cx, cy, r, P.accent, 0.14 + 0.1 * pulse);
  ctx.fillStyle = rgba(P.accent, 0.1 + 0.06 * pulse);
  ctx.beginPath(); ctx.arc(cx, cy, 0.42 * r, 0, Math.PI * 2); ctx.fill();
  paintBat(ctx, { center: { x: cx, y: cy }, span: 0.3 * r, flap: 0.15 * Math.sin(t * Math.PI * 2), color: hex(0x0b0b0f), alpha: 0.85 });
  skylineCluster(ctx, W, H, t, P, true);
  skylineCluster(ctx, W, H, t, P, false);
}

function skylineCluster(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal, fromLeft: boolean): void {
  const rand = mulberry32(fromLeft ? 7 : 19);
  const clusterW = 0.34 * W;
  const brick = lerp(hex(0x0b0b12), P.accent, 0.1);
  let x = fromLeft ? 0 : W - clusterW;
  const end = fromLeft ? clusterW : W;
  let b = 0;
  while (x < end) {
    const w = 26 + rand() * 26, h = 40 + rand() * 90;
    const width = Math.min(w, end - x), top = H - h;
    ctx.fillStyle = rgba(brick, 0.38);
    ctx.fillRect(x, top, width, h);
    const cols = Math.floor(width / 9), rows = Math.floor(h / 12);
    for (let cx2 = 0; cx2 < cols; cx2++) for (let cy2 = 0; cy2 < rows; cy2++) {
      if (rand() > 0.22) continue;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 + b + cx2 + cy2));
      ctx.fillStyle = rgba(P.accent, 0.25 + 0.4 * tw);
      ctx.fillRect(x + 4 + cx2 * 9, top + 6 + cy2 * 12, 3, 4);
    }
    x += width + 3; b++;
  }
}

// ── Streamers (New Year) ─────────────────────────────────────────────────
function streamers(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const sway = Math.sin(t * Math.PI * 2);
  const hues = [P.accent, P.bannerTo, hex(0xec4899), hex(0x38bdf8), hex(0xfacc15)];
  ctx.lineWidth = 2.4; ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const x0 = W * (0.08 + 0.164 * i);
    const len = H * (0.2 + 0.1 * ((i % 3) / 2));
    ctx.strokeStyle = rgba(hues[i % 5], 0.32);
    ctx.beginPath(); ctx.moveTo(x0, 0);
    for (let s = 1; s <= 10; s++) {
      const f = s / 10, y = len * f;
      const wiggle = Math.sin(f * Math.PI * 3 + i + t * Math.PI * 2) * 10 * f;
      ctx.lineTo(x0 + wiggle + sway * 4 * f, y);
    }
    ctx.stroke();
  }
  balloon(ctx, 0.12 * W, 0.1 * H, hues[0], sway);
  balloon(ctx, 0.88 * W, 0.13 * H, hues[2], -sway);
}

function balloon(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: Rgba, sway: number): void {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(sway * 0.08);
  ctx.strokeStyle = rgba(WHITE, 0.25); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, 14); ctx.quadraticCurveTo(4 + sway * 2, 30, 0, 46); ctx.stroke();
  ctx.fillStyle = rgba(color, 0.4);
  ctx.beginPath(); ctx.ellipse(0, 0, 22 / 2, 27 / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.5, 13); ctx.lineTo(2.5, 13); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(WHITE, 0.35);
  ctx.beginPath(); ctx.ellipse(-5, -6, 5 / 2, 8 / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Hearts lace (Valentine's) ────────────────────────────────────────────
function cornerHeartPath(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0.35 * s);
  ctx.bezierCurveTo(-0.5 * s, -0.25 * s, -0.9 * s, 0.35 * s, 0, 0.85 * s);
  ctx.bezierCurveTo(0.9 * s, 0.35 * s, 0.5 * s, -0.25 * s, 0, 0.35 * s);
  ctx.closePath();
}

function heartsLace(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const hues = [P.accent, hex(0xfb7185), hex(0xf472b6), hex(0xffb3c1)];
  for (const left of [true, false]) {
    const baseX = left ? 0.1 * W : 0.9 * W, dir = left ? 1 : -1;
    for (let i = 0; i <= 3; i++) {
      const x = baseX + dir * i * 20;
      const drop = 16 + i * 12 + 6 * Math.sin(t * Math.PI * 2 + i * 0.8 + (left ? 0 : 1.5));
      ctx.strokeStyle = rgba(WHITE, 0.16); ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, drop); ctx.stroke();
      const size = 9 - i * 0.8;
      const beat = 0.85 + 0.15 * Math.sin(t * Math.PI * 4 + i);
      ctx.save(); ctx.translate(x, drop);
      cornerHeartPath(ctx, size * beat);
      ctx.fillStyle = rgba(hues[i % 4], 0.5); ctx.fill();
      ctx.restore();
    }
  }
}

// ── Starfield (Star Wars Day) ────────────────────────────────────────────
function starfield(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const rand = mulberry32(23);
  for (let i = 0; i < 26; i++) {
    const x = rand() * W, y = rand() * 0.32 * H;
    const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * Math.PI * 4 + i));
    ctx.fillStyle = rgba(lerp(WHITE, P.accent, 0.3), 0.25 + 0.4 * tw);
    ctx.beginPath(); ctx.arc(x, y, 0.8 + 1.2 * tw, 0, Math.PI * 2); ctx.fill();
  }
  const pcx = 0.86 * W, pcy = 0.12 * H, pr = 0.06 * W;
  glowDisc(ctx, pcx, pcy, 2.2 * pr, P.accent, 0.16);
  ctx.fillStyle = rgba(P.accent, 0.5);
  ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(pcx, pcy); ctx.rotate(-0.5);
  ctx.strokeStyle = rgba(P.bannerTo, 0.45); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 4 * pr / 2, 1.2 * pr / 2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  const cx = ((t * W * 1.4) % (W * 1.4)) - 0.2 * W;
  const cy = 0.08 * H + cx * 0.06;
  const grad = ctx.createLinearGradient(cx, cy, cx - 34, cy + 2);
  grad.addColorStop(0, rgba(WHITE, 0.5)); grad.addColorStop(1, rgba(WHITE, 0));
  ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 34, cy + 2); ctx.stroke();
  ctx.fillStyle = rgba(WHITE, 0.6);
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
}

// ── Pi ribbon (Pi Day) ───────────────────────────────────────────────────
function piRibbon(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const ox = 0.12 * W, oy = 0.86 * H;
  for (let ring = 1; ring <= 3; ring++) {
    ctx.strokeStyle = rgba(P.accent, 0.14 - ring * 0.02); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox, oy, 18 * ring + 6 * breathe, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = rgba(P.accent, 0.4); ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ox - 22, oy - 18); ctx.lineTo(ox + 22, oy - 18);
  ctx.moveTo(ox - 12.1, oy - 18); ctx.lineTo(ox - 15.4, oy + 16);
  ctx.moveTo(ox + 8.8, oy - 18); ctx.lineTo(ox + 12.1, oy + 16);
  ctx.stroke();
  ctx.strokeStyle = rgba(P.bannerTo, 0.22); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0.95 * H);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, 0.95 * H + Math.sin(x / 40 + t * Math.PI * 2) * 6);
  ctx.stroke();
}

// ── Jigsaw frame (Puzzle Day) ────────────────────────────────────────────
function jigsawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  for (const left of [true, false]) {
    const dir = left ? 1 : -1;
    const baseX = left ? 0.1 * W : 0.9 * W;
    const baseY = 0.88 * H + 4 * Math.sin(t * Math.PI * 2 + (left ? 0 : 1));
    for (let i = 0; i <= 1; i++) piece(ctx, baseX + dir * i * 26, baseY - i * 22, 24, P.accent, dir);
  }
}

function piece(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: Rgba, dir: number): void {
  const half = 0.5 * s, knob = 0.22 * s;
  ctx.save(); ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, 2);
  ctx.moveTo(0 + knob, -half); ctx.arc(0, -half, knob, 0, Math.PI * 2);
  ctx.fillStyle = rgba(color, 0.24); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath(); ctx.arc(dir * half, 0, knob, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, 2);
  ctx.moveTo(0 + knob, -half); ctx.arc(0, -half, knob, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(color, 0.34); ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

// ── Vines (Earth Day) ────────────────────────────────────────────────────
const STEM_GREEN = hex(0x15803d);
const VINE_LEAF = hex(0x22c55e);
function vines(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const sway = Math.sin(t * Math.PI * 2);
  for (const left of [true, false]) {
    const dir = left ? 1 : -1;
    const sx = left ? 0 : W, sy = H, h = 0.34 * H;
    const leafAt = (f: number) => ({ x: sx + dir * (18 + 10 * sway) * Math.sin(f * Math.PI * 1.5), y: sy - h * f });
    ctx.strokeStyle = rgba(STEM_GREEN, 0.4); ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath();
    for (let f = 0; f <= 1.0001; f += 0.05) { const p = leafAt(f); if (f === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      const f = i / 5, p = leafAt(f);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.rotate((left ? -0.6 : 0.6) + sway * 0.15 + (i % 2 === 0 ? 0.9 : -0.9));
      hollyLeafPath(ctx, 16);
      ctx.fillStyle = rgba(lerp(VINE_LEAF, P.accent, i / 6), 0.4); ctx.fill();
      ctx.restore();
    }
    const tip = leafAt(1.0);
    const bloom = 0.85 + 0.15 * Math.sin(t * Math.PI * 2 + (left ? 0 : 1.4));
    ctx.fillStyle = rgba(P.accent, 0.4);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(tip.x + Math.cos(a) * 3.2 * bloom, tip.y + Math.sin(a) * 3.2 * bloom, 2.2 * bloom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba(hex(0xfacc15), 0.6);
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Smileys (Emoji Day) ──────────────────────────────────────────────────
const INK_DARK = hex(0x1f2937);
function smileys(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const spots: [number, number][] = [[0.1 * W, 0.12 * H], [0.9 * W, 0.16 * H], [0.14 * W, 0.88 * H], [0.88 * W, 0.85 * H]];
  const face = lerp(hex(0xfacc15), P.accent, 0.2);
  spots.forEach(([sx, sy], i) => {
    const cx = sx, cy = sy + 5 * Math.sin(t * Math.PI * 2 + i), r = 12;
    ctx.fillStyle = rgba(face, 0.4);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(face, 0.55); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = rgba(INK_DARK, 0.5);
    ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, cy - 3, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(INK_DARK, 0.5); ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy + 1, 6, 0.2, 0.2 + (Math.PI - 0.4)); ctx.stroke();
  });
}

// ── Circuit (World Logic Day) ────────────────────────────────────────────
function circuit(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  for (const left of [true, false]) {
    const rand = mulberry32(left ? 5 : 11);
    const ox = left ? 0 : W, dir = left ? 1 : -1;
    const nodes: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) nodes.push({ x: ox + dir * (18 + rand() * 0.28 * W), y: 14 + rand() * 0.26 * H });
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = rgba(P.accent, 0.22); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y); ctx.stroke();
      const f = (t * 2 + i * 0.3) % 1;
      const bx = nodes[i].x + (nodes[i + 1].x - nodes[i].x) * f, by = nodes[i].y + (nodes[i + 1].y - nodes[i].y) * f;
      ctx.fillStyle = rgba(P.bannerTo, 0.5);
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
    }
    for (const n of nodes) {
      ctx.fillStyle = rgba(P.accent, 0.5);
      ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(WHITE, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

// ── Lotus (Yoga Day) ─────────────────────────────────────────────────────
function lotus(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, P: Pal): void {
  const breathe = 0.9 + 0.1 * Math.sin(t * Math.PI * 2);
  for (const left of [true, false]) {
    const cx = left ? 0.12 * W : 0.88 * W, cy = 0.9 * H;
    glowDisc(ctx, cx, cy, 44 * breathe, P.accent, 0.1);
    for (let layer = 0; layer <= 1; layer++) {
      const len = (layer ? 20 : 30) * breathe;
      const col = layer ? lerp(P.accent, WHITE, 0.4) : P.accent;
      for (let i = 0; i <= 4; i++) {
        const a = -Math.PI + Math.PI * (i / 4) + (layer ? 0.3 : 0);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-0.3 * len, -0.7 * len, 0, -len);
        ctx.quadraticCurveTo(0.3 * len, -0.7 * len, 0, 0);
        ctx.closePath();
        ctx.fillStyle = rgba(col, 0.28); ctx.fill();
        ctx.restore();
      }
    }
  }
}
