import { HandDrawn } from "./hand-drawn";
import {
  CrayonBrush,
  Rect,
  Point,
  wobblyOval,
  wobblyPolyline,
  wobblyCircle,
  wobblyLine,
  drawCrayonStroke,
  drawCrayonFill,
  drawCrayonHatch,
  rectFromLTRB,
} from "./crayon-stroke";
import { hexToRgba } from "./crayon-stroke";

export interface CrayonPalette {
  body: string;
  belly: string;
  outline: string;
  accent: string;
  eyeWhite: string;
  pupil: string;
}

export interface CrayonAvatarSpec {
  id: string;
  name: string;
  palette: CrayonPalette;
  draw: (pen: CrayonPen) => void;
}

export class CrayonPen {
  constructor(
    public ctx: CanvasRenderingContext2D,
    public unit: number,
    public step: number,
    public seed: number,
    public palette: CrayonPalette,
    public gaze: Point = { x: 0, y: 0 },
    public eyeOpen: number = 1,
    public limb: number = 0,
  ) {}

  s(v: number): number {
    return v * this.unit;
  }
  o(p: Point): Point {
    return { x: p.x * this.unit, y: p.y * this.unit };
  }
  r(rect: Rect): Rect {
    return {
      left: rect.left * this.unit,
      top: rect.top * this.unit,
      right: rect.right * this.unit,
      bottom: rect.bottom * this.unit,
      width: rect.width * this.unit,
      height: rect.height * this.unit,
      center: { x: rect.center.x * this.unit, y: rect.center.y * this.unit },
    };
  }
  channel(key: string): number {
    return HandDrawn.seedOf(`${this.seed}/${key}`);
  }
  ink(
    key: string,
    opts: { color?: string; width?: number; grain?: number; passes?: number } = {},
  ): CrayonBrush {
    return {
      color: opts.color ?? this.palette.outline,
      width: this.s(opts.width ?? 2.8),
      passes: opts.passes ?? 3,
      grain: opts.grain ?? 0.45,
      opacity: 1,
      wobble: this.s(1.3),
      wavelength: this.s(11),
      seed: this.channel(key),
    };
  }

  blob(
    design: Rect,
    opts: {
      key: string;
      fill?: string;
      amplitude?: number;
      segments?: number;
      width?: number;
      hatchDegrees?: number;
      hatch?: boolean;
      retrace?: boolean;
      outline?: string;
    },
  ): void {
    const amplitude = opts.amplitude ?? 2.0;
    const segments = opts.segments ?? 20;
    const width = opts.width ?? 2.8;
    const hatchDegrees = opts.hatchDegrees ?? -62;
    const hatch = opts.hatch ?? true;
    const retrace = opts.retrace ?? false;
    const fill = opts.fill;
    const key = opts.key;
    const outline = opts.outline;
    const pixelRect = this.r(design);
    const path = wobblyOval(pixelRect, { seed: this.channel(`${key}.edge`), step: this.step, amplitude: this.s(amplitude), segments });
    if (fill) this._colourIn(path, { key, fill, degrees: hatchDegrees, hatch, bounds: pixelRect, center: pixelRect.center });
    drawCrayonStroke(this.ctx, path, this.ink(`${key}.ink`, { color: outline, width }), { step: this.step });
    if (retrace) {
      const rtPath = wobblyOval(pixelRect, { seed: this.channel(`${key}.retrace`), step: this.step, amplitude: this.s(amplitude * 0.8), segments });
      const rtBrush: CrayonBrush = {
        color: outline ?? this.palette.outline,
        width: this.s(width * 0.7),
        passes: 2,
        grain: 0.3,
        opacity: 0.6,
        wobble: this.s(1.3),
        wavelength: this.s(11),
        seed: this.channel(`${key}.retraceink`),
      };
      drawCrayonStroke(this.ctx, rtPath, rtBrush, { step: this.step });
    }
  }

