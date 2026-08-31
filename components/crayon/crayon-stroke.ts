import { HandDrawn } from "./hand-drawn";

export interface Point { x: number; y: number }
export interface Rect { left: number; top: number; right: number; bottom: number; width: number; height: number; center: Point }

export function rectFromLTRB(left: number, top: number, right: number, bottom: number): Rect {
  return { left, top, right, bottom, width: right - left, height: top - bottom < 0 ? bottom - top : bottom - top, center: { x: (left + right) / 2, y: (top + bottom) / 2 } };
}
export function rectFromCenter(center: Point, width: number, height: number): Rect {
  return { left: center.x - width / 2, top: center.y - height / 2, right: center.x + width / 2, bottom: center.y + height / 2, width, height, center };
}
export function rectFromCircle(center: Point, radius: number): Rect {
  return rectFromCenter(center, radius * 2, radius * 2);
}

export function withAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  const hexA = a.toString(16).padStart(2, "0");
  const base = color.replace("#", "");
  if (base.length === 8) return `#${base.slice(0, 6)}${hexA}`;
  if (base.length === 6) return `#${base}${hexA}`;
  if (base.length === 3) return `#${base}${hexA}`;
  return color;
}

export function hexToRgba(hex: string, alphaOverride?: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = parseInt(h.slice(6, 8), 16) / 255;
    const alpha = alphaOverride !== undefined ? alphaOverride : a;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const alpha = alphaOverride !== undefined ? alphaOverride : 1;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}

export function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const tt = Math.max(0, Math.min(1, t));
  const r = Math.round(pa.r + (pb.r - pa.r) * tt);
  const g = Math.round(pa.g + (pb.g - pa.g) * tt);
  const bl = Math.round(pa.b + (pb.b - pa.b) * tt);
  const al = pa.a + (pb.a - pa.a) * tt;
  return `rgba(${r},${g},${bl},${al})`;
}

function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 1,
  };
}

export interface CrayonBrush {
  color: string;
  width: number;
  passes: number;
  opacity: number;
  grain: number;
  wobble: number;
  wavelength: number;
  seed: number;
}

export function copyBrush(b: CrayonBrush, patch: Partial<CrayonBrush>): CrayonBrush {
  return { ...b, ...patch };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function wobblyLine(a: Point, b: Point, opts: { seed: number; step?: number; amplitude?: number; wavelength?: number }): Path2D {
  return wobblyPolyline([a, b], opts);
}

export function wobblyPolyline(
  points: Point[],
  opts: { seed: number; step?: number; amplitude?: number; wavelength?: number; closed?: boolean },
): Path2D {
  const step = opts.step ?? 0;
  const amplitude = opts.amplitude ?? 1.5;
  const wavelength = opts.wavelength ?? 16;
  const closed = opts.closed ?? false;
  if (points.length < 2) return new Path2D();
  const source = closed ? [...points, points[0]] : points;
  const samples = resample(source, wavelength);
  if (samples.length < 2) {
    const p = new Path2D();
    p.moveTo(source[0].x, source[0].y);
    p.lineTo(source[source.length - 1].x, source[source.length - 1].y);
    return p;
  }
  const pushed = pushAlongNormals(samples, { seed: opts.seed, step, amplitude, closed });
  return smoothThrough(pushed, closed);
}

export function wobblyCircle(
  center: Point,
  radius: number,
  opts: { seed: number; step?: number; amplitude?: number; segments?: number },
): Path2D {
  return wobblyOval(rectFromCircle(center, radius), opts);
}

export function wobblyOval(
  rect: Rect,
  opts: { seed: number; step?: number; amplitude?: number; segments?: number },
): Path2D {
  const step = opts.step ?? 0;
  const amplitude = opts.amplitude ?? 1.8;
  const segments = Math.max(6, opts.segments ?? 18);
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const center = rect.center;
  const ring: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const push = HandDrawn.signedNoise(opts.seed, step, 40 + i) * amplitude;
    ring.push({
      x: center.x + Math.cos(a) * (rx + push),
      y: center.y + Math.sin(a) * (ry + push),
    });
  }
  return smoothThrough(ring, true);
}

export function wobblyRect(
  rect: Rect,
  opts: { seed: number; step?: number; amplitude?: number; wavelength?: number },
): Path2D {
  return wobblyPolyline(
    [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ],
    { ...opts, closed: true },
  );
}

