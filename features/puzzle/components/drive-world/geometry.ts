// Pure road geometry — serpentine node placement and the per-segment cubic
// bezier that threads through every checkpoint. Mirrors `_sampleRoad` /
// `_roadXAtY` / `_roadAngleAtY` from `drive_world.dart`.
import {
  BOTTOM_MARGIN,
  LANE_PATTERN,
  LANE_W_FACTOR,
  NODE_SPACING,
  SAMPLES_PER_SEGMENT,
  TOP_MARGIN,
} from "./constants";

export interface Pt {
  x: number;
  y: number;
}

export function lane(i: number): number {
  return LANE_PATTERN[((i % 8) + 8) % 8];
}

/** World-space centre of node `i` at the given container width. */
export function nodeCenter(i: number, width: number): Pt {
  const laneW = width * LANE_W_FACTOR;
  return { x: width / 2 + lane(i) * laneW, y: TOP_MARGIN + i * NODE_SPACING };
}

export function worldHeight(n: number): number {
  if (n <= 0) return TOP_MARGIN + BOTTOM_MARGIN;
  return TOP_MARGIN + (n - 1) * NODE_SPACING + BOTTOM_MARGIN;
}

/**
 * SVG path through all node centres. Each segment is a cubic bezier whose
 * control points sit on the segment's mid-Y, giving the gentle S-curve.
 * Returns the whole path and, separately, the prefix path up to `goldThrough`
 * (inclusive) for the "completed road is gold" overlay.
 */
export function roadPaths(
  centers: Pt[],
  goldThrough: number,
): { full: string; gold: string } {
  if (centers.length === 0) return { full: "", gold: "" };
  if (centers.length === 1) {
    const p = centers[0];
    const d = `M ${p.x} ${p.y}`;
    return { full: d, gold: goldThrough >= 0 ? d : "" };
  }
  let full = `M ${centers[0].x} ${centers[0].y}`;
  let gold = `M ${centers[0].x} ${centers[0].y}`;
  for (let i = 0; i < centers.length - 1; i++) {
    const p0 = centers[i];
    const p3 = centers[i + 1];
    const midY = (p0.y + p3.y) / 2;
    const seg = ` C ${p0.x} ${midY} ${p3.x} ${midY} ${p3.x} ${p3.y}`;
    full += seg;
    if (i < goldThrough) gold += seg;
  }
  return { full, gold: goldThrough > 0 ? gold : "" };
}

/** Cubic bezier point at parameter t on one segment. */
function cubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * c1.x + w2 * c2.x + w3 * p3.x,
    y: w0 * p0.y + w1 * c1.y + w2 * c2.y + w3 * p3.y,
  };
}

/** Dense, y-sorted samples along the whole road for X-lookups. */
export function sampleRoad(centers: Pt[]): Pt[] {
  if (centers.length === 0) return [];
  if (centers.length === 1) return [centers[0]];
  const pts: Pt[] = [];
  for (let i = 0; i < centers.length - 1; i++) {
    const p0 = centers[i];
    const p3 = centers[i + 1];
    const midY = (p0.y + p3.y) / 2;
    const c1 = { x: p0.x, y: midY };
    const c2 = { x: p3.x, y: midY };
    const start = i === 0 ? 0 : 1;
    for (let s = start; s <= SAMPLES_PER_SEGMENT; s++) {
      pts.push(cubic(p0, c1, c2, p3, s / SAMPLES_PER_SEGMENT));
    }
  }
  return pts;
}

/** Road X at world Y (linear interp over samples; y is monotonic). */
export function roadXAtY(samples: Pt[], y: number): number {
  if (samples.length === 0) return 0;
  if (y <= samples[0].y) return samples[0].x;
  const last = samples[samples.length - 1];
  if (y >= last.y) return last.x;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return last.x;
}

/** Road bank angle (radians) at world Y — for the car's tilt. */
export function roadAngleAtY(samples: Pt[], y: number): number {
  const dx = roadXAtY(samples, y + 14) - roadXAtY(samples, y - 14);
  return Math.atan2(dx, 28);
}