  poly(
    points: Point[],
    opts: {
      key: string;
      fill?: string;
      closed?: boolean;
      amplitude?: number;
      width?: number;
      hatchDegrees?: number;
      hatch?: boolean;
      outline?: string;
    },
  ): void {
    const closed = opts.closed ?? true;
    const amplitude = opts.amplitude ?? 1.2;
    const width = opts.width ?? 2.4;
    const hatchDegrees = opts.hatchDegrees ?? -62;
    const hatch = opts.hatch ?? false;
    const fill = opts.fill;
    const key = opts.key;
    const outline = opts.outline;
    const pixelPoints = points.map((p) => this.o(p));
    const path = wobblyPolyline(pixelPoints, { seed: this.channel(`${key}.edge`), step: this.step, amplitude: this.s(amplitude), wavelength: this.s(9), closed });
    if (fill && closed) {
      const bounds = polyBounds(pixelPoints);
      const center = polyCenter(pixelPoints);
      this._colourIn(path, { key, fill, degrees: hatchDegrees, hatch, bounds, center });
    }
    drawCrayonStroke(this.ctx, path, this.ink(`${key}.ink`, { color: outline, width }), { step: this.step });
  }

  stroke(
    points: Point[],
    opts: { key: string; color?: string; width?: number; amplitude?: number; grain?: number },
  ): void {
    const key = opts.key;
    const color = opts.color;
    const width = opts.width ?? 2.4;
    const amplitude = opts.amplitude ?? 1.1;
    const grain = opts.grain ?? 0.35;
    const pixelPoints = points.map((p) => this.o(p));
    const path = wobblyPolyline(pixelPoints, { seed: this.channel(`${key}.edge`), step: this.step, amplitude: this.s(amplitude), wavelength: this.s(9) });
    drawCrayonStroke(this.ctx, path, this.ink(`${key}.ink`, { color, width, grain }), { step: this.step });
  }

