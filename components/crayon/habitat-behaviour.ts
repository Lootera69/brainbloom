import { HandDrawn } from "./hand-drawn";
import type { Point } from "./hand-drawn";
import {
  type HabitatScene,
  type HabitatPhase,
  type Beat,
  type BeatKind,
  type Waypoint,
  isAwake,
  waypointOf,
  quarryPositionAt,
} from "./habitat-scene";

// --- small math / easing helpers -------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpPt(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
// Approximations of the Flutter Curves used in the original interpreter.
function easeOut(t: number): number {
  const p = clamp(t, 0, 1);
  return 1 - Math.pow(1 - p, 3);
}
function easeIn(t: number): number {
  const p = clamp(t, 0, 1);
  return p * p * p;
}
function easeInOutCubic(t: number): number {
  const p = clamp(t, 0, 1);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

// --- pose --------------------------------------------------------------------

/** The creature's state at one instant. Normalised coordinates, unitless. */
export interface AnimalPose {
  kind: BeatKind;
  beatIndex: number;
  t: number;
  at: Point;
  facing: number;
  scale: number;
  squash: Point;
  rotation: number;
  eyeOpen: number;
  wing: number;
  daydream: number;
}

export const kStillPose: AnimalPose = {
  kind: "idle",
  beatIndex: 0,
  t: 0,
  at: { x: 0.5, y: 0.8 },
  facing: 1,
  scale: 1,
  squash: { x: 1, y: 1 },
  rotation: 0,
  eyeOpen: 1,
  wing: 0,
  daydream: 0,
};

// --- interpreter -------------------------------------------------------------

/**
 * The shared beat interpreter — one behaviour engine for every habitat.
 *
 * A pure function of `(seed, scene, phase, streak, seconds)`: the cursor it
 * keeps is memoisation, not history, and rewinding the clock reproduces the
 * same pose. Ported 1:1 from the Flutter `HabitatBehaviour`.
 */
export class HabitatBehaviour {
  readonly scene: HabitatScene;
  readonly phase: HabitatPhase;
  readonly streak: number;
  readonly seed: number;

  private readonly _eligible: Beat[];
  private readonly _awake: boolean;

  private _cursorIndex = 0;
  private _cursorStart = 0;
  private _cursorWaypoint = "";
  private _cursorPrevWaypoint = "";
  private _clock = 0;

  constructor(opts: { scene: HabitatScene; phase: HabitatPhase; streak: number; seed: number }) {
    this.scene = opts.scene;
    this.phase = opts.phase;
    this.streak = opts.streak;
    this.seed = opts.seed;
    this._eligible = HabitatBehaviour._selectEligible(opts.scene, opts.phase, opts.streak);
    this._awake = isAwake(opts.scene.bias, opts.phase);
  }

  get eligible(): Beat[] {
    return this._eligible;
  }
  get awake(): boolean {
    return this._awake;
  }

  /** The pose at `seconds` since the habitat came on screen. */
  resolve(seconds: number): AnimalPose {
    if (this.scene.waypoints.length === 0 || this._eligible.length === 0) {
      return kStillPose;
    }
    const clock = Math.max(0, seconds);
    this._clock = clock;
    if (clock < this._cursorStart) {
      this._cursorIndex = 0;
      this._cursorStart = 0;
      this._cursorWaypoint = "";
      this._cursorPrevWaypoint = "";
    }
    if (this._cursorWaypoint === "") {
      this._cursorWaypoint = this.scene.waypoints[0].id;
      this._cursorPrevWaypoint = this._cursorWaypoint;
    }

    let guard = 0;
    while (guard++ < 512) {
      const beat = this._beatAt(this._cursorIndex);
      const length = this._lengthOf(beat, this._cursorIndex);
      if (clock < this._cursorStart + length) {
        return this._pose(beat, this._cursorIndex, (clock - this._cursorStart) / length);
      }
      this._cursorStart += length;
      this._cursorIndex++;
      if (beat.kind === "travel") {
        this._cursorPrevWaypoint = this._cursorWaypoint;
        this._cursorWaypoint = this._targetOf(beat, this._cursorIndex - 1).id;
      }
    }
    return this._pose(this._beatAt(this._cursorIndex), this._cursorIndex, 0);
  }

  private _beatAt(index: number): Beat {
    const banTravel = index > 0 && this._peekKind(index - 1) === "travel";
    let total = 0;
    for (const b of this._eligible) {
      if (banTravel && b.kind === "travel") continue;
      total += b.weight ?? 1;
    }
    if (total <= 0) return this._eligible[0];
    let pick = HandDrawn.noise(this.seed, index, 21) * total;
    for (const b of this._eligible) {
      if (banTravel && b.kind === "travel") continue;
      pick -= b.weight ?? 1;
      if (pick <= 0) return b;
    }
    return this._eligible[this._eligible.length - 1];
  }

  private _peekKind(index: number): BeatKind {
    let total = 0;
    for (const b of this._eligible) total += b.weight ?? 1;
    if (total <= 0) return this._eligible[0].kind;
    let pick = HandDrawn.noise(this.seed, index, 21) * total;
    for (const b of this._eligible) {
      pick -= b.weight ?? 1;
      if (pick <= 0) return b.kind;
    }
    return this._eligible[this._eligible.length - 1].kind;
  }

  private _lengthOf(beat: Beat, index: number): number {
    const vary = 0.7 + HandDrawn.noise(this.seed, index, 22) * 0.6;
    return Math.max(0.25, (beat.seconds ?? 2.4) * vary);
  }

  private _targetOf(beat: Beat, index: number): Waypoint {
    if (beat.waypointId != null) return waypointOf(this.scene, beat.waypointId);
    if (this.scene.waypoints.length === 1) return this.scene.waypoints[0];
    const options = this.scene.waypoints.filter((w) => w.id !== this._cursorWaypoint);
    const i = clamp(Math.floor(HandDrawn.noise(this.seed, index, 23) * options.length), 0, options.length - 1);
    return options[i];
  }

  private _pose(beat: Beat, index: number, t: number): AnimalPose {
    const p = clamp(t, 0, 1);
    const here = waypointOf(this.scene, this._cursorWaypoint);
    const baseEye = this._awake ? 1 : 0.06;
    switch (beat.kind) {
      case "idle":
      case "look":
      case "groom":
        return this._grounded(beat, index, p, here, baseEye);
      case "stretch":
        return this._stretch(beat, index, p, here, baseEye);
      case "sleep":
        return this._sleep(beat, index, p, here);
      case "wake":
        return this._grounded(beat, index, p, here, this._awake ? easeOut(p) : baseEye);
      case "call":
        return this._call(beat, index, p, here, baseEye);
      case "bounce":
        return this._bounce(beat, index, p, here, baseEye);
      case "daydream":
        return this._daydream(beat, index, p, here, baseEye);
      case "travel":
        return this._travel(beat, index, p, here);
      case "chase":
        return this._chase(beat, index, p, here);
      default:
        return this._grounded(beat, index, p, here, baseEye);
    }
  }

  private _chase(beat: Beat, index: number, p: number, here: Waypoint): AnimalPose {
    const q = this.scene.quarry;
    if (!q) return this._grounded(beat, index, p, here, this._awake ? 1 : 0.06);
    const prey = quarryPositionAt(q, this._clock, this.seed ^ 0x9e);
    const preyAhead = quarryPositionAt(q, this._clock + 0.05, this.seed ^ 0x9e);
    const vx = preyAhead.x - prey.x;
    const dir = Math.abs(vx) < 1e-4 ? (prey.x >= here.at.x ? 1 : -1) : vx > 0 ? 1 : -1;

    const lunge = p > 0.5 && p < 0.82 ? Math.sin(((p - 0.5) / 0.32) * Math.PI) : 0;
    const gap = 0.13 - lunge * 0.09;
    const trailX = prey.x - dir * gap;
    const band = 0.9;

    let at: Point;
    let facing = dir;
    if (p < 0.16) {
      const b = easeOut(p / 0.16);
      at = lerpPt(here.at, { x: trailX, y: band }, b);
      facing = trailX >= here.at.x ? 1 : -1;
    } else if (p > 0.84) {
      const b = easeIn((p - 0.84) / 0.16);
      at = lerpPt({ x: trailX, y: band }, here.at, b);
      facing = here.at.x >= trailX ? 1 : -1;
    } else {
      at = { x: trailX, y: band };
    }

    const run = Math.sin(this._clock * 13);
    return {
      kind: "chase",
      beatIndex: index,
      t: p,
      at: { x: clamp(at.x, 0.05, 0.95), y: at.y - Math.abs(run) * 0.008 },
      facing,
      scale: here.scale ?? 1,
      squash: { x: 1 + lunge * 0.12 + Math.abs(run) * 0.02, y: 1 - lunge * 0.1 },
      rotation: facing * lunge * 0.05,
      eyeOpen: 1,
      wing: lunge,
      daydream: 0,
    };
  }

  private _grounded(beat: Beat, index: number, p: number, here: Waypoint, eye: number): AnimalPose {
    const breath = Math.sin(p * Math.PI * 2.4);
    const hereFacing = here.facing ?? 1;
    let facing = hereFacing;
    let rotation = 0;
    let squash: Point = { x: 1 - breath * 0.012, y: 1 + breath * 0.018 };

    if (beat.kind === "look") {
      const turn = Math.sin(p * Math.PI);
      facing = hereFacing * (1 - turn * 1.7);
      rotation = turn * 0.05 * hereFacing;
    } else if (beat.kind === "groom") {
      const dip = Math.sin(p * Math.PI * 3);
      rotation = dip * 0.11 * hereFacing;
      squash = { x: 1 + Math.abs(dip) * 0.05, y: 1 - Math.abs(dip) * 0.06 };
    }
    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: here.at,
      facing,
      scale: here.scale ?? 1,
      squash,
      rotation,
      eyeOpen: eye,
      wing: 0,
      daydream: 0,
    };
  }

  private _stretch(beat: Beat, index: number, p: number, here: Waypoint, eye: number): AnimalPose {
    let sx: number;
    let sy: number;
    if (p < 0.2) {
      const a = p / 0.2;
      sx = 1 + a * 0.08;
      sy = 1 - a * 0.1;
    } else {
      const a = HandDrawn.overshoot((p - 0.2) / 0.8, { amount: 2.1 });
      sx = 1.08 - a * 0.14;
      sy = 0.9 + a * 0.16;
    }
    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: here.at,
      facing: here.facing ?? 1,
      scale: here.scale ?? 1,
      squash: { x: sx, y: sy },
      rotation: Math.sin(p * Math.PI) * 0.03,
      eyeOpen: eye * (1 - Math.sin(p * Math.PI) * 0.55),
      wing: clamp(Math.sin(p * Math.PI), 0, 1) * 0.8,
      daydream: 0,
    };
  }

  private _sleep(beat: Beat, index: number, p: number, here: Waypoint): AnimalPose {
    const breath = Math.sin(p * Math.PI * 1.4);
    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: here.at,
      facing: here.facing ?? 1,
      scale: here.scale ?? 1,
      squash: { x: 1 + breath * 0.03, y: 1 - breath * 0.025 },
      rotation: breath * 0.02,
      eyeOpen: 0,
      wing: 0,
      daydream: 0,
    };
  }

  private _call(beat: Beat, index: number, p: number, here: Waypoint, eye: number): AnimalPose {
    const a = p < 0.25 ? p / 0.25 : 0;
    const b = p < 0.25 ? 0 : clamp((p - 0.25) / 0.35, 0, 1);
    const release = Math.sin(b * Math.PI);
    const hereFacing = here.facing ?? 1;
    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: { x: here.at.x, y: here.at.y - release * 0.02 },
      facing: hereFacing,
      scale: here.scale ?? 1,
      squash: { x: 1 + a * 0.06 - release * 0.1, y: 1 - a * 0.07 + release * 0.13 },
      rotation: (-a * 0.06 + release * 0.14) * hereFacing,
      eyeOpen: eye * (1 - release * 0.5),
      wing: release,
      daydream: 0,
    };
  }

  private _bounce(beat: Beat, index: number, p: number, here: Waypoint, eye: number): AnimalPose {
    const hops = 3;
    const phase = p * hops;
    const hop = clamp(Math.floor(phase), 0, hops - 1);
    const local = phase - hop;
    const decay = 1 - (hop / hops) * 0.55;
    const lift = Math.sin(local * Math.PI) * 0.045 * decay;
    const land = Math.cos(local * Math.PI * 2);
    const hereFacing = here.facing ?? 1;
    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: { x: here.at.x, y: here.at.y - lift },
      facing: hereFacing,
      scale: here.scale ?? 1,
      squash: { x: 1 + land * 0.07 * decay, y: 1 - land * 0.08 * decay },
      rotation: Math.sin(local * Math.PI * 2) * 0.04 * hereFacing,
      eyeOpen: eye,
      wing: Math.sin(local * Math.PI) * 0.35,
      daydream: 0,
    };
  }

  private _daydream(beat: Beat, index: number, p: number, here: Waypoint, eye: number): AnimalPose {
    const breath = Math.sin(p * Math.PI * 1.8);
    const visible = p < 0.2 ? easeOut(p / 0.2) : p > 0.8 ? easeIn((1 - p) / 0.2) : 1;
    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: here.at,
      facing: here.facing ?? 1,
      scale: here.scale ?? 1,
      squash: { x: 1 + breath * 0.02, y: 1 - breath * 0.018 },
      rotation: breath * 0.015,
      eyeOpen: eye * 0.35,
      wing: 0,
      daydream: visible,
    };
  }

  private _travel(beat: Beat, index: number, p: number, here: Waypoint): AnimalPose {
    const from = waypointOf(this.scene, this._cursorPrevWaypoint);
    const to = this._targetOf(beat, index);
    const origin = here.id === to.id ? from : here;
    const flying = !!origin.airborne || !!to.airborne;

    const eased = easeInOutCubic(p);
    const base = lerpPt(origin.at, to.at, eased);
    const span = dist(to.at, origin.at);

    const arcHeight = (flying ? 0.16 : 0.075) * (0.4 + span);
    const arc = Math.sin(eased * Math.PI) * arcHeight;

    const dx = to.at.x - origin.at.x;
    const facing = Math.abs(dx) < 0.01 ? origin.facing ?? 1 : dx > 0 ? 1 : -1;

    let sx = 1;
    let sy = 1;
    let wing = 0;
    let rotation = 0;

    if (flying) {
      wing = Math.min(1, 0.55 + Math.sin(eased * Math.PI) * 0.45);
      rotation = -sign(dx) * 0.1 * Math.sin(eased * Math.PI);
      sy = 1 + Math.sin(eased * Math.PI) * 0.05;
      sx = 1 - Math.sin(eased * Math.PI) * 0.03;
    } else {
      const hopPhase = (eased * 2) % 1;
      wing = Math.sin(hopPhase * Math.PI) * 0.3;
      const land = Math.cos(hopPhase * Math.PI * 2);
      sx = 1 + land * 0.08;
      sy = 1 - land * 0.09;
      rotation = Math.sin(hopPhase * Math.PI * 2) * 0.05 * facing;
    }

    return {
      kind: beat.kind,
      beatIndex: index,
      t: p,
      at: { x: base.x, y: base.y - arc },
      facing,
      scale: lerp(origin.scale ?? 1, to.scale ?? 1, eased),
      squash: { x: sx, y: sy },
      rotation,
      eyeOpen: this._awake ? 1 : 0.4,
      wing,
      daydream: 0,
    };
  }

  /** Re-poses `base` as a call, keeping its position and facing (tap-to-call). */
  static asCall(base: AnimalPose, t: number): AnimalPose {
    const p = clamp(t, 0, 1);
    const wind = p < 0.22 ? p / 0.22 : 0;
    const release = Math.sin(clamp((p - 0.22) / 0.4, 0, 1) * Math.PI);
    return {
      kind: "call",
      beatIndex: base.beatIndex,
      t: p,
      at: { x: base.at.x, y: base.at.y - release * 0.022 },
      facing: base.facing,
      scale: base.scale,
      squash: { x: 1 + wind * 0.07 - release * 0.11, y: 1 - wind * 0.08 + release * 0.14 },
      rotation: (-wind * 0.07 + release * 0.15) * sign(base.facing),
      eyeOpen: Math.max(base.eyeOpen, 0.55 + wind * 0.45) * (1 - release * 0.4),
      wing: release,
      daydream: 0,
    };
  }

  private static _selectEligible(scene: HabitatScene, phase: HabitatPhase, streak: number): Beat[] {
    const awake = isAwake(scene.bias, phase);
    const out: Beat[] = [];
    for (const b of scene.beats) {
      if ((b.minStreak ?? 0) > streak) continue;
      if (b.phases && b.phases.length > 0 && !b.phases.includes(phase)) continue;
      const when = b.when ?? "awake";
      const allowed = when === "awake" ? awake : when === "asleep" ? !awake : true;
      if (!allowed) continue;
      if (b.kind === "chase" && !scene.quarry) continue;
      out.push(b);
    }
    if (out.length === 0) {
      out.push({ kind: awake ? "idle" : "sleep", seconds: 4 });
    }
    return out;
  }
}

/** The waypoint the pose is closest to (used to decide the contact shadow). */
export function nearestWaypoint(scene: HabitatScene, at: Point): Waypoint {
  let best = scene.waypoints[0];
  let bestD = Infinity;
  for (const w of scene.waypoints) {
    const dx = w.at.x - at.x;
    const dy = w.at.y - at.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}
