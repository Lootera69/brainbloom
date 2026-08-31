"use client";

import { useEffect, useRef } from "react";
import { HandDrawn, HandDrawnRates } from "./hand-drawn";
import {
  resolveHabitatPalette,
  propsFor,
  quarryPositionAt,
  type HabitatScene,
  type HabitatPalette,
  type ScenePropSpec,
  type SceneLayer,
  type AmbientKind,
} from "./habitat-scene";
import { habitatSceneFor } from "./habitat-scenes";
import { HabitatBehaviour, nearestWaypoint, type AnimalPose } from "./habitat-behaviour";
import { CrayonPen } from "./crayon-pen";
import { getCrayonSpec } from "./CrayonAvatar";
import { avatarSounds } from "@/services/sound-service";
import {
  paintCrayonHill,
  paintCrayonTree,
  paintCrayonGrassTuft,
  paintCrayonRock,
  paintCrayonPond,
  paintCrayonBamboo,
  paintCrayonCrag,
  paintCrayonRuinPillar,
  paintCrayonFlower,
  paintCrayonCloud,
  paintCrayonCushion,
  paintCrayonLantern,
  paintCrayonKennel,
  paintCrayonBall,
  paintCrayonBranch,
  paintCrayonSun,
  paintCrayonMoon,
  paintCrayonStar,
  paintPaperGrain,
} from "./crayon-shapes";
import {
  rectFromLTRB,
  rectFromCenter,
  rectFromCircle,
  hexToRgba,
  lerpColor,
  wobblyOval,
  wobblyCircle,
  wobblyPolyline,
  wobblyLine,
  drawCrayonFill,
  drawCrayonStroke,
  type CrayonBrush,
  type Point,
} from "./crayon-stroke";

interface HabitatProps {
  avatarId?: string | null;
  streak?: number;
  height?: number;
  className?: string;
}

type MoteShape = "glow" | "dot" | "leaf" | "star";
interface MoteStyle {
  count: number;
  size: number;
  speed: number;
  direction: number;
  sway: number;
  top: number;
  bottom: number;
  opacity: number;
  color: string;
  shape: MoteShape;
  warm?: boolean;
}