  eye(center: Point, radius: number, opts: { key: string; pupil?: number; width?: number; pupilAspect?: number }): void {
    const key = opts.key;
    const pupilRatio = opts.pupil ?? 0.42;
    const width = opts.width ?? 2.0;
    const pupilAspect = opts.pupilAspect ?? 1.0;
    const c = this.o(center);
    const r = this.s(radius);
    const white = wobblyCircle(c, r, { seed: this.channel(`${key}.white`), step: this.step, amplitude: this.s(0.9), segments: 14 });
    const whiteCenter = c;
    const whiteBounds = rectFromLTRB(c.x - r, c.y - r, c.x + r, c.y + r);
    drawCrayonFill(this.ctx, white, this.palette.eyeWhite, { seed: this.channel(`${key}.whitefill`), step: this.step, slip: this.s(0.7), bounds: whiteBounds, center: whiteCenter });
    drawCrayonStroke(this.ctx, white, this.ink(`${key}.whiteink`, { width }), { step: this.step });
    const open = Math.max(0, Math.min(1, this.eyeOpen));
    if (open > 0.04) {
      const pupilRadius = r * pupilRatio;
      const pc = { x: c.x + this.gaze.x * (r - pupilRadius) * 0.7, y: c.y + this.gaze.y * (r - pupilRadius) * 0.7 };
      let iris: Path2D;
      let irisCenter = pc;
      let irisBounds: Rect;
      if (pupilAspect === 1) {
        iris = wobblyCircle(pc, pupilRadius, { seed: this.channel(`${key}.pupil`), step: this.step, amplitude: this.s(0.45), segments: 12 });
        irisBounds = rectFromLTRB(pc.x - pupilRadius, pc.y - pupilRadius, pc.x + pupilRadius, pc.y + pupilRadius);
      } else {
        const rect = rectFromLTRB(pc.x - pupilRadius * pupilAspect, pc.y - pupilRadius, pc.x + pupilRadius * pupilAspect, pc.y + pupilRadius);
        iris = wobblyOval(rect, { seed: this.channel(`${key}.pupil`), step: this.step, amplitude: this.s(0.35), segments: 12 });
        irisBounds = rect;
        irisCenter = pc;
      }
      drawCrayonFill(this.ctx, iris, this.palette.pupil, { seed: this.channel(`${key}.pupilfill`), step: this.step, slip: this.s(0.35), bounds: irisBounds, center: irisCenter });
      const pupilBrush: CrayonBrush = { color: this.palette.pupil, width: this.s(1.5), passes: 3, grain: 0.2, opacity: 1, wobble: this.s(1.3), wavelength: this.s(11), seed: this.channel(`${key}.pupilink`) };
      drawCrayonStroke(this.ctx, iris, pupilBrush, { step: this.step });
      this.ctx.beginPath();
      this.ctx.fillStyle = "rgba(255,255,255,0.9)";
      this.ctx.arc(pc.x - pupilRadius * 0.34, pc.y - pupilRadius * 0.38, pupilRadius * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    if (open < 0.995) {
      const lidY = c.y - r + 2 * r * (1 - open);
      this.ctx.save();
      this.ctx.clip(white);
      const lidPath = wobblyPolyline(
        [
          { x: c.x - r * 1.3, y: c.y - r * 1.4 },
          { x: c.x + r * 1.3, y: c.y - r * 1.4 },
          { x: c.x + r * 1.3, y: lidY },
          { x: c.x - r * 1.3, y: lidY },
        ],
        { seed: this.channel(`${key}.lid`), step: this.step, amplitude: this.s(0.5), wavelength: this.s(7), closed: true },
      );
      const lidBounds = rectFromLTRB(c.x - r * 1.3, c.y - r * 1.4, c.x + r * 1.3, lidY);
      drawCrayonFill(this.ctx, lidPath, this.palette.body, { seed: this.channel(`${key}.lidfill`), step: this.step, slip: this.s(0.3), bounds: lidBounds, center: { x: c.x, y: (c.y - r * 1.4 + lidY) / 2 } });
      this.ctx.restore();
      const lashLine = wobblyLine({ x: c.x - r * 0.95, y: lidY }, { x: c.x + r * 0.95, y: lidY }, { seed: this.channel(`${key}.lash`), step: this.step, amplitude: this.s(0.4), wavelength: this.s(6) });
      drawCrayonStroke(this.ctx, lashLine, this.ink(`${key}.lashink`, { width: width * 1.1, grain: 0.2, passes: 2 }), { step: this.step });
    }
  }

  private _colourIn(
    outline: Path2D,
    opts: { key: string; fill: string; degrees: number; hatch: boolean; bounds: Rect; center: Point },
  ): void {
    const hatch = opts.hatch;
    drawCrayonFill(this.ctx, outline, opts.fill, { seed: this.channel(`${opts.key}.fill`), step: this.step, slip: this.s(1.5), opacity: hatch ? 0.66 : 1, bounds: opts.bounds, center: opts.center });
    if (!hatch) return;
    for (let pass = 0; pass < 2; pass++) {
      const brush: CrayonBrush = {
        color: opts.fill,
        width: this.s(3.0),
        passes: 1,
        grain: 0,
        opacity: 1,
        wobble: this.s(1.2),
        wavelength: this.s(12),
        seed: this.channel(`${opts.key}.hatch${pass}`),
      };
      drawCrayonHatch(this.ctx, outline, brush, { step: this.step, spacing: this.s(6.4), degrees: opts.degrees + pass * 11, maxLines: 40, bounds: opts.bounds });
    }
  }
}

function polyBounds(points: Point[]): Rect {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const p of points) { l = Math.min(l, p.x); t = Math.min(t, p.y); r = Math.max(r, p.x); b = Math.max(b, p.y); }
  return rectFromLTRB(l, t, r, b);
}
function polyCenter(points: Point[]): Point {
  const b = polyBounds(points);
  return b.center;
}
