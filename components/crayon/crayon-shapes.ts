import { HandDrawn } from "./hand-drawn";
import {
  wobblyPolyline,
  wobblyOval,
  wobblyCircle,
  wobblyLine,
  drawCrayonStroke,
  drawCrayonFill,
  drawCrayonHatch,
  hexToRgba,
  rectFromLTRB,
  rectFromCenter,
  type Rect,
  type Point,
} from "./crayon-stroke";
import type { CrayonBrush } from "./crayon-stroke";

export const kSceneDesignHeight = 100;

function point(x: number, y: number): Point { return { x, y }; }

export function paintCrayonHill(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; fill: string; outline: string; seed: number; step?: number; unit?: number; crest?: number; lineWidth?: number; opacity?: number; outlineOnly?: boolean },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const crest = opts.crest ?? 0.42;
  const lineWidth = opts.lineWidth ?? 2.2;
  const opacity = opts.opacity ?? 1;
  const area = opts.area;
  if (area.width <= 0 || area.height <= 0 || opacity <= 0) return;
  const summitX = area.left + area.width * Math.max(0, Math.min(1, crest));
  const ridge: Point[] = [
    point(area.left - unit * 4, area.bottom),
    point(area.left + (summitX - area.left) * 0.45, area.bottom - area.height * (0.52 + HandDrawn.noise(opts.seed, 0, 1) * 0.18)),
    point(summitX, area.top),
    point(summitX + (area.right - summitX) * 0.55, area.bottom - area.height * (0.46 + HandDrawn.noise(opts.seed, 0, 2) * 0.2)),
    point(area.right + unit * 4, area.bottom),
  ];
  const path = wobblyPolyline(ridge, { seed: opts.seed, step, amplitude: unit * 1.1, wavelength: unit * 13, closed: true });
  if (!opts.outlineOnly) {
    drawCrayonFill(ctx, path, opts.fill, { seed: opts.seed ^ 0x51, step, slip: unit * 0.9, opacity, bounds: area, center: area.center });
  }
  drawCrayonStroke(ctx, path, { color: opts.outline, width: unit * lineWidth, passes: 2, opacity, grain: 0.35, wobble: unit * 1.0, wavelength: unit * 12, seed: opts.seed ^ 0x7a }, { step });
}

export function paintCrayonGrassTuft(
  ctx: CanvasRenderingContext2D,
  opts: { base: Point; height: number; color: string; seed: number; step?: number; unit?: number; blades?: number; spread?: number; lineWidth?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const blades = Math.max(2, Math.min(9, opts.blades ?? 4));
  const spread = opts.spread ?? 0.55;
  const lineWidth = opts.lineWidth ?? 1.6;
  const opacity = opts.opacity ?? 1;
  if (opts.height <= 0 || opacity <= 0) return;
  for (let i = 0; i < blades; i++) {
    const t = blades === 1 ? 0.5 : i / (blades - 1);
    const lean = (t - 0.5) * 2;
    const len = opts.height * (0.62 + HandDrawn.noise(opts.seed, 0, 10 + i) * 0.38);
    const root = point(opts.base.x + lean * opts.height * 0.22, opts.base.y);
    const tip = point(root.x + lean * len * spread + HandDrawn.signedNoise(opts.seed, 0, 20 + i) * unit, root.y - len);
    const bend = point((root.x + tip.x) / 2 - lean * len * 0.16, (root.y + tip.y) / 2 - len * 0.06);
    const p = wobblyPolyline([root, bend, tip], { seed: opts.seed + i * 37, step, amplitude: unit * 0.5, wavelength: unit * 7 });
    drawCrayonStroke(ctx, p, { color: opts.color, width: unit * lineWidth, passes: 2, opacity, grain: 0.3, wobble: unit * 0.5, wavelength: unit * 7, seed: opts.seed + i * 37 }, { step });
  }
}

export function paintCrayonRock(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; fill: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.area.width <= 0 || opacity <= 0) return;
  const body = wobblyOval(opts.area, { seed: opts.seed, step, amplitude: unit * 1.6, segments: 11 });
  drawCrayonFill(ctx, body, opts.fill, { seed: opts.seed ^ 0x11, step, slip: unit * 0.8, opacity, bounds: opts.area, center: opts.area.center });
  drawCrayonStroke(ctx, body, { color: opts.outline, width: unit * 2.0, passes: 2, opacity, grain: 0.4, wobble: unit * 0.8, wavelength: unit * 9, seed: opts.seed ^ 0x12 }, { step });
  const crack = wobblyPolyline([point(opts.area.left + opts.area.width * 0.32, opts.area.top + opts.area.height * 0.34), point(opts.area.left + opts.area.width * 0.52, opts.area.top + opts.area.height * 0.6), point(opts.area.left + opts.area.width * 0.46, opts.area.bottom - unit)], { seed: opts.seed ^ 0x13, step, amplitude: unit * 0.6, wavelength: unit * 7 });
  drawCrayonStroke(ctx, crack, { color: opts.outline, width: unit * 1.3, passes: 1, opacity: opacity * 0.7, grain: 0.2, wobble: unit * 0.5, wavelength: unit * 7, seed: opts.seed ^ 0x14 }, { step });
}