const kParallax: Record<SceneLayer, number> = { far: 0.012, mid: 0.038, near: 0.085 };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function Habitat({ avatarId, streak = 0, height = 210, className }: HabitatProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spec = getCrayonSpec(avatarId ?? "owl") ?? getCrayonSpec("owl")!;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = 360;
    const scene: HabitatScene = habitatSceneFor(avatarId);
    const seed = HandDrawn.seedOf(`habitat/${scene.avatarId}`);
    const animalSeed = HandDrawn.seedOf(`crayon/${spec.id}/habitat`);
    const parallax = 0; // the profile card is small; no scroll parallax on web.
    const longCall = (scene.callFx ?? "none") !== "none";
    const callSeconds = longCall ? 3.0 : 1.5;

    let palette: HabitatPalette = resolveHabitatPalette({ biome: scene.biome, now: new Date(), override: scene.lockedPhase });
    let paletteAt = Date.now();
    let behaviour = new HabitatBehaviour({ scene, phase: palette.phase, streak, seed });

    // tap-to-call + natural call sound state
    let callStart: number | null = null;
    let lastSoundedBeat = -1;
    let hasInteracted = false;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.parentElement?.clientWidth || width || 360;
      if (Math.abs(w - width) > 1 || canvas.width !== Math.round(w * dpr)) {
        width = w;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", measure);

    const playSound = () => {
      try {
        avatarSounds[avatarId ?? "owl"]?.();
      } catch {
        /* autoplay may be blocked before a gesture */
      }
    };

    // -- helpers -----------------------------------------------------------

    const rgba = (hex: string, a: number) => hexToRgba(hex, a);
    const hx = (hex: string): [number, number, number] => {
      const h = hex.replace("#", "");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    // Blend two hex colours and return an rgba string with the given alpha.
    const mixA = (a: string, b: string, t: number, alpha: number): string => {
      const [ar, ag, ab] = hx(a);
      const [br, bg, bb] = hx(b);
      const r = Math.round(ar + (br - ar) * t);
      const g = Math.round(ag + (bg - ag) * t);
      const bl = Math.round(ab + (bb - ab) * t);
      return `rgba(${r},${g},${bl},${alpha})`;
    };
    // Blend two hex colours and return a solid #RRGGBB.
    const mixHex = (a: string, b: string, t: number): string => {
      const [ar, ag, ab] = hx(a);
      const [br, bg, bb] = hx(b);
      const to2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
      return `#${to2(ar + (br - ar) * t)}${to2(ag + (bg - ag) * t)}${to2(ab + (bb - ab) * t)}`;
    };

    const brush = (
      color: string,
      opts: { width: number; unit: number; passes?: number; grain?: number; opacity?: number; salt: number },
    ): CrayonBrush => ({
      color,
      width: opts.width * opts.unit,
      passes: opts.passes ?? 1,
      grain: opts.grain ?? 0,
      opacity: opts.opacity ?? 1,
      wobble: opts.unit * 0.3,
      wavelength: opts.unit * 5,
      seed: seed + opts.salt,
    });

    // -- sky / stars / celestial ------------------------------------------

    const paintSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, palette.skyTop);
      grad.addColorStop(0.62, palette.skyBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    };

    const paintStars = (unit: number, seconds: number) => {
      if (palette.starOpacity <= 0.01) return;
      ctx.save();
      ctx.translate(-parallax * width * 0.004, 0);
      for (let i = 0; i < 26; i++) {
        const fx = HandDrawn.noise(seed ^ 0x5a, i, 1);
        const fy = HandDrawn.noise(seed ^ 0x5a, i, 2);
        const y = 0.04 + fy * ((scene.horizon ?? 0.76) - 0.22);
        const twinkle = 0.55 + 0.45 * Math.sin(seconds * (0.8 + fx * 1.4) + i * 2.3);
        paintCrayonStar(ctx, {
          center: { x: fx * width, y: y * height },
          radius: unit * (0.9 + HandDrawn.noise(seed ^ 0x5a, i, 3) * 1.3),
          color: "#FFF6D8",
          seed: seed + 900 + i,
          unit,
          opacity: palette.starOpacity * twinkle,
        });
      }
      ctx.restore();
    };

    const paintCelestial = (unit: number, propStep: number, seconds: number) => {
      const at = {
        x: (scene.celestialAt?.x ?? 0.75) * width - parallax * width * 0.006,
        y: (scene.celestialAt?.y ?? 0.2) * height,
      };
      const radius = unit * 7.5;
      if (palette.phase === "night") {
        paintCrayonMoon(ctx, { center: at, radius, fill: palette.celestial, outline: palette.celestialOutline, seed: seed ^ 0x33, step: propStep, unit });
      } else {
        paintCrayonSun(ctx, { center: at, radius, fill: palette.celestial, outline: palette.celestialOutline, seed: seed ^ 0x34, step: propStep, unit, rayPhase: seconds * 0.06, rays: palette.phase === "day" ? 9 : 7 });
      }
    };

    // -- props -------------------------------------------------------------

    const paintProp = (prop: ScenePropSpec, unit: number, propStep: number, seconds: number) => {
      const b = palette.biome;
      const s = HandDrawn.seedOf(`${seed}/${prop.kind}/${prop.at.x}/${prop.at.y}/${prop.variant ?? 0}`);
      const anchor = { x: prop.at.x * width, y: prop.at.y * height };
      const h = prop.size * unit;
      const w = h * (prop.aspect ?? 1);
      const far = prop.layer === "far";
      const ground = far ? b.groundFar : b.groundNear;
      const leaf = far ? b.foliageFar : b.foliage;
      const opacity = far ? 0.88 : 1;
      switch (prop.kind) {
        case "hill":
          paintCrayonHill(ctx, { area: rectFromLTRB(anchor.x, anchor.y - h, anchor.x + w, anchor.y), fill: ground, outline: b.outline, seed: s, step: propStep, unit, crest: 0.34 + (prop.variant ?? 0) * 0.19, opacity });
          break;
        case "tree":
          paintCrayonTree(ctx, { base: anchor, height: h, trunk: b.trunk, canopy: leaf, outline: b.outline, seed: s, step: propStep, unit, lean: prop.lean ?? 0, canopyBlobs: prop.size < 40 ? 2 : 3, opacity });
          break;
        case "branch":
          paintCrayonBranch(ctx, { from: anchor, to: { x: anchor.x + w, y: anchor.y - (prop.lean ?? 0) * h }, color: b.trunk, seed: s, step: propStep, unit, thickness: 2.4, opacity });
          break;
        case "grassTuft":
          paintCrayonGrassTuft(ctx, { base: anchor, height: h, color: ground, seed: s, step: propStep, unit, blades: 3 + ((prop.variant ?? 0) % 3), opacity });
          break;
        case "rock":
          paintCrayonRock(ctx, { area: rectFromLTRB(anchor.x - w / 2, anchor.y - h, anchor.x + w / 2, anchor.y), fill: b.trunk, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
        case "pond":
          paintCrayonPond(ctx, { area: rectFromLTRB(anchor.x - w / 2, anchor.y - h, anchor.x + w / 2, anchor.y), fill: b.water ?? "#6FA8C4", outline: b.outline, glint: "#EAF6FF", seed: s, step: propStep, unit, ripple: seconds * 0.11, opacity });
          break;
        case "bamboo":
          paintCrayonBamboo(ctx, { base: anchor, height: h, stalk: b.trunk, leaf, outline: b.outline, seed: s, step: propStep, unit, lean: prop.lean ?? 0.06, opacity });
          break;
        case "crag":
          paintCrayonCrag(ctx, { area: rectFromLTRB(anchor.x - w / 2, anchor.y - h, anchor.x + w / 2, anchor.y), fill: ground, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
        case "ruinPillar":
          paintCrayonRuinPillar(ctx, { base: anchor, height: h, width: w * 0.32, fill: ground, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
        case "flower":
          paintCrayonFlower(ctx, { base: anchor, height: h, petal: b.accent, centre: palette.celestial, stem: b.groundNear, seed: s, step: propStep, unit, petals: 5 + ((prop.variant ?? 0) % 2), opacity });
          break;
        case "cloud":
          paintCrayonCloud(ctx, { area: rectFromLTRB(anchor.x, anchor.y, anchor.x + w, anchor.y + h), fill: palette.phase === "night" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)", outline: b.outline, seed: s, step: propStep, unit, opacity: opacity * 0.9, outlineStroke: palette.phase !== "night" });
          break;
        case "cushion":
          paintCrayonCushion(ctx, { area: rectFromLTRB(anchor.x - w / 2, anchor.y - h, anchor.x + w / 2, anchor.y), fill: b.accent, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
        case "lantern":
          paintCrayonLantern(ctx, { top: anchor, size: h * 0.5, glow: mixHex("#FFD98A", palette.celestial, 0.3), body: b.trunk, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
        case "kennel":
          paintCrayonKennel(ctx, { base: anchor, height: h, wall: b.trunk, roof: b.foliage, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
        case "ball":
          paintCrayonBall(ctx, { center: { x: anchor.x, y: anchor.y - h / 2 }, radius: h / 2, fill: b.accent, accent: palette.celestial, outline: b.outline, seed: s, step: propStep, unit, opacity });
          break;
      }
    };

    const paintLayer = (props: ScenePropSpec[], layer: SceneLayer, unit: number, propStep: number, seconds: number) => {
      const shift = -parallax * width * (kParallax[layer] ?? 0);
      ctx.save();
      ctx.translate(shift, 0);
      for (const p of props) if ((p.layer ?? "mid") === layer) paintProp(p, unit, propStep, seconds);
      ctx.restore();
    };

    // -- creature anchor for flourishes -----------------------------------

    const creatureAnchor = (pose: AnimalPose) => {
      const box = height * (scene.animalScale ?? 0.34) * pose.scale;
      const shift = -parallax * width * (kParallax.mid ?? 0);
      const feet = { x: pose.at.x * width + shift, y: pose.at.y * height };
      const centre = { x: feet.x, y: feet.y - box * 0.5 };
      const dir = pose.facing >= 0 ? 1 : -1;
      const mouth = { x: centre.x + dir * box * 0.36, y: centre.y - box * 0.06 };
      return { feet, centre, mouth, box, dir };
    };

    // -- animal ------------------------------------------------------------

    const paintAnimal = (pose: AnimalPose, unit: number, animalStep: number) => {
      const box = height * (scene.animalScale ?? 0.34) * pose.scale;
      if (box <= 0) return;
      const shift = -parallax * width * (kParallax.mid ?? 0);
      const feet = { x: pose.at.x * width + shift, y: pose.at.y * height };

      ctx.save();
      ctx.translate(feet.x, feet.y);

      // Contact shadow (only when grounded), before any distortion.
      if (!nearestWaypoint(scene, pose.at).airborne) {
        ctx.save();
        ctx.fillStyle = rgba(palette.biome.outline, 0.18);
        ctx.beginPath();
        ctx.ellipse(0, -box * 0.01, box * 0.25, box * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (pose.rotation !== 0) ctx.rotate(pose.rotation);
      const facing = Math.abs(pose.facing) < 0.06 ? (pose.facing < 0 ? -0.06 : 0.06) : pose.facing;
      ctx.scale(Math.sign(facing) * pose.squash.x, pose.squash.y);
      ctx.scale(clamp(Math.abs(facing), 0.06, 1), 1);
      ctx.translate(-box / 2, -box);

      const gaze: Point = {
        x: pose.kind === "travel" ? 0.5 : clamp(pose.facing, -1, 1) * 0.2,
        y: pose.eyeOpen < 0.6 ? 0.3 : -0.1,
      };
      const pen = new CrayonPen(ctx, box / 100, animalStep, animalSeed, spec.palette, gaze, pose.eyeOpen, pose.wing);
      spec.draw(pen);
      ctx.restore();

      if (pose.daydream > 0.01) paintDaydream(pose, feet, box, unit, animalStep);
    };

    // -- thought bubble ----------------------------------------------------

    const paintDaydream = (pose: AnimalPose, feet: Point, box: number, unit: number, st: number) => {
      const o = clamp(pose.daydream, 0, 1);
      const origin: Point = { x: feet.x + box * 0.14 * (pose.facing >= 0 ? 1 : -1), y: feet.y - box * (1.06 + o * 0.12) };
      const r = box * 0.2;
      const skin = "#FFFDF4";
      const line = palette.biome.outline;

      for (let i = 0; i < 2; i++) {
        const br = r * (0.16 + i * 0.11);
        const bc: Point = { x: origin.x - r * 0.5 + i * r * 0.34, y: origin.y + r * (1.15 - i * 0.42) };
        const p = wobblyCircle(bc, br, { seed: seed + 611 + i, step: st, amplitude: unit * 0.3, segments: 8 });
        drawCrayonFill(ctx, p, skin, { seed: seed + 621 + i, step: st, slip: unit * 0.2, opacity: o * 0.9, center: bc });
        drawCrayonStroke(ctx, p, brush(line, { width: 1.1, unit, opacity: o * 0.8, salt: 631 + i }), { step: st });
      }

      const bubble = wobblyCircle(origin, r, { seed: seed ^ 0x77, step: st, amplitude: unit * 0.7, segments: 13 });
      drawCrayonFill(ctx, bubble, skin, { seed: seed ^ 0x78, step: st, slip: unit * 0.4, opacity: o * 0.94, center: origin });
      drawCrayonStroke(ctx, bubble, brush(line, { width: 1.4, unit, passes: 2, grain: 0.15, opacity: o * 0.85, salt: 0x79 }), { step: st });

      paintDaydreamIcon(origin, r * 0.62, o, unit, st);
    };

    const paintDaydreamIcon = (c: Point, r: number, opacity: number, unit: number, st: number) => {
      const ink = palette.biome.outline;
      const hot = palette.biome.accent;
      const pen = (salt: number, color?: string, w = 1.5): CrayonBrush => brush(color ?? ink, { width: w, unit, passes: 2, grain: 0.1, opacity, salt: 700 + salt });
      const fill = (p: Path2D, color: string, salt: number) => drawCrayonFill(ctx, p, color, { seed: seed + 740 + salt, step: st, slip: unit * 0.3, opacity, center: c });
      const oval = (rect: ReturnType<typeof rectFromCenter>, salt: number, seg = 10) => wobblyOval(rect, { seed: seed + 760 + salt, step: st, amplitude: unit * 0.5, segments: seg });
      const line = (pts: Point[], salt: number, color?: string, w = 1.5) => drawCrayonStroke(ctx, wobblyPolyline(pts, { seed: seed + 780 + salt, step: st, amplitude: unit * 0.3, wavelength: unit * 5 }), pen(salt, color, w), { step: st });

      switch (scene.daydream) {
        case "mouse": {
          const body = oval(rectFromCenter({ x: c.x + r * 0.1, y: c.y + r * 0.15 }, r * 1.5, r * 1.0), 1);
          fill(body, "#B9AFA6", 1);
          drawCrayonStroke(ctx, body, pen(1), { step: st });
          fill(oval(rectFromCircle({ x: c.x - r * 0.55, y: c.y - r * 0.3 }, r * 0.32), 2, 8), "#D8C6BE", 2);
          line([{ x: c.x + r * 0.8, y: c.y + r * 0.2 }, { x: c.x + r * 1.25, y: c.y - r * 0.15 }, { x: c.x + r * 0.95, y: c.y - r * 0.6 }], 3);
          break;
        }
        case "fish": {
          const body = oval(rectFromCenter({ x: c.x - r * 0.15, y: c.y }, r * 1.5, r * 0.9), 4);
          fill(body, hot, 4);
          drawCrayonStroke(ctx, body, pen(4), { step: st });
          line([{ x: c.x + r * 0.6, y: c.y }, { x: c.x + r * 1.2, y: c.y - r * 0.5 }, { x: c.x + r * 1.2, y: c.y + r * 0.5 }, { x: c.x + r * 0.6, y: c.y }], 5);
          break;
        }
        case "worm":
          line([{ x: c.x - r * 0.9, y: c.y + r * 0.4 }, { x: c.x - r * 0.2, y: c.y - r * 0.4 }, { x: c.x + r * 0.4, y: c.y + r * 0.35 }, { x: c.x + r * 0.9, y: c.y - r * 0.3 }], 6, "#CC7A88", 2.6);
          break;
        case "bone": {
          line([{ x: c.x - r * 0.7, y: c.y + r * 0.35 }, { x: c.x + r * 0.7, y: c.y - r * 0.35 }], 7, undefined, 2.4);
          for (let i = 0; i < 2; i++) {
            const e = i === 0 ? { x: c.x - r * 0.7, y: c.y + r * 0.35 } : { x: c.x + r * 0.7, y: c.y - r * 0.35 };
            fill(oval(rectFromCircle(e, r * 0.28), 8 + i, 8), "#F2ECDF", 8 + i);
          }
          break;
        }
        case "star":
          paintCrayonStar(ctx, { center: c, radius: r * 0.95, color: hot, seed: seed + 811, step: st, unit, opacity });
          break;
        case "heart": {
          const h = new Path2D();
          h.moveTo(c.x, c.y + r * 0.75);
          h.bezierCurveTo(c.x - r * 1.5, c.y - r * 0.25, c.x - r * 0.5, c.y - r * 1.1, c.x, c.y - r * 0.35);
          h.bezierCurveTo(c.x + r * 0.5, c.y - r * 1.1, c.x + r * 1.5, c.y - r * 0.25, c.x, c.y + r * 0.75);
          h.closePath();
          drawCrayonFill(ctx, h, "#E2536B", { seed: seed + 812, step: st, slip: unit * 0.2, opacity, center: c });
          drawCrayonStroke(ctx, h, pen(12), { step: st });
          break;
        }
        case "gem": {
          const g = wobblyPolyline([{ x: c.x, y: c.y - r * 0.85 }, { x: c.x + r * 0.8, y: c.y - r * 0.1 }, { x: c.x, y: c.y + r * 0.85 }, { x: c.x - r * 0.8, y: c.y - r * 0.1 }], { seed: seed + 813, step: st, amplitude: unit * 0.3, wavelength: unit * 5, closed: true });
          fill(g, "#6FD3E8", 13);
          drawCrayonStroke(ctx, g, pen(13), { step: st });
          break;
        }
        case "flame": {
          const f = wobblyPolyline([{ x: c.x, y: c.y + r * 0.8 }, { x: c.x - r * 0.6, y: c.y + r * 0.1 }, { x: c.x - r * 0.15, y: c.y - r * 0.9 }, { x: c.x + r * 0.5, y: c.y }], { seed: seed + 814, step: st, amplitude: unit * 0.4, wavelength: unit * 5, closed: true });
          fill(f, "#F2913A", 14);
          drawCrayonStroke(ctx, f, pen(14), { step: st });
          break;
        }
        case "moon":
          paintCrayonMoon(ctx, { center: c, radius: r * 0.85, fill: "#F6EFD2", outline: ink, seed: seed + 815, step: st, unit });
          break;
        case "crown": {
          const k = wobblyPolyline([{ x: c.x - r * 0.8, y: c.y + r * 0.5 }, { x: c.x - r * 0.8, y: c.y - r * 0.5 }, { x: c.x - r * 0.3, y: c.y }, { x: c.x, y: c.y - r * 0.7 }, { x: c.x + r * 0.3, y: c.y }, { x: c.x + r * 0.8, y: c.y - r * 0.5 }, { x: c.x + r * 0.8, y: c.y + r * 0.5 }], { seed: seed + 816, step: st, amplitude: unit * 0.3, wavelength: unit * 5, closed: true });
          fill(k, "#F2C744", 16);
          drawCrayonStroke(ctx, k, pen(16), { step: st });
          break;
        }
        case "note":
          fill(oval(rectFromCircle({ x: c.x - r * 0.2, y: c.y + r * 0.5 }, r * 0.34), 17, 8), ink, 17);
          line([{ x: c.x + r * 0.14, y: c.y + r * 0.5 }, { x: c.x + r * 0.14, y: c.y - r * 0.75 }, { x: c.x + r * 0.75, y: c.y - r * 0.5 }], 18, undefined, 1.7);
          break;
        case "fly":
          fill(oval(rectFromCenter(c, r * 0.95, r * 0.6), 19, 8), ink, 19);
          for (const s of [-1, 1]) fill(oval(rectFromCenter({ x: c.x + s * r * 0.55, y: c.y - r * 0.35 }, r * 0.7, r * 0.44), 20, 8), "#CDE9F5", 20);
          line([{ x: c.x + r * 0.5, y: c.y - r * 0.1 }, { x: c.x + r * 0.95, y: c.y - r * 0.55 }], 21, undefined, 1.3);
          break;
      }
    };

    // -- call flourishes ---------------------------------------------------

    const flameTongue = (origin: Point, dir: number, length: number, half: number, salt: number, propStep: number): Path2D => {
      const sv = HandDrawn.signedNoise(seed + salt, propStep, 3) * half * 0.3;
      const tip = { x: origin.x + dir * length, y: origin.y + sv };
      const belly = length * 0.45;
      const p = new Path2D();
      p.moveTo(origin.x, origin.y - half * 0.5);
      p.quadraticCurveTo(origin.x + dir * belly, origin.y - half, tip.x, tip.y);
      p.quadraticCurveTo(origin.x + dir * belly, origin.y + half, origin.x, origin.y + half * 0.5);
      p.closePath();
      return p;
    };

    const paintFireBreath = (pose: AnimalPose, unit: number, intensity: number, seconds: number, propStep: number) => {
      const a = creatureAnchor(pose);
      const dir = a.dir;
      const reach = a.box * (0.55 + 1.25 * intensity);
      const origin: Point = { x: a.mouth.x + dir * a.box * 0.04, y: a.mouth.y + a.box * 0.04 };

      ctx.save();
      ctx.fillStyle = rgba("#FF7A1E", 0.28 * intensity);
      ctx.fill(flameTongue(origin, dir, reach * 1.05, a.box * 0.42 * intensity + a.box * 0.08, 0, propStep));
      ctx.restore();

      const layers: [string, number, number][] = [
        ["#D22808", 1.0, 1.0],
        ["#F2761E", 0.82, 0.9],
        ["#FFC24A", 0.6, 0.78],
        ["#FFF3C0", 0.34, 0.6],
      ];
      for (let li = 0; li < layers.length; li++) {
        const [col, lenF, halfF] = layers[li];
        const len = reach * lenF;
        const half = (a.box * 0.34 * intensity + a.box * 0.07) * halfF;
        ctx.fillStyle = rgba(col, 0.7 + 0.3 * intensity);
        ctx.fill(flameTongue(origin, dir, len, half, li, propStep));
      }
      for (let i = 0; i < 5; i++) {
        const u = 0.5 + 0.5 * ((seconds * 1.6 + i / 5) % 1);
        const fx = origin.x + dir * reach * u;
        const fy = origin.y + Math.sin((seconds * 3 + i) * 1.7) * a.box * 0.14 * u;
        const fl = a.box * 0.16 * (1 - u) + a.box * 0.05;
        ctx.fillStyle = rgba("#FFB24A", 0.6 * intensity * (1 - u * 0.5));
        ctx.fill(flameTongue({ x: fx, y: fy }, dir, fl * 2.2, fl, 40 + i, propStep));
      }
      for (let i = 0; i < 12; i++) {
        const u = (seconds * 1.4 + i / 12) % 1;
        const ex = origin.x + dir * reach * u;
        const ey = origin.y + Math.sin((u + i) * 6.28) * a.box * 0.22 * u;
        ctx.fillStyle = mixA("#FFE27A", "#E0501E", u, (1 - u) * intensity);
        ctx.beginPath();
        ctx.arc(ex, ey, unit * (1.6 - u) * (0.6 + intensity * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const paintRebirth = (pose: AnimalPose, unit: number, intensity: number, seconds: number) => {
      const a = creatureAnchor(pose);
      const c = a.centre;
      ctx.save();
      ctx.fillStyle = rgba("#FFF1B0", 0.5 * intensity);
      ctx.beginPath();
      ctx.arc(c.x, c.y, a.box * (0.3 + intensity * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const ringR = a.box * (0.3 + intensity * 0.9);
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * 6.283 + seconds * 0.6;
        const rr = ringR * (0.9 + 0.15 * Math.sin(seconds * 5 + i));
        const p = { x: c.x + Math.cos(ang) * rr, y: c.y + Math.sin(ang) * 0.8 * rr };
        ctx.fillStyle = mixA("#F2761E", "#FFE27A", (i % 3) / 2, 0.7 * intensity);
        ctx.beginPath();
        ctx.arc(p.x, p.y, unit * (1.2 + 1.4 * intensity), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 14; i++) {
        const u = (seconds * 1.1 + i / 14) % 1;
        const ang = (i / 14) * 6.283;
        const p = { x: c.x + Math.cos(ang) * ringR * (0.6 + u), y: c.y + Math.sin(ang) * ringR * (0.6 + u) };
        ctx.fillStyle = rgba("#FFE3A0", (1 - u) * intensity);
        ctx.beginPath();
        ctx.arc(p.x, p.y, unit * (1 - u) * intensity, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const paintGust = (pose: AnimalPose, unit: number, intensity: number, seconds: number, propStep: number) => {
      const a = creatureAnchor(pose);
      const c = a.centre;
      const dir = a.dir;
      for (let i = 0; i < 3; i++) {
        const u = (seconds * 1.4 + i / 3) % 1;
        const r = a.box * (0.4 + u * 0.9);
        ctx.save();
        ctx.strokeStyle = rgba("#EAF2FF", (1 - u) * 0.5 * intensity);
        ctx.lineWidth = unit * 1.4;
        ctx.beginPath();
        ctx.ellipse(c.x + dir * a.box * 0.2, c.y, r, r * 0.7, 0, dir >= 0 ? -0.9 : Math.PI - 0.9, dir >= 0 ? 0.9 : Math.PI + 0.9);
        ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i < 8; i++) {
        const u = (seconds * 1.0 + i / 8) % 1;
        const ang = (-0.6 + (i / 8) * 1.2) * (dir >= 0 ? 1 : -1);
        const p = { x: c.x + Math.cos(ang) * dir * a.box * (0.4 + u), y: c.y + Math.sin(ang) * a.box * (0.4 + u) };
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang + seconds);
        const feather = wobblyOval(rectFromCenter({ x: 0, y: 0 }, unit * 4 * (1 - u), unit * 2), { seed: seed + 480 + i, step: propStep, amplitude: unit * 0.2, segments: 8 });
        drawCrayonFill(ctx, feather, "#EADFC8", { seed: seed + 490 + i, step: propStep, slip: unit * 0.2, opacity: (1 - u) * intensity, center: { x: 0, y: 0 } });
        ctx.restore();
      }
    };

    const paintBeam = (pose: AnimalPose, unit: number, seconds: number) => {
      const intensity = Math.sin(pose.t * Math.PI);
      if (intensity <= 0.02) return;
      const box = height * (scene.animalScale ?? 0.34) * pose.scale;
      const shift = -parallax * width * (kParallax.mid ?? 0);
      const craft = { x: pose.at.x * width + shift, y: pose.at.y * height };
      const topY = craft.y + box * 0.18;
      const groundY = (scene.horizon ?? 0.82) * height + height * 0.06;
      if (groundY <= topY) return;
      const topHalf = box * 0.16;
      const botHalf = box * 0.16 + box * 0.55 * intensity;
      const ray = "#9CEBF6";

      const cone = new Path2D();
      cone.moveTo(craft.x - topHalf, topY);
      cone.lineTo(craft.x + topHalf, topY);
      cone.lineTo(craft.x + botHalf, groundY);
      cone.lineTo(craft.x - botHalf, groundY);
      cone.closePath();

      ctx.save();
      ctx.clip(cone);
      const grad = ctx.createLinearGradient(0, topY, 0, groundY);
      grad.addColorStop(0, rgba(ray, 0.42 * intensity));
      grad.addColorStop(1, rgba(ray, 0.06 * intensity));
      ctx.fillStyle = grad;
      ctx.fillRect(craft.x - botHalf, topY, botHalf * 2, groundY - topY);
      const span = groundY - topY;
      for (let i = 0; i < 4; i++) {
        const phase = (seconds * 0.5 + i / 4) % 1;
        const y = topY + phase * span;
        ctx.fillStyle = rgba(ray, 0.22 * intensity * (1 - phase));
        ctx.fillRect(craft.x - botHalf, y, botHalf * 2, unit * 1.6);
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = rgba(ray, 0.5 * intensity);
      ctx.beginPath();
      ctx.ellipse(craft.x, groundY, botHalf * 1.05, box * 0.07 * intensity + unit, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      paintBeamActor(pose, craft, groundY, box, unit);
    };

    const paintBeamActor = (pose: AnimalPose, craft: Point, groundY: number, box: number, unit: number) => {
      const p = pose.t;
      const h = box * 0.44;
      const craftFeet = craft.y + box * 0.3 + h;
      const standFeet = groundY + unit * 1.5;
      let feetY: number | null = null;
      let ax = craft.x;
      let look = 0;
      const ez = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      if (p >= 0.12 && p < 0.36) {
        feetY = craftFeet + (standFeet - craftFeet) * ez((p - 0.12) / 0.24);
      } else if (p >= 0.36 && p < 0.68) {
        feetY = standFeet;
        const u = (p - 0.36) / 0.32;
        look = Math.sin(u * Math.PI * 2);
        ax += Math.sin(u * Math.PI * 2) * box * 0.14;
      } else if (p >= 0.68 && p < 0.9) {
        feetY = standFeet + (craftFeet - standFeet) * ez((p - 0.68) / 0.22);
      }
      if (feetY == null) return;
      paintAlien({ x: ax, y: feetY }, h, look, unit);
    };

    const paintAlien = (feet: Point, h: number, look: number, unit: number) => {
      const st = HandDrawn.step(0, 0); // constant; alien uses animalStep in mobile but stays stable enough
      const skin = "#8FCB6E";
      const ink = "#2C3646";
      const pen = (salt: number, w = 1.4): CrayonBrush => brush(ink, { width: w, unit, passes: 2, grain: 0.2, salt });
      ctx.save();
      ctx.translate(feet.x, feet.y);
      for (const s of [-1, 1]) {
        drawCrayonStroke(ctx, wobblyLine({ x: s * h * 0.1, y: -h * 0.02 }, { x: s * h * 0.12, y: -h * 0.02 - unit }, { seed: seed + 95, step: st, amplitude: unit * 0.2, wavelength: unit * 4 }), pen(96, 2.0), { step: st });
      }
      const body = wobblyOval(rectFromCenter({ x: 0, y: -h * 0.34 }, h * 0.36, h * 0.52), { seed: seed + 92, step: st, amplitude: unit * 0.3, segments: 11 });
      drawCrayonFill(ctx, body, skin, { seed: seed + 93, step: st, slip: unit * 0.3, center: { x: 0, y: -h * 0.34 } });
      drawCrayonStroke(ctx, body, pen(94), { step: st });
      for (const s of [-1, 1]) {
        drawCrayonStroke(ctx, wobblyLine({ x: s * h * 0.16, y: -h * 0.44 }, { x: s * h * 0.28, y: -h * 0.34 }, { seed: seed + 97, step: st, amplitude: unit * 0.2, wavelength: unit * 4 }), pen(98, 1.6), { step: st });
      }
      const headR = h * 0.3;
      const headC = { x: look * h * 0.06, y: -h * 0.78 };
      const head = wobblyOval(rectFromCenter(headC, headR * 1.9, headR * 2.1), { seed: seed + 90, step: st, amplitude: unit * 0.3, segments: 12 });
      drawCrayonFill(ctx, head, skin, { seed: seed + 91, step: st, slip: unit * 0.3, center: headC });
      drawCrayonStroke(ctx, head, pen(89), { step: st });
      for (const s of [-1, 1]) {
        const e = { x: headC.x + s * headR * 0.42 + look * headR * 0.3, y: headC.y - headR * 0.05 };
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, headR * 0.25, headR * 0.39, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // -- quarry ------------------------------------------------------------

    const paintQuarry = (unit: number, seconds: number, propStep: number, animalStep: number) => {
      const q = scene.quarry;
      if (!q) return;
      const pos = quarryPositionAt(q, seconds, seed ^ 0x9e);
      const ahead = quarryPositionAt(q, seconds + 0.05, seed ^ 0x9e);
      const shift = -parallax * width * (kParallax.near ?? 0);
      const at = { x: pos.x * width + shift, y: pos.y * height };
      const dir = ahead.x - pos.x >= 0 ? 1 : -1;
      const ink = palette.biome.outline;
      if (q.kind === "mouse") {
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.scale(dir, 1);
        const grey = "#9C8F86";
        const body = wobblyOval(rectFromCenter({ x: 0, y: -unit * 1.8 }, unit * 7, unit * 4), { seed: seed + 51, step: propStep, amplitude: unit * 0.4, segments: 10 });
        drawCrayonFill(ctx, body, grey, { seed: seed + 52, step: propStep, slip: unit * 0.2, center: { x: 0, y: -unit * 1.8 } });
        drawCrayonStroke(ctx, body, brush(ink, { width: 1, unit, grain: 0.2, salt: 53 }), { step: propStep });
        const head = wobblyOval(rectFromCenter({ x: unit * 3.2, y: -unit * 2.3 }, unit * 3.4, unit * 3.0), { seed: seed + 54, step: propStep, amplitude: unit * 0.3, segments: 9 });
        drawCrayonFill(ctx, head, grey, { seed: seed + 55, step: propStep, slip: unit * 0.2, center: { x: unit * 3.2, y: -unit * 2.3 } });
        ctx.fillStyle = grey;
        ctx.beginPath();
        ctx.arc(unit * 2.3, -unit * 3.9, unit * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(ink, 1);
        ctx.lineWidth = unit * 0.5;
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(unit * 4.1, -unit * 2.5, unit * 0.55, 0, Math.PI * 2);
        ctx.fill();
        drawCrayonStroke(ctx, wobblyPolyline([{ x: -unit * 3.4, y: -unit * 1.6 }, { x: -unit * 6.4, y: -unit * 0.6 }, { x: -unit * 7.4, y: -unit * 3.0 }], { seed: seed + 57, step: propStep, amplitude: unit * 0.3, wavelength: unit * 4 }), brush(ink, { width: 0.7, unit, salt: 58 }), { step: propStep });
        ctx.restore();
      } else if (q.kind === "butterfly") {
        const wingCol = palette.biome.accent;
        const flap = Math.sin(seconds * 9) * 0.4 + 0.7;
        for (const s of [-1, 1]) {
          const w = wobblyOval(rectFromCenter({ x: at.x + s * unit * 2.2 * flap, y: at.y }, unit * 4.2 * flap, unit * 4.6), { seed: seed + (s < 0 ? 71 : 72), step: animalStep, amplitude: unit * 0.3, segments: 9 });
          drawCrayonFill(ctx, w, wingCol, { seed: seed + 73, step: animalStep, slip: unit * 0.2, center: { x: at.x + s * unit * 2.2 * flap, y: at.y } });
          drawCrayonStroke(ctx, w, brush(ink, { width: 0.7, unit, salt: 74 }), { step: animalStep });
        }
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(at.x, at.y, unit * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // insect: bug -> ant -> grasshopper cycling
        const variant = Math.floor(seconds / 7) % 3;
        if (variant === 0) paintBug(at, unit, dir, propStep);
        else if (variant === 1) paintAnt(at, unit, dir, propStep);
        else paintGrasshopper(at, unit, dir, propStep);
      }
    };

    const paintBug = (c: Point, unit: number, dir: number, st: number) => {
      const body = "#7A4A22";
      const ink = palette.biome.outline;
      for (const i of [-1, 0, 1]) {
        for (const s of [-1, 1]) {
          drawCrayonStroke(ctx, wobblyLine({ x: c.x + i * unit * 1.4, y: c.y + unit * 0.6 }, { x: c.x + i * unit * 1.4 + s * unit * 2.0, y: c.y + unit * 2.4 }, { seed: seed + 140 + i * 3 + (s < 0 ? 0 : 1), step: st, amplitude: unit * 0.2, wavelength: unit * 3 }), brush(ink, { width: 0.5, unit, salt: 141 }), { step: st });
        }
      }
      const shell = wobblyOval(rectFromCenter(c, unit * 5.2, unit * 4.2), { seed: seed + 145, step: st, amplitude: unit * 0.3, segments: 11 });
      drawCrayonFill(ctx, shell, body, { seed: seed + 146, step: st, slip: unit * 0.2, center: c });
      drawCrayonStroke(ctx, shell, brush(ink, { width: 0.9, unit, grain: 0.2, salt: 147 }), { step: st });
      drawCrayonStroke(ctx, wobblyLine({ x: c.x, y: c.y - unit * 1.9 }, { x: c.x, y: c.y + unit * 1.9 }, { seed: seed + 148, step: st, amplitude: unit * 0.15, wavelength: unit * 4 }), brush(ink, { width: 0.6, unit, salt: 149 }), { step: st });
      for (const s of [-1, 1]) {
        drawCrayonStroke(ctx, wobblyLine({ x: c.x + dir * unit * 2.2, y: c.y - unit * 1.0 }, { x: c.x + dir * unit * 3.8, y: c.y - unit * 2.4 + s * unit * 0.6 }, { seed: seed + 150 + (s < 0 ? 0 : 1), step: st, amplitude: unit * 0.2, wavelength: unit * 3 }), brush(ink, { width: 0.45, unit, salt: 151 }), { step: st });
      }
    };

    const paintAnt = (c: Point, unit: number, dir: number, st: number) => {
      const body = "#3A2018";
      const ink = palette.biome.outline;
      for (const i of [-1, 0, 1]) {
        for (const s of [-1, 1]) {
          drawCrayonStroke(ctx, wobblyLine({ x: c.x + i * unit * 1.6, y: c.y + unit * 0.4 }, { x: c.x + i * unit * 1.6 + s * unit * 1.8, y: c.y + unit * 2.2 }, { seed: seed + 160 + i * 3 + (s < 0 ? 0 : 1), step: st, amplitude: unit * 0.2, wavelength: unit * 3 }), brush(ink, { width: 0.5, unit, salt: 161 }), { step: st });
        }
      }
      const segX = [-2.6, 0.0, 3.0];
      const segR = [1.4, 1.7, 2.2];
      for (let i = 0; i < 3; i++) {
        const sc2 = { x: c.x + dir * segX[i] * unit, y: c.y };
        const segp = wobblyOval(rectFromCenter(sc2, segR[i] * 2 * unit, segR[i] * 1.8 * unit), { seed: seed + 165 + i, step: st, amplitude: unit * 0.2, segments: 9 });
        drawCrayonFill(ctx, segp, body, { seed: seed + 168 + i, step: st, slip: unit * 0.15, center: sc2 });
        drawCrayonStroke(ctx, segp, brush(ink, { width: 0.7, unit, grain: 0.1, salt: 171 + i }), { step: st });
      }
      for (const s of [-1, 1]) {
        drawCrayonStroke(ctx, wobblyLine({ x: c.x + dir * unit * 4.4, y: c.y - unit * 0.8 }, { x: c.x + dir * unit * 6.2, y: c.y - unit * 2.4 + s * unit * 0.5 }, { seed: seed + 175 + (s < 0 ? 0 : 1), step: st, amplitude: unit * 0.2, wavelength: unit * 3 }), brush(ink, { width: 0.4, unit, salt: 176 }), { step: st });
      }
    };

    const paintGrasshopper = (c: Point, unit: number, dir: number, st: number) => {
      const body = "#5E8A2E";
      const ink = palette.biome.outline;
      for (const i of [0, 1]) {
        drawCrayonStroke(ctx, wobblyLine({ x: c.x + dir * unit * (0.5 + i * 1.4), y: c.y + unit * 0.6 }, { x: c.x + dir * unit * (0.2 + i * 1.4), y: c.y + unit * 2.4 }, { seed: seed + 180 + i, step: st, amplitude: unit * 0.2, wavelength: unit * 3 }), brush(ink, { width: 0.5, unit, salt: 181 }), { step: st });
      }
      const bodyPath = wobblyOval(rectFromCenter(c, unit * 7.0, unit * 3.0), { seed: seed + 185, step: st, amplitude: unit * 0.3, segments: 11 });
      drawCrayonFill(ctx, bodyPath, body, { seed: seed + 186, step: st, slip: unit * 0.2, center: c });
      drawCrayonStroke(ctx, bodyPath, brush(ink, { width: 0.8, unit, grain: 0.1, salt: 187 }), { step: st });
      const hip = { x: c.x - dir * unit * 2.4, y: c.y + unit * 0.2 };
      const knee = { x: c.x - dir * unit * 3.6, y: c.y - unit * 2.6 };
      const foot = { x: c.x - dir * unit * 1.6, y: c.y + unit * 2.6 };
      drawCrayonStroke(ctx, wobblyPolyline([hip, knee, foot], { seed: seed + 190, step: st, amplitude: unit * 0.25, wavelength: unit * 4 }), brush(body, { width: 1.6, unit, grain: 0.1, salt: 191 }), { step: st });
      drawCrayonStroke(ctx, wobblyPolyline([hip, knee, foot], { seed: seed + 192, step: st, amplitude: unit * 0.25, wavelength: unit * 4 }), brush(ink, { width: 0.6, unit, salt: 193 }), { step: st });
      for (const s of [-1, 1]) {
        drawCrayonStroke(ctx, wobblyLine({ x: c.x + dir * unit * 3.2, y: c.y - unit * 0.6 }, { x: c.x + dir * unit * 5.6, y: c.y - unit * 2.2 + s * unit * 0.6 }, { seed: seed + 195 + (s < 0 ? 0 : 1), step: st, amplitude: unit * 0.2, wavelength: unit * 3 }), brush(ink, { width: 0.4, unit, salt: 196 }), { step: st });
      }
    };

    // -- ambient motes -----------------------------------------------------

    const moteStyle = (kind: AmbientKind): MoteStyle | null => {
      switch (kind) {
        case "none":
          return null;
        case "fireflies":
          if (palette.starOpacity < 0.2) return null;
          return { count: 14, size: 0.9, speed: 0.035, direction: -1, sway: 0.05, top: 0.42, bottom: (scene.horizon ?? 0.76) + 0.14, opacity: 0.95 * palette.starOpacity, color: "#D8F58A", shape: "glow" };
        case "leaves":
          return { count: 10, size: 1.5, speed: 0.045, direction: 1, sway: 0.07, top: 0.18, bottom: 1.02, opacity: 0.85, color: palette.biome.foliage, shape: "leaf" };
        case "petals":
          return { count: 14, size: 1.1, speed: 0.05, direction: 1, sway: 0.09, top: 0.12, bottom: 1.02, opacity: 0.9, color: "#F6B6C8", shape: "leaf" };
        case "embers":
          return { count: 20, size: 0.8, speed: 0.09, direction: -1, sway: 0.04, top: 0.1, bottom: 1.0, opacity: 1.0, color: "#FF9A3C", shape: "glow", warm: true };
        case "snow":
          return { count: 26, size: 0.7, speed: 0.06, direction: 1, sway: 0.05, top: -0.02, bottom: 1.02, opacity: 0.9, color: "#F6FBFF", shape: "dot" };
        case "dust":
          return { count: 18, size: 0.55, speed: 0.02, direction: -1, sway: 0.06, top: 0.3, bottom: 0.98, opacity: 0.55, color: "#FFF3D0", shape: "dot" };
        case "bubbles":
          return { count: 16, size: 1.0, speed: 0.07, direction: -1, sway: 0.035, top: 0.06, bottom: 1.0, opacity: 0.7, color: "#DFF6FF", shape: "dot" };
        case "sparkles":
          return { count: 12, size: 1.0, speed: 0.03, direction: -1, sway: 0.06, top: 0.15, bottom: 0.95, opacity: 0.95, color: "#FFF0A8", shape: "star" };
        case "feathers":
          return { count: 8, size: 1.4, speed: 0.03, direction: 1, sway: 0.1, top: 0.2, bottom: 1.02, opacity: 0.8, color: "#F0E2D2", shape: "leaf" };
        case "sparks":
          return { count: 24, size: 0.8, speed: 0.11, direction: -1, sway: 0.05, top: 0.08, bottom: 1.0, opacity: 1.0, color: "#FFD26A", shape: "glow", warm: true };
        default:
          return null;
      }
    };

    const paintAmbient = (unit: number, seconds: number, propStep: number, animalStep: number) => {
      const style = moteStyle(scene.ambient ?? "none");
      if (!style) return;
      const count = clamp(Math.round(style.count * (scene.ambientDensity ?? 1)), 0, 60);
      for (let i = 0; i < count; i++) {
        const lane = HandDrawn.noise(seed ^ 0x2c, i, 1);
        const depth = HandDrawn.noise(seed ^ 0x2c, i, 2);
        const speed = style.speed * (0.55 + depth * 0.9);
        const phase = HandDrawn.noise(seed ^ 0x2c, i, 3);
        let v = (phase + seconds * speed * style.direction) % 1;
        if (v < 0) v += 1;
        const y = style.top + v * (style.bottom - style.top);
        const sway = Math.sin(seconds * (0.3 + depth * 0.5) + i * 1.7) * style.sway;
        const x = (((lane + sway) % 1) + 1) % 1;
        const edge = Math.min(v, 1 - v);
        const alpha = style.opacity * clamp(edge / 0.18, 0, 1) * (0.55 + depth * 0.45);
        if (alpha <= 0.02) continue;
        const at = { x: x * width, y: y * height };
        const r = unit * style.size * (0.6 + depth * 0.8);
        const tint = style.warm && palette.lightWarmth < 0 ? lerpColor(style.color, palette.celestial, 0.35) : style.color;
        switch (style.shape) {
          case "glow": {
            const pulse = Math.sin(seconds * 2.2 + i * 2.9) * 0.5 + 0.5;
            const a = alpha * (0.15 + pulse * 0.85);
            ctx.fillStyle = rgba(tint, a * 0.22);
            ctx.beginPath();
            ctx.arc(at.x, at.y, r * 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(tint, a);
            ctx.beginPath();
            ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "dot":
            ctx.fillStyle = rgba(tint, alpha);
            ctx.beginPath();
            ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "leaf": {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(at.x, at.y);
            ctx.rotate(seconds * (0.6 + depth) + i);
            const leaf = wobblyOval(rectFromCenter({ x: 0, y: 0 }, r * 2.6, r * 1.3), { seed: seed + 400 + i, step: propStep, amplitude: unit * 0.3, segments: 8 });
            drawCrayonFill(ctx, leaf, tint, { seed: seed + 420 + i, step: propStep, slip: unit * 0.2, center: { x: 0, y: 0 } });
            ctx.restore();
            break;
          }
          case "star":
            paintCrayonStar(ctx, { center: at, radius: r * 1.6, color: tint, seed: seed + 440 + i, step: animalStep, unit, opacity: alpha });
            break;
        }
      }
    };

    // -- frame -------------------------------------------------------------

    const draw = (propStep: number, animalStep: number, seconds: number) => {
      if (Date.now() - paletteAt > 60000) {
        paletteAt = Date.now();
        const next = resolveHabitatPalette({ biome: scene.biome, now: new Date(), override: scene.lockedPhase });
        if (next.phase !== palette.phase) {
          palette = next;
          behaviour = new HabitatBehaviour({ scene, phase: palette.phase, streak, seed });
        } else {
          palette = next;
        }
      }

      const unit = height / 100;
      const bounds = { left: 0, top: 0, right: width, bottom: height, width, height, center: { x: width / 2, y: height / 2 } };
      ctx.clearRect(0, 0, width, height);

      // resolve pose (with tap-call override)
      let pose = behaviour.resolve(seconds);
      if (callStart != null) {
        if (seconds - callStart < callSeconds) {
          pose = HabitatBehaviour.asCall(pose, clamp((seconds - callStart) / callSeconds, 0, 1));
        } else {
          callStart = null;
        }
      }
      // natural call sound, once per call beat, only after a first gesture
      if (hasInteracted && pose.kind === "call" && pose.beatIndex !== lastSoundedBeat) {
        lastSoundedBeat = pose.beatIndex;
        playSound();
      }

      paintSky();
      paintStars(unit, seconds);
      paintCelestial(unit, propStep, seconds);

      const props = propsFor(scene, streak);
      paintLayer(props, "far", unit, propStep, seconds);
      paintLayer(props, "mid", unit, propStep, seconds);

      if (pose.kind === "call" && scene.callFx === "beam") paintBeam(pose, unit, seconds);

      paintAnimal(pose, unit, animalStep);

      if (pose.kind === "call" && scene.callFx && scene.callFx !== "none" && scene.callFx !== "beam") {
        const intensity = Math.sin(pose.t * Math.PI);
        if (intensity > 0.02) {
          if (scene.callFx === "fire") paintFireBreath(pose, unit, intensity, seconds, propStep);
          else if (scene.callFx === "rebirth") paintRebirth(pose, unit, intensity, seconds);
          else if (scene.callFx === "gust") paintGust(pose, unit, intensity, seconds, propStep);
        }
      }

      paintQuarry(unit, seconds, propStep, animalStep);
      paintLayer(props, "near", unit, propStep, seconds);
      paintAmbient(unit, seconds, propStep, animalStep);

      paintPaperGrain(ctx, { area: bounds, color: palette.paper, seed: seed ^ 0xbeef, density: 3.0, rampStart: 0.12 });
    };

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const propStep = HandDrawn.step(elapsed, HandDrawnRates.prop);
      const animalStep = HandDrawn.step(elapsed, HandDrawnRates.animal);
      draw(propStep, animalStep, elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    draw(0, 0, 0);

    const onTap = () => {
      hasInteracted = true;
      const nowSec = (performance.now() - start) / 1000;
      callStart = nowSec;
      playSound();
    };
    canvas.addEventListener("click", onTap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      canvas.removeEventListener("click", onTap);
    };
  }, [avatarId, streak, height, spec]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height, display: "block", borderRadius: 24, overflow: "hidden" }} />;
}