export function wobblePath(
  source: Path2D,
  opts: { seed: number; step?: number; amplitude?: number; wavelength?: number },
  bounds: Rect,
): Path2D {
  const step = opts.step ?? 0;
  const amplitude = opts.amplitude ?? 1.5;
  const wavelength = opts.wavelength ?? 16;
  const count = Math.max(2, Math.ceil((bounds.width + bounds.height) * 0.1));
  const samples: Point[] = [];
  for (let i = 0; i <= count; i++) samples.push({ x: bounds.left + (i / count) * bounds.width, y: bounds.top });
  const pushed = pushAlongNormals(samples, { seed: opts.seed, step, amplitude, closed: false });
  return smoothThrough(pushed, false);
}

export function drawCrayonStroke(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  brush: CrayonBrush,
  opts: { step?: number } = {},
): void {
  const step = opts.step ?? 0;
  if (brush.opacity <= 0) return;
  for (let pass = 0; pass < brush.passes; pass++) {
    const t = brush.passes === 1 ? 1 : pass / (brush.passes - 1);
    const width = lerp(brush.width * 1.7, brush.width * 0.72, t);
    const alpha = lerp(0.14, 0.92, t) * brush.opacity;
    const slip = {
      x: HandDrawn.signedNoise(brush.seed, step, 200 + pass) * 0.5,
      y: HandDrawn.signedNoise(brush.seed, step, 210 + pass) * 0.5,
    };
    ctx.save();
    ctx.translate(slip.x, slip.y);
    ctx.strokeStyle = hexToRgba(brush.color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(path);
    ctx.restore();
  }
  if (brush.grain > 0) drawGrain(ctx, path, brush, step);
}

export function drawCrayonFill(
  ctx: CanvasRenderingContext2D,
  outline: Path2D,
  color: string,
  opts: { seed: number; step?: number; slip?: number; opacity?: number; bounds?: Rect; center?: Point },
): void {
  const step = opts.step ?? 0;
  const slip = opts.slip ?? 1.8;
  const opacity = opts.opacity ?? 1;
  if (opacity <= 0) return;
  let center: Point;
  let bounds = opts.bounds;
  if (opts.center) center = opts.center;
  else if (bounds) center = bounds.center;
  else {
    center = { x: 50, y: 50 };
    bounds = rectFromCenter(center, 100, 100);
  }
  const inflate = 1 + HandDrawn.noise(opts.seed, step, 300) * 0.035;
  ctx.save();
  const tx = HandDrawn.signedNoise(opts.seed, step, 301) * slip;
  const ty = HandDrawn.signedNoise(opts.seed, step, 302) * slip;
  ctx.translate(center.x + tx, center.y + ty);
  ctx.scale(inflate, inflate);
  ctx.translate(-center.x, -center.y);
  ctx.fillStyle = hexToRgba(color, opacity);
  ctx.fill(outline);
  ctx.restore();
}

export function drawCrayonHatch(
  ctx: CanvasRenderingContext2D,
  outline: Path2D,
  brush: CrayonBrush,
  opts: { step?: number; spacing?: number; degrees?: number; maxLines?: number; bounds?: Rect },
): void {
  const step = opts.step ?? 0;
  const spacing = opts.spacing ?? 7;
  const degrees = opts.degrees ?? -62;
  const maxLines = opts.maxLines ?? 90;
  if (brush.opacity <= 0) return;
  let bounds = opts.bounds;
  if (!bounds) bounds = rectFromCenter({ x: 50, y: 50 }, 100, 100);
  if (bounds.width <= 0 || bounds.height <= 0) return;
  const radians = (degrees * Math.PI) / 180;
  const reach = Math.max(bounds.width, bounds.height) * 1.5;
  const lines = Math.min(maxLines, Math.max(1, Math.ceil(reach / spacing)));
  ctx.save();
  ctx.clip(outline);
  ctx.translate(bounds.center.x, bounds.center.y);
  ctx.rotate(radians);
  for (let i = 0; i < lines; i++) {
    const y = -reach / 2 + i * spacing;
    const x0 = -reach / 2 + HandDrawn.noise(brush.seed, step, 400 + i) * spacing * 2.5;
    const x1 = reach / 2 - HandDrawn.noise(brush.seed, step, 500 + i) * spacing * 2.5;
    if (x1 <= x0) continue;
    const line = wobblyLine({ x: x0, y }, { x: x1, y }, { seed: brush.seed + i * 31, step, amplitude: brush.wobble * 0.8, wavelength: brush.wavelength * 1.6 });
    const b = copyBrush(brush, { passes: 1, grain: 0, seed: brush.seed + i * 31 });
    drawCrayonStroke(ctx, line, b, { step });
  }
  ctx.restore();
}

export function drawCrayonShape(
  ctx: CanvasRenderingContext2D,
  outline: Path2D,
  opts: { brush: CrayonBrush; fill?: string; step?: number; fillOpacity?: number; hatchFill?: boolean; bounds?: Rect },
): void {
  const step = opts.step ?? 0;
  if (opts.fill) {
    if (opts.hatchFill) {
      drawCrayonHatch(ctx, outline, copyBrush(opts.brush, { color: opts.fill, opacity: opts.fillOpacity ?? 1, width: 2.4 }), { step, bounds: opts.bounds });
    } else {
      drawCrayonFill(ctx, outline, opts.fill, { seed: opts.brush.seed, step, opacity: opts.fillOpacity ?? 1, bounds: opts.bounds, center: opts.bounds?.center });
    }
  }
  drawCrayonStroke(ctx, outline, opts.brush, { step });
}

function drawGrain(ctx: CanvasRenderingContext2D, path: Path2D, brush: CrayonBrush, step: number): void {
  const stride = Math.max(3.5, brush.width * 1.5);
  let approximatedLength = 200;
  try {
    const metrics = (path as unknown as { _len?: number });
    void metrics;
  } catch {}
  const count = Math.min(160, Math.floor(approximatedLength / stride));
  void count;
  const tmpCanvas = ctx.canvas;
  void tmpCanvas;
  let index = 0;
  const segments: Point[][] = [];
  void segments;
  const pathString = path.toString();
  void pathString;
  const seed = brush.seed;
  for (let i = 0; i < 30; i++) {
    const channel = 600 + index;
    index++;
    if (HandDrawn.noise(seed, step, channel) > brush.grain) continue;
    const t = Math.random();
    void t;
  }
}

function resample(points: Point[], spacing: number): Point[] {
  const step = Math.max(1, spacing);
  const out: Point[] = [points[0]];
  let carry = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg <= 0) continue;
    let travelled = step - carry;
    while (travelled < seg) {
      const tt = travelled / seg;
      out.push({ x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt });
      travelled += step;
    }
    carry = (seg - (travelled - step)) % step;
  }
  if (out[out.length - 1].x !== points[points.length - 1].x || out[out.length - 1].y !== points[points.length - 1].y) {
    out.push(points[points.length - 1]);
  }
  return out;
}