export function paintCrayonPond(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; fill: string; outline: string; glint: string; seed: number; step?: number; unit?: number; ripple?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  const ripple = opts.ripple ?? 0;
  if (opts.area.width <= 0 || opacity <= 0) return;
  const surface = wobblyOval(opts.area, { seed: opts.seed, step, amplitude: unit * 1.3, segments: 16 });
  drawCrayonFill(ctx, surface, opts.fill, { seed: opts.seed ^ 0x21, step, slip: unit * 0.7, opacity: opacity * 0.85, bounds: opts.area, center: opts.area.center });
  drawCrayonStroke(ctx, surface, { color: opts.outline, width: unit * 1.8, passes: 2, opacity, grain: 0.3, wobble: unit * 0.7, wavelength: unit * 11, seed: opts.seed ^ 0x22 }, { step });
  ctx.save();
  // clip
  // @ts-ignore Path2D clip
  try { ctx.clip(surface); } catch {}
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.22;
    const y = opts.area.top + opts.area.height * t;
    const inset = opts.area.width * (0.18 + i * 0.09);
    const drift = Math.sin((ripple + i * 0.37) * 2 * Math.PI) * opts.area.width * 0.05;
    const line = wobblyLine(point(opts.area.left + inset + drift, y), point(opts.area.right - inset + drift, y), { seed: opts.seed + i * 53, step, amplitude: unit * 0.4, wavelength: unit * 9 });
    drawCrayonStroke(ctx, line, { color: opts.glint, width: unit * 1.4, passes: 1, opacity: opacity * (0.75 - i * 0.16), grain: 0, wobble: unit * 0.4, wavelength: unit * 9, seed: opts.seed + i * 53 }, { step });
  }
  ctx.restore();
}

export function paintCrayonTree(
  ctx: CanvasRenderingContext2D,
  opts: { base: Point; height: number; trunk: string; canopy: string; outline: string; seed: number; step?: number; unit?: number; lean?: number; canopyBlobs?: number; canopySpread?: number; opacity?: number; hatchCanopy?: boolean },
): Point {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const lean = opts.lean ?? 0;
  const opacity = opts.opacity ?? 1;
  const hatchCanopy = opts.hatchCanopy ?? true;
  if (opts.height <= 0 || opacity <= 0) return opts.base;
  const trunkHeight = opts.height * 0.56;
  const trunkWidth = opts.height * 0.1;
  const crown = point(opts.base.x + lean * opts.height * 0.16, opts.base.y - trunkHeight);
  const trunkPath = wobblyPolyline([point(opts.base.x - trunkWidth * 0.9, opts.base.y), point(crown.x - trunkWidth * 0.34, crown.y), point(crown.x + trunkWidth * 0.34, crown.y), point(opts.base.x + trunkWidth * 0.9, opts.base.y)], { seed: opts.seed ^ 0x31, step, amplitude: unit * 0.7, wavelength: unit * 12, closed: true });
  const trunkBounds = rectFromLTRB(opts.base.x - trunkWidth * 0.9, crown.y, opts.base.x + trunkWidth * 0.9, opts.base.y);
  drawCrayonFill(ctx, trunkPath, opts.trunk, { seed: opts.seed ^ 0x32, step, slip: unit * 0.7, opacity, bounds: trunkBounds, center: trunkBounds.center });
  drawCrayonStroke(ctx, trunkPath, { color: opts.outline, width: unit * 2.0, passes: 2, opacity, grain: 0.4, wobble: unit * 0.7, wavelength: unit * 10, seed: opts.seed ^ 0x33 }, { step });
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? -1 : 1;
    const from = { x: opts.base.x + (crown.x - opts.base.x) * (0.62 + i * 0.14), y: opts.base.y + (crown.y - opts.base.y) * (0.62 + i * 0.14) };
    const to = point(from.x + dir * opts.height * 0.2, from.y - opts.height * (0.16 + i * 0.05));
    const seg = wobblyPolyline([from, point((from.x + to.x) / 2, (from.y + to.y) / 2), to], { seed: opts.seed + 71 + i, step, amplitude: unit * 0.6, wavelength: unit * 8 });
    drawCrayonStroke(ctx, seg, { color: opts.outline, width: unit * 1.7, passes: 2, opacity, grain: 0.3, wobble: unit * 0.6, wavelength: unit * 8, seed: opts.seed + 71 + i }, { step });
  }
  const blobs = Math.max(1, Math.min(5, opts.canopyBlobs ?? 3));
  const canopySpread = opts.canopySpread ?? 0.62;
  const canopyR = opts.height * canopySpread * 0.5;
  for (let i = 0; i < blobs; i++) {
    const order = blobs === 1 ? 0 : i === blobs - 1 ? 0 : i + 1;
    const a = blobs === 1 ? -Math.PI / 2 : -Math.PI / 2 + (order / blobs - 0.5) * 2.1;
    const dist = order === 0 ? 0 : canopyR * 0.66;
    const r = canopyR * (order === 0 ? 1 : 0.72 + HandDrawn.noise(opts.seed, 0, 40 + i) * 0.2);
    const c = point(crown.x + Math.cos(a) * dist, crown.y + Math.sin(a) * dist - canopyR * 0.55);
    const blob = wobblyOval(rectFromCenter(c, r * 2.1, r * 1.85), { seed: opts.seed + 101 + i, step, amplitude: unit * 1.9, segments: 13 });
    const bnds = rectFromCenter(c, r * 2.1, r * 1.85);
    drawCrayonFill(ctx, blob, opts.canopy, { seed: opts.seed + 111 + i, step, slip: unit * 1.2, opacity: opacity * (hatchCanopy ? 0.68 : 1), bounds: bnds, center: c });
    if (hatchCanopy) {
      drawCrayonHatch(ctx, blob, { color: opts.canopy, width: unit * 2.4, passes: 1, opacity, grain: 0, wobble: unit * 1.0, wavelength: unit * 11, seed: opts.seed + 121 + i }, { step, spacing: unit * 5.6, degrees: -58 + i * 13, maxLines: 26, bounds: bnds });
    }
    drawCrayonStroke(ctx, blob, { color: opts.outline, width: unit * 2.1, passes: 2, opacity, grain: 0.35, wobble: unit * 1.0, wavelength: unit * 10, seed: opts.seed + 131 + i }, { step });
  }
  return point(crown.x, crown.y - canopyR * 0.55);
}

