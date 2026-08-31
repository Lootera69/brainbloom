export const HandDrawnRates = {
  prop: 7.0,
  boil: 10.0,
  animal: 12.0,
  smooth: 0.0,
} as const;

const K_MAX_U32 = 0xffffffff;

function mix32(x: number): number {
  x &= K_MAX_U32;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) & K_MAX_U32;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) & K_MAX_U32;
  x ^= x >>> 16;
  return x >>> 0;
}

export class HandDrawn {
  static step(seconds: number, fps: number): number {
    if (fps <= 0) return Math.floor(seconds * 1000);
    return Math.floor(seconds * fps);
  }

  static quantize(seconds: number, fps: number): number {
    if (fps <= 0) return seconds;
    return HandDrawn.step(seconds, fps) / fps;
  }

  static noise(seed: number, step: number, channel = 0): number {
    return mix32((seed * 0x9e3779b1) ^ mix32((step * 0x85ebca77) ^ mix32(channel))) / K_MAX_U32;
  }

  static signedNoise(seed: number, step: number, channel = 0): number {
    return HandDrawn.noise(seed, step, channel) * 2 - 1;
  }

  static seedOf(key: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      hash = mix32((hash ^ key.charCodeAt(i)) >>> 0);
    }
    return hash >>> 0;
  }

  static jitter(
    seed: number,
    step: number,
    opts: { translate?: number; degrees?: number; scale?: number } = {},
  ): HandDrawnJitter {
    const translate = opts.translate ?? 0.6;
    const degrees = opts.degrees ?? 0.9;
    const scale = opts.scale ?? 0.006;
    return new HandDrawnJitter(
      { x: HandDrawn.signedNoise(seed, step, 1) * translate, y: HandDrawn.signedNoise(seed, step, 2) * translate },
      (HandDrawn.signedNoise(seed, step, 3) * degrees * Math.PI) / 180,
      1 + HandDrawn.signedNoise(seed, step, 4) * scale,
    );
  }

  static sway(seconds: number, period: number, opts: { seed?: number } = {}): number {
    const seed = opts.seed ?? 0;
    const phase = HandDrawn.noise(seed, 0, 7) * 2 * Math.PI;
    return Math.sin((seconds / period) * 2 * Math.PI + phase);
  }

  static overshoot(t: number, opts: { amount?: number } = {}): number {
    const amount = opts.amount ?? 1.7;
    const p = Math.min(1, Math.max(0, t)) - 1;
    return p * p * ((amount + 1) * p + amount) + 1;
  }
}

export interface Point { x: number; y: number }

export class HandDrawnJitter {
  static readonly none = new HandDrawnJitter({ x: 0, y: 0 }, 0, 1);

  constructor(
    public readonly offset: Point,
    public readonly radians: number,
    public readonly scale: number,
  ) {}

  apply(ctx: CanvasRenderingContext2D, pivot: Point): void {
    ctx.translate(pivot.x + this.offset.x, pivot.y + this.offset.y);
    if (this.radians !== 0) ctx.rotate(this.radians);
    if (this.scale !== 1) ctx.scale(this.scale, this.scale);
    ctx.translate(-pivot.x, -pivot.y);
  }
}