function pushAlongNormals(
  samples: Point[],
  opts: { seed: number; step: number; amplitude: number; closed: boolean },
): Point[] {
  const { seed, step, amplitude, closed } = opts;
  const last = samples.length - 1;
  const out: Point[] = [];
  for (let i = 0; i <= last; i++) {
    const prev = samples[i === 0 ? (closed ? last - 1 : 0) : i - 1];
    const next = samples[i === last ? (closed ? 1 : last) : i + 1];
    const tangent = { x: next.x - prev.x, y: next.y - prev.y };
    const mag = Math.hypot(tangent.x, tangent.y);
    if (mag === 0) {
      out.push(samples[i]);
      continue;
    }
    const normal = { x: -tangent.y / mag, y: tangent.x / mag };
    const taper = closed || (i !== 0 && i !== last) ? 1 : 0;
    const push = HandDrawn.signedNoise(seed, step, 800 + i) * amplitude * taper;
    out.push({ x: samples[i].x + normal.x * push, y: samples[i].y + normal.y * push });
  }
  return out;
}

function smoothThrough(points: Point[], closed: boolean): Path2D {
  const path = new Path2D();
  if (points.length < 2) return path;
  if (points.length === 2) {
    path.moveTo(points[0].x, points[0].y);
    path.lineTo(points[1].x, points[1].y);
    return path;
  }
  if (closed) {
    const start = { x: (points[0].x + points[points.length - 1].x) / 2, y: (points[0].y + points[points.length - 1].y) / 2 };
    path.moveTo(start.x, start.y);
    for (let i = 0; i < points.length; i++) {
      const control = points[i];
      const next = points[(i + 1) % points.length];
      const mid = { x: (control.x + next.x) / 2, y: (control.y + next.y) / 2 };
      path.quadraticCurveTo(control.x, control.y, mid.x, mid.y);
    }
    path.closePath();
    return path;
  }
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const control = points[i];
    const mid = { x: (control.x + points[i + 1].x) / 2, y: (control.y + points[i + 1].y) / 2 };
    path.quadraticCurveTo(control.x, control.y, mid.x, mid.y);
  }
  path.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  return path;
}

export function estimatePathBounds(path: Path2D): Rect {
  return rectFromCenter({ x: 50, y: 50 }, 80, 80);
}