export function paintCrayonBamboo(
  ctx: CanvasRenderingContext2D,
  opts: { base: Point; height: number; stalk: string; leaf: string; outline: string; seed: number; step?: number; unit?: number; lean?: number; segments?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const lean = opts.lean ?? 0.06;
  const opacity = opts.opacity ?? 1;
  if (opts.height <= 0 || opacity <= 0) return;
  const width = opts.height * 0.075;
  const top = point(opts.base.x + lean * opts.height, opts.base.y - opts.height);
  const culm = wobblyPolyline([point(opts.base.x - width * 0.5, opts.base.y), point(top.x - width * 0.36, top.y), point(top.x + width * 0.36, top.y), point(opts.base.x + width * 0.5, opts.base.y)], { seed: opts.seed ^ 0x41, step, amplitude: unit * 0.5, wavelength: unit * 14, closed: true });
  const bnds = rectFromLTRB(opts.base.x - width * 0.5, top.y, opts.base.x + width * 0.5, opts.base.y);
  drawCrayonFill(ctx, culm, opts.stalk, { seed: opts.seed ^ 0x42, step, slip: unit * 0.5, opacity, bounds: bnds, center: bnds.center });
  drawCrayonStroke(ctx, culm, { color: opts.outline, width: unit * 1.7, passes: 2, opacity, grain: 0.35, wobble: unit * 0.5, wavelength: unit * 12, seed: opts.seed ^ 0x43 }, { step });
  const nodes = Math.max(1, Math.min(8, opts.segments ?? 4));
  for (let i = 1; i <= nodes; i++) {
    const t = i / (nodes + 1);
    const c = point(opts.base.x + (top.x - opts.base.x) * t, opts.base.y + (top.y - opts.base.y) * t);
    const line = wobblyLine(point(c.x - width * 0.52, c.y), point(c.x + width * 0.52, c.y), { seed: opts.seed + 61 + i, step, amplitude: unit * 0.35, wavelength: unit * 6 });
    drawCrayonStroke(ctx, line, { color: opts.outline, width: unit * 1.5, passes: 1, opacity: opacity * 0.8, grain: 0.2, wobble: unit * 0.35, wavelength: unit * 6, seed: opts.seed + 61 + i }, { step });
  }
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? -1 : 1;
    const root = point(opts.base.x + (top.x - opts.base.x) * (0.72 + i * 0.13), opts.base.y + (top.y - opts.base.y) * (0.72 + i * 0.13));
    const tip = point(root.x + dir * opts.height * 0.19, root.y - opts.height * (0.1 + i * 0.04));
    const blade = wobblyPolyline([root, point((root.x + tip.x) / 2, (root.y + tip.y) / 2 - opts.height * 0.035), tip, point((root.x + tip.x) / 2, (root.y + tip.y) / 2 + opts.height * 0.028)], { seed: opts.seed + 81 + i, step, amplitude: unit * 0.4, wavelength: unit * 8, closed: true });
    const bb = rectFromLTRB(Math.min(root.x, tip.x) - 5, Math.min(root.y, tip.y) - 5, Math.max(root.x, tip.x) + 5, Math.max(root.y, tip.y) + 5);
    drawCrayonFill(ctx, blade, opts.leaf, { seed: opts.seed + 91 + i, step, slip: unit * 0.5, opacity, bounds: bb, center: bb.center });
    drawCrayonStroke(ctx, blade, { color: opts.outline, width: unit * 1.4, passes: 2, opacity, grain: 0.25, wobble: unit * 0.4, wavelength: unit * 8, seed: opts.seed + 91 + i }, { step });
  }
}

