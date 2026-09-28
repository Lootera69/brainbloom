// Event "Moments" — colour helpers for the player-facing render layer.
//
// The wire format stores colours as ARGB ints (0xAARRGGBB, Dart
// `Color.toARGB32()` form). The render layer works in {r,g,b,a} space so it can
// mirror Flutter's `Color.lerp(...)` and `.withValues(alpha: …)` exactly.

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number; // 0..1
}

export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

/** Unpack an ARGB int (0xAARRGGBB) into {r,g,b,a} with a in 0..1. */
export function fromArgb(argb: number): Rgba {
  return {
    a: ((argb >>> 24) & 0xff) / 255,
    r: (argb >>> 16) & 0xff,
    g: (argb >>> 8) & 0xff,
    b: argb & 0xff,
  };
}

/** CSS `rgba(...)`. Pass `alpha` to override the colour's own alpha (mirrors
 *  Flutter `color.withValues(alpha: …)`). */
export function rgba(c: Rgba, alpha?: number): string {
  const a = alpha === undefined ? c.a : alpha;
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a.toFixed(3)})`;
}

/** Linear interpolation between two colours (mirrors Flutter `Color.lerp`). */
export function lerp(a: Rgba, b: Rgba, t: number): Rgba {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  };
}

/** A solid Rgba from r,g,b (a = 1) — for hex literals used inside painters. */
export function rgb(r: number, g: number, b: number): Rgba {
  return { r, g, b, a: 1 };
}

/** Rgba from a 0xRRGGBB hex int (a = 1) — mirrors Dart `Color(0xFFrrggbb)`. */
export function hex(rrggbb: number): Rgba {
  return { r: (rrggbb >>> 16) & 0xff, g: (rrggbb >>> 8) & 0xff, b: rrggbb & 0xff, a: 1 };
}
