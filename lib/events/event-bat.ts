"use client";

// Event "Moments" — shared bat painter (canvas). Used by the ambient layer, the
// banner echo, the entrance, the hanging bats and the special-puzzle motif.
// Faithful port of Flutter `event_bat.dart`.

import { type Rgba, rgba, lerp, BLACK } from "./event-colors";

/** Fast down-stroke, slow recovery. `freq` beats per loop. */
export function batFlap(t: number, phase: number, freq: number): number {
  const x = (t * freq + phase) % 1.0;
  const s = Math.sin(x * Math.PI * 2);
  return s >= 0 ? Math.pow(s, 0.7) : -Math.pow(-s, 1.4);
}

/** Builds the bat outline into the current path. Canonical orientation: body
 *  vertical, head up (−y), wings on ±x, spanning ±w. `flap` (−1..1) lifts the
 *  wingtips and bows the membrane. */
export function buildBatPath(ctx: CanvasRenderingContext2D, w: number, flap: number): void {
  const lift = flap * w * 0.42;
  const bow = flap * w * 0.12;
  // Body.
  ctx.moveTo(0, -0.3 * w);
  ctx.bezierCurveTo(0.13 * w, -0.24 * w, 0.13 * w, 0.24 * w, 0, 0.34 * w);
  ctx.bezierCurveTo(-0.13 * w, 0.24 * w, -0.13 * w, -0.24 * w, 0, -0.3 * w);
  ctx.closePath();
  // Ears.
  ctx.moveTo(-0.1 * w, -0.28 * w);
  ctx.lineTo(-0.14 * w, -0.44 * w);
  ctx.lineTo(-0.03 * w, -0.31 * w);
  ctx.closePath();
  ctx.moveTo(0.1 * w, -0.28 * w);
  ctx.lineTo(0.14 * w, -0.44 * w);
  ctx.lineTo(0.03 * w, -0.31 * w);
  ctx.closePath();
  // Right wing.
  ctx.moveTo(0.1 * w, -0.16 * w);
  ctx.quadraticCurveTo(0.55 * w, -0.3 * w - lift, 1.0 * w, -0.24 * w - lift);
  ctx.quadraticCurveTo(0.8 * w, -0.02 * w - bow, 0.72 * w, 0.06 * w - bow * 0.5);
  ctx.quadraticCurveTo(0.62 * w, 0.0, 0.52 * w, 0.12 * w);
  ctx.quadraticCurveTo(0.44 * w, 0.05 * w, 0.34 * w, 0.15 * w);
  ctx.quadraticCurveTo(0.26 * w, 0.08 * w, 0.1 * w, 0.16 * w);
  ctx.closePath();
  // Left wing — x-mirror.
  ctx.moveTo(-0.1 * w, -0.16 * w);
  ctx.quadraticCurveTo(-0.55 * w, -0.3 * w - lift, -1.0 * w, -0.24 * w - lift);
  ctx.quadraticCurveTo(-0.8 * w, -0.02 * w - bow, -0.72 * w, 0.06 * w - bow * 0.5);
  ctx.quadraticCurveTo(-0.62 * w, 0.0, -0.52 * w, 0.12 * w);
  ctx.quadraticCurveTo(-0.44 * w, 0.05 * w, -0.34 * w, 0.15 * w);
  ctx.quadraticCurveTo(-0.26 * w, 0.08 * w, -0.1 * w, 0.16 * w);
  ctx.closePath();
}

interface BatOpts {
  center: { x: number; y: number };
  span: number;
  flap: number;
  rotation?: number;
  color: Rgba;
  alpha?: number;
  glow?: boolean;
}

export function paintBat(ctx: CanvasRenderingContext2D, o: BatOpts): void {
  const { center, span, flap, color } = o;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(o.rotation ?? 0);
  ctx.beginPath();
  buildBatPath(ctx, span, flap);
  if (o.glow) {
    ctx.shadowColor = rgba(color, alpha * 0.35);
    ctx.shadowBlur = span * 0.18;
  }
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
  ctx.restore();
}

interface HangingBatOpts {
  grip: { x: number; y: number };
  size: number;
  sway: number;
  color: Rgba;
  alpha?: number;
}

/** A folded-wing bat roosting from a rim, swaying about the grip point. */
export function paintHangingBat(ctx: CanvasRenderingContext2D, o: HangingBatOpts): void {
  const { grip, size: s, sway, color } = o;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(sway);
  // Feet.
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 0.05 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-0.14 * s, 0.12 * s);
  ctx.moveTo(0, 0); ctx.lineTo(0.14 * s, 0.12 * s);
  ctx.stroke();
  // Cloak body.
  ctx.beginPath();
  ctx.moveTo(0, 0.06 * s);
  ctx.lineTo(-0.3 * s, 0.18 * s);
  ctx.quadraticCurveTo(-0.42 * s, 0.55 * s, -0.16 * s, 0.8 * s);
  ctx.quadraticCurveTo(-0.1 * s, 0.9 * s, 0, 0.84 * s);
  ctx.quadraticCurveTo(0.1 * s, 0.9 * s, 0.16 * s, 0.8 * s);
  ctx.quadraticCurveTo(0.42 * s, 0.55 * s, 0.3 * s, 0.18 * s);
  ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
  // Fold lines.
  ctx.strokeStyle = rgba(lerp(color, BLACK, 0.4), alpha * 0.5);
  ctx.lineWidth = 0.03 * s;
  ctx.beginPath();
  ctx.moveTo(-0.08 * s, 0.2 * s); ctx.lineTo(-0.05 * s, 0.74 * s);
  ctx.moveTo(0.08 * s, 0.2 * s); ctx.lineTo(0.05 * s, 0.74 * s);
  ctx.stroke();
  // Ears (pointing down).
  ctx.beginPath();
  ctx.moveTo(-0.06 * s, 0.8 * s); ctx.lineTo(-0.1 * s, 0.98 * s); ctx.lineTo(-0.01 * s, 0.82 * s); ctx.closePath();
  ctx.moveTo(0.06 * s, 0.8 * s); ctx.lineTo(0.1 * s, 0.98 * s); ctx.lineTo(0.01 * s, 0.82 * s); ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
  ctx.restore();
}