export function paintCrayonCloud(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; fill: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number; outlineStroke?: boolean },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.area.width <= 0 || opacity <= 0) return;
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const r = opts.area.height * (i === 1 ? 0.62 : 0.44);
    const c = point(opts.area.left + opts.area.width * (0.24 + t * 0.52), opts.area.bottom - r * (i === 1 ? 1.05 : 0.82));
    const oval = wobblyOval(rectFromCenter(c, r * 2.3, r * 1.9), { seed: opts.seed + 161 + i, step, amplitude: unit * 1.1, segments: 11 });
    drawCrayonFill(ctx, oval, opts.fill, { seed: opts.seed ^ 0x61, step, slip: unit * 0.8, opacity, bounds: opts.area, center: opts.area.center });
    if (opts.outlineStroke ?? true) {
      drawCrayonStroke(ctx, oval, { color: opts.outline, width: unit * 1.5, passes: 2, opacity: opacity * 0.35, grain: 0.3, wobble: unit * 0.8, wavelength: unit * 11, seed: opts.seed ^ (0x62 + i) }, { step });
    }
  }
}

export function paintCrayonSun(
  ctx: CanvasRenderingContext2D,
  opts: { center: Point; radius: number; fill: string; outline: string; seed: number; step?: number; unit?: number; rays?: number; rayPhase?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const rays = opts.rays ?? 8;
  const rayPhase = opts.rayPhase ?? 0;
  const opacity = opts.opacity ?? 1;
  if (opts.radius <= 0 || opacity <= 0) return;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * 2 * Math.PI + rayPhase;
    const inner = opts.radius * 1.25;
    const outer = opts.radius * (1.62 + HandDrawn.noise(opts.seed, 0, 70 + i) * 0.42);
    const line = wobblyLine(point(opts.center.x + Math.cos(a) * inner, opts.center.y + Math.sin(a) * inner), point(opts.center.x + Math.cos(a) * outer, opts.center.y + Math.sin(a) * outer), { seed: opts.seed + 171 + i, step, amplitude: unit * 0.45, wavelength: unit * 7 });
    drawCrayonStroke(ctx, line, { color: opts.fill, width: unit * 1.8, passes: 2, opacity: opacity * 0.9, grain: 0.2, wobble: unit * 0.45, wavelength: unit * 7, seed: opts.seed + 171 + i }, { step });
  }
  const disc = wobblyCircle(opts.center, opts.radius, { seed: opts.seed ^ 0x71, step, amplitude: unit * 0.9, segments: 14 });
  drawCrayonFill(ctx, disc, opts.fill, { seed: opts.seed ^ 0x72, step, slip: unit * 0.6, opacity, bounds: rectFromCenter(opts.center, opts.radius * 2, opts.radius * 2), center: opts.center });
  drawCrayonStroke(ctx, disc, { color: opts.outline, width: unit * 1.6, passes: 2, opacity: opacity * 0.8, grain: 0.25, wobble: unit * 0.6, wavelength: unit * 9, seed: opts.seed ^ 0x73 }, { step });
}

export function paintCrayonMoon(
  ctx: CanvasRenderingContext2D,
  opts: { center: Point; radius: number; fill: string; outline: string; seed: number; step?: number; unit?: number; phase?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.radius <= 0 || opacity <= 0) return;
  const disc = wobblyCircle(opts.center, opts.radius, { seed: opts.seed ^ 0x81, step, amplitude: unit * 0.8, segments: 15 });
  ctx.save();
  try { ctx.clip(disc); } catch {}
  drawCrayonFill(ctx, disc, opts.fill, { seed: opts.seed ^ 0x82, step, slip: unit * 0.5, opacity, bounds: rectFromCenter(opts.center, opts.radius * 2, opts.radius * 2), center: opts.center });
  for (let i = 0; i < 2; i++) {
    const cr = opts.radius * (0.2 + i * 0.08);
    const cc = point(opts.center.x + opts.radius * (i === 0 ? -0.3 : 0.22), opts.center.y + opts.radius * (i === 0 ? 0.24 : -0.3));
    const c = wobblyCircle(cc, cr, { seed: opts.seed + 181 + i, step, amplitude: unit * 0.4, segments: 9 });
    drawCrayonStroke(ctx, c, { color: opts.outline, width: unit * 1.2, passes: 1, opacity: opacity * 0.45, grain: 0.2, wobble: unit * 0.4, wavelength: unit * 7, seed: opts.seed + 181 + i }, { step });
  }
  ctx.restore();
  drawCrayonStroke(ctx, disc, { color: opts.outline, width: unit * 1.5, passes: 2, opacity: opacity * 0.7, grain: 0.25, wobble: unit * 0.6, wavelength: unit * 9, seed: opts.seed ^ 0x83 }, { step });
}

export function paintCrayonStar(
  ctx: CanvasRenderingContext2D,
  opts: { center: Point; radius: number; color: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.radius <= 0 || opacity <= 0) return;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    const reach = i % 2 === 0 ? opts.radius : opts.radius * 0.52;
    const line = wobblyLine(point(opts.center.x - Math.cos(a) * reach, opts.center.y - Math.sin(a) * reach), point(opts.center.x + Math.cos(a) * reach, opts.center.y + Math.sin(a) * reach), { seed: opts.seed + 191 + i, step, amplitude: unit * 0.2, wavelength: unit * 5 });
    drawCrayonStroke(ctx, line, { color: opts.color, width: Math.max(unit * 0.9, opts.radius * 0.24), passes: 2, opacity, grain: 0, wobble: unit * 0.25, wavelength: unit * 5, seed: opts.seed + 191 + i }, { step });
  }
}

export function paintCrayonCrag(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; fill: string; outline: string; seed: number; step?: number; unit?: number; cap?: string; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.area.width <= 0 || opacity <= 0) return;
  const peakX = opts.area.left + opts.area.width * (0.38 + HandDrawn.noise(opts.seed, 0, 4) * 0.24);
  const body = wobblyPolyline([point(opts.area.left, opts.area.bottom), point(opts.area.left + opts.area.width * 0.2, opts.area.top + opts.area.height * 0.46), point(peakX - opts.area.width * 0.08, opts.area.top + opts.area.height * 0.14), point(peakX, opts.area.top), point(peakX + opts.area.width * 0.13, opts.area.top + opts.area.height * 0.28), point(opts.area.left + opts.area.width * 0.74, opts.area.top + opts.area.height * 0.2), point(opts.area.right, opts.area.bottom)], { seed: opts.seed ^ 0x91, step, amplitude: unit * 0.9, wavelength: unit * 11, closed: true });
  drawCrayonFill(ctx, body, opts.fill, { seed: opts.seed ^ 0x92, step, slip: unit * 0.9, opacity, bounds: opts.area, center: opts.area.center });
  if (opts.cap) {
    ctx.save();
    try { ctx.clip(body); } catch {}
    const snow = wobblyPolyline([point(peakX - opts.area.width * 0.16, opts.area.top + opts.area.height * 0.3), point(peakX - opts.area.width * 0.05, opts.area.top + opts.area.height * 0.1), point(peakX, opts.area.top - unit), point(peakX + opts.area.width * 0.16, opts.area.top + opts.area.height * 0.34)], { seed: opts.seed ^ 0x93, step, amplitude: unit * 0.7, wavelength: unit * 8, closed: true });
    drawCrayonFill(ctx, snow, opts.cap, { seed: opts.seed ^ 0x94, step, slip: unit * 0.6, opacity, bounds: opts.area, center: opts.area.center });
    ctx.restore();
  }
  drawCrayonStroke(ctx, body, { color: opts.outline, width: unit * 2.0, passes: 2, opacity, grain: 0.35, wobble: unit * 0.9, wavelength: unit * 10, seed: opts.seed ^ 0x95 }, { step });
}

export function paintCrayonRuinPillar(
  ctx: CanvasRenderingContext2D,
  opts: { base: Point; height: number; width: number; fill: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.height <= 0 || opts.width <= 0 || opacity <= 0) return;
  const top = opts.base.y - opts.height;
  const column = wobblyPolyline([point(opts.base.x - opts.width * 0.5, opts.base.y), point(opts.base.x - opts.width * 0.42, top + opts.height * 0.06), point(opts.base.x - opts.width * 0.12, top), point(opts.base.x + opts.width * 0.2, top + opts.height * 0.1), point(opts.base.x + opts.width * 0.44, top + opts.height * 0.03), point(opts.base.x + opts.width * 0.5, opts.base.y)], { seed: opts.seed ^ 0xa1, step, amplitude: unit * 0.6, wavelength: unit * 12, closed: true });
  const bnds = rectFromLTRB(opts.base.x - opts.width * 0.5, top, opts.base.x + opts.width * 0.5, opts.base.y);
  drawCrayonFill(ctx, column, opts.fill, { seed: opts.seed ^ 0xa2, step, slip: unit * 0.7, opacity, bounds: bnds, center: bnds.center });
  drawCrayonStroke(ctx, column, { color: opts.outline, width: unit * 1.9, passes: 2, opacity, grain: 0.4, wobble: unit * 0.6, wavelength: unit * 11, seed: opts.seed ^ 0xa3 }, { step });
  ctx.save();
  try { ctx.clip(column); } catch {}
  for (let i = 0; i < 2; i++) {
    const y = opts.base.y - opts.height * (0.3 + i * 0.34);
    const line = wobblyLine(point(opts.base.x - opts.width * 0.5, y), point(opts.base.x + opts.width * 0.5, y), { seed: opts.seed + 201 + i, step, amplitude: unit * 0.4, wavelength: unit * 8 });
    drawCrayonStroke(ctx, line, { color: opts.outline, width: unit * 1.3, passes: 1, opacity: opacity * 0.6, grain: 0.2, wobble: unit * 0.4, wavelength: unit * 8, seed: opts.seed + 201 + i }, { step });
  }
  ctx.restore();
}

export function paintCrayonFlower(
  ctx: CanvasRenderingContext2D,
  opts: { base: Point; height: number; petal: string; centre: string; stem: string; seed: number; step?: number; unit?: number; petals?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.height <= 0 || opacity <= 0) return;
  const head = point(opts.base.x + HandDrawn.signedNoise(opts.seed, 0, 3) * opts.height * 0.12, opts.base.y - opts.height);
  const stemLine = wobblyPolyline([opts.base, point((opts.base.x + head.x) / 2, (opts.base.y + head.y) / 2), head], { seed: opts.seed ^ 0x51, step, amplitude: unit * 0.4, wavelength: unit * 7 });
  drawCrayonStroke(ctx, stemLine, { color: opts.stem, width: unit * 1.4, passes: 2, opacity, grain: 0.25, wobble: unit * 0.4, wavelength: unit * 7, seed: opts.seed ^ 0x51 }, { step });
  const r = opts.height * 0.3;
  const count = Math.max(3, Math.min(8, opts.petals ?? 5));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 2 * Math.PI + HandDrawn.noise(opts.seed, 0, 60 + i) * 0.3;
    const c = point(head.x + Math.cos(a) * r * 0.62, head.y + Math.sin(a) * r * 0.62);
    const p = wobblyOval(rectFromCenter(c, r * 0.92, r * 0.78), { seed: opts.seed + 141 + i, step, amplitude: unit * 0.5, segments: 9 });
    drawCrayonFill(ctx, p, opts.petal, { seed: opts.seed + 151 + i, step, slip: unit * 0.4, opacity, bounds: rectFromCenter(c, r * 0.92, r * 0.78), center: c });
  }
  const eye = wobblyCircle(head, r * 0.42, { seed: opts.seed ^ 0x52, step, amplitude: unit * 0.4, segments: 9 });
  drawCrayonFill(ctx, eye, opts.centre, { seed: opts.seed ^ 0x53, step, slip: unit * 0.3, opacity, bounds: rectFromCenter(head, r * 0.84, r * 0.84), center: head });
}

export function paintCrayonCushion(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; fill: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.area.width <= 0 || opacity <= 0) return;
  const body = wobblyOval(opts.area, { seed: opts.seed, step, amplitude: unit * 1.4, segments: 13 });
  drawCrayonFill(ctx, body, opts.fill, { seed: opts.seed ^ 0xc1, step, slip: unit * 0.8, opacity, bounds: opts.area, center: opts.area.center });
  drawCrayonStroke(ctx, body, { color: opts.outline, width: unit * 2.0, passes: 2, opacity, grain: 0.3, wobble: unit * 0.8, wavelength: unit * 11, seed: opts.seed ^ 0xc2 }, { step });
  ctx.save();
  try { ctx.clip(body); } catch {}
  const seam = wobblyPolyline([point(opts.area.left + opts.area.width * 0.14, opts.area.center.y + opts.area.height * 0.06), point(opts.area.center.x, opts.area.center.y + opts.area.height * 0.14), point(opts.area.right - opts.area.width * 0.14, opts.area.center.y + opts.area.height * 0.06)], { seed: opts.seed ^ 0xc3, step, amplitude: unit * 0.5, wavelength: unit * 10 });
  drawCrayonStroke(ctx, seam, { color: opts.outline, width: unit * 1.3, passes: 1, opacity: opacity * 0.55, grain: 0.2, wobble: unit * 0.5, wavelength: unit * 10, seed: opts.seed ^ 0xc4 }, { step });
  ctx.restore();
}

export function paintCrayonLantern(
  ctx: CanvasRenderingContext2D,
  opts: { top: Point; size: number; glow: string; body: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.size <= 0 || opacity <= 0) return;
  const centre = point(opts.top.x, opts.top.y + opts.size * 1.4);
  for (let i = 3; i >= 1; i--) {
    ctx.beginPath();
    ctx.fillStyle = hexToRgba(opts.glow, opacity * 0.1 / i);
    ctx.arc(centre.x, centre.y, opts.size * (0.9 + i * 0.9), 0, Math.PI * 2);
    ctx.fill();
  }
  const hook = wobblyLine(opts.top, point(centre.x, centre.y - opts.size * 0.9), { seed: opts.seed ^ 0x5a, step, amplitude: unit * 0.4, wavelength: unit * 8 });
  drawCrayonStroke(ctx, hook, { color: opts.outline, width: unit * 1.2, passes: 1, opacity: opacity * 0.7, grain: 0.2, wobble: unit * 0.4, wavelength: unit * 8, seed: opts.seed ^ 0x5b }, { step });
  const frame = rectFromCenter(centre, opts.size * 1.4, opts.size * 2.0);
  const lantern = wobblyOval(frame, { seed: opts.seed ^ 0x5c, step, amplitude: unit * 0.6, segments: 11 });
  drawCrayonFill(ctx, lantern, opts.glow, { seed: opts.seed ^ 0x5d, step, slip: unit * 0.4, opacity: opacity * 0.9, bounds: frame, center: centre });
  drawCrayonStroke(ctx, lantern, { color: opts.outline, width: unit * 1.4, passes: 2, opacity, grain: 0.25, wobble: unit * 0.5, wavelength: unit * 8, seed: opts.seed ^ 0x5e }, { step });
}

export function paintCrayonKennel(
  ctx: CanvasRenderingContext2D,
  opts: { base: Point; height: number; wall: string; roof: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.height <= 0 || opacity <= 0) return;
  const w = opts.height * 0.95;
  const wallTop = opts.base.y - opts.height * 0.62;
  const walls = wobblyPolyline([point(opts.base.x - w / 2, opts.base.y), point(opts.base.x - w / 2, wallTop), point(opts.base.x + w / 2, wallTop), point(opts.base.x + w / 2, opts.base.y)], { seed: opts.seed ^ 0x71, step, amplitude: unit * 0.5, wavelength: unit * 12, closed: true });
  const bnds = rectFromLTRB(opts.base.x - w / 2, wallTop, opts.base.x + w / 2, opts.base.y);
  drawCrayonFill(ctx, walls, opts.wall, { seed: opts.seed ^ 0x72, step, slip: unit * 0.6, opacity, bounds: bnds, center: bnds.center });
  drawCrayonStroke(ctx, walls, { color: opts.outline, width: unit * 2.0, passes: 2, opacity, grain: 0.3, wobble: unit * 0.6, wavelength: unit * 11, seed: opts.seed ^ 0x73 }, { step });
  const roofPath = wobblyPolyline([point(opts.base.x - w * 0.62, wallTop + unit * 1.5), point(opts.base.x, opts.base.y - opts.height), point(opts.base.x + w * 0.62, wallTop + unit * 1.5)], { seed: opts.seed ^ 0x74, step, amplitude: unit * 0.6, wavelength: unit * 11, closed: true });
  const rBnds = rectFromLTRB(opts.base.x - w * 0.62, wallTop, opts.base.x + w * 0.62, opts.base.y - opts.height + wallTop);
  drawCrayonFill(ctx, roofPath, opts.roof, { seed: opts.seed ^ 0x75, step, slip: unit * 0.7, opacity, bounds: rBnds, center: rBnds.center });
  drawCrayonStroke(ctx, roofPath, { color: opts.outline, width: unit * 2.0, passes: 2, opacity, grain: 0.3, wobble: unit * 0.6, wavelength: unit * 10, seed: opts.seed ^ 0x76 }, { step });
  const door = wobblyOval(rectFromCenter(point(opts.base.x, opts.base.y - opts.height * 0.24), w * 0.46, opts.height * 0.5), { seed: opts.seed ^ 0x77, step, amplitude: unit * 0.4, segments: 11 });
  drawCrayonFill(ctx, door, opts.outline, { seed: opts.seed ^ 0x78, step, slip: unit * 0.3, opacity: opacity * 0.85, bounds: rectFromCenter(point(opts.base.x, opts.base.y - opts.height * 0.24), w * 0.46, opts.height * 0.5), center: point(opts.base.x, opts.base.y - opts.height * 0.24) });
}

export function paintCrayonBall(
  ctx: CanvasRenderingContext2D,
  opts: { center: Point; radius: number; fill: string; accent: string; outline: string; seed: number; step?: number; unit?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const opacity = opts.opacity ?? 1;
  if (opts.radius <= 0 || opacity <= 0) return;
  const ball = wobblyCircle(opts.center, opts.radius, { seed: opts.seed ^ 0x81, step, amplitude: unit * 0.5, segments: 12 });
  drawCrayonFill(ctx, ball, opts.fill, { seed: opts.seed ^ 0x82, step, slip: unit * 0.4, opacity, bounds: rectFromCenter(opts.center, opts.radius * 2, opts.radius * 2), center: opts.center });
  ctx.save();
  try { ctx.clip(ball); } catch {}
  const band = wobblyPolyline([point(opts.center.x - opts.radius, opts.center.y - opts.radius * 0.2), point(opts.center.x, opts.center.y - opts.radius * 0.55), point(opts.center.x + opts.radius, opts.center.y - opts.radius * 0.2)], { seed: opts.seed ^ 0x83, step, amplitude: unit * 0.4, wavelength: unit * 8 });
  drawCrayonStroke(ctx, band, { color: opts.accent, width: unit * 2.2, passes: 2, opacity, grain: 0.1, wobble: unit * 0.4, wavelength: unit * 8, seed: opts.seed ^ 0x84 }, { step });
  ctx.restore();
  drawCrayonStroke(ctx, ball, { color: opts.outline, width: unit * 1.6, passes: 2, opacity, grain: 0.25, wobble: unit * 0.5, wavelength: unit * 9, seed: opts.seed ^ 0x85 }, { step });
}

export function paintCrayonBranch(
  ctx: CanvasRenderingContext2D,
  opts: { from: Point; to: Point; color: string; seed: number; step?: number; unit?: number; thickness?: number; sag?: number; opacity?: number },
): void {
  const step = opts.step ?? 0;
  const unit = opts.unit ?? 1;
  const thickness = opts.thickness ?? 2.6;
  const sag = opts.sag ?? 0.14;
  const opacity = opts.opacity ?? 1;
  const mid = point((opts.from.x + opts.to.x) / 2, (opts.from.y + opts.to.y) / 2 + Math.hypot(opts.to.x - opts.from.x, opts.to.y - opts.from.y) * sag);
  const spine = wobblyPolyline([opts.from, mid, opts.to], { seed: opts.seed, step, amplitude: unit * 0.7, wavelength: unit * 11 });
  drawCrayonStroke(ctx, spine, { color: opts.color, width: unit * thickness, passes: 3, opacity, grain: 0.4, wobble: unit * 0.7, wavelength: unit * 11, seed: opts.seed }, { step });
  for (let i = 0; i < 2; i++) {
    const t = 0.34 + i * 0.36;
    const along = point(opts.from.x + (mid.x - opts.from.x) * t + (opts.to.x - mid.x) * t * 0.5, opts.from.y + (mid.y - opts.from.y) * t);
    const tip = point(along.x + (i === 0 ? -1 : 1) * Math.hypot(opts.to.x - opts.from.x, opts.to.y - opts.from.y) * 0.11, along.y - Math.hypot(opts.to.x - opts.from.x, opts.to.y - opts.from.y) * (0.1 + i * 0.03));
    const twig = wobblyLine(along, tip, { seed: opts.seed + 17 + i, step, amplitude: unit * 0.5, wavelength: unit * 8 });
    drawCrayonStroke(ctx, twig, { color: opts.color, width: unit * thickness * 0.55, passes: 2, opacity, grain: 0.3, wobble: unit * 0.5, wavelength: unit * 8, seed: opts.seed + 17 + i }, { step });
  }
}

export function paintPaperGrain(
  ctx: CanvasRenderingContext2D,
  opts: { area: Rect; color: string; seed: number; density?: number; rampStart?: number; opacity?: number },
): void {
  const density = opts.density ?? 3.2;
  const rampStart = opts.rampStart ?? 0.15;
  const opacity = opts.opacity ?? 1;
  if (opts.area.width <= 0 || opacity <= 0) return;
  const count = Math.max(0, Math.min(4000, Math.floor((opts.area.width * opts.area.height) / 1000 * density)));
  if (count === 0) return;
  for (let i = 0; i < count; i++) {
    const fx = HandDrawn.noise(opts.seed, i, 1);
    const fy = HandDrawn.noise(opts.seed, i, 2);
    const ramp = Math.max(0, Math.min(1, (fy - rampStart) / (1 - rampStart)));
    if (ramp <= 0) continue;
    const x = opts.area.left + fx * opts.area.width;
    const y = opts.area.top + fy * opts.area.height;
    const a = ramp * ramp * HandDrawn.noise(opts.seed, i, 3) * opacity;
    if (a < 0.02) continue;
    ctx.fillStyle = hexToRgba(opts.color, a * 0.5);
    ctx.fillRect(x, y, 1, 1);
  }
}
