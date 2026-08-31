import { HandDrawn } from "./hand-drawn";
import { lerpColor } from "./crayon-stroke";

export type HabitatPhase = "dawn" | "day" | "dusk" | "night";
export type TimeBias = "diurnal" | "nocturnal" | "crepuscular" | "tireless";

export function resolvePhase(now: Date): HabitatPhase {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 5) return "night";
  if (h < 7.5) return "dawn";
  if (h < 17) return "day";
  if (h < 19.5) return "dusk";
  return "night";
}

export function phaseProgress(now: Date): number {
  const h = now.getHours() + now.getMinutes() / 60;
  const phase = resolvePhase(now);
  if (phase === "night") {
    const t = h >= 19.5 ? h - 19.5 : h + 4.5;
    return Math.max(0, Math.min(1, t / 9.5));
  }
  if (phase === "dawn") return Math.max(0, Math.min(1, (h - 5) / 2.5));
  if (phase === "day") return Math.max(0, Math.min(1, (h - 7.5) / 9.5));
  return Math.max(0, Math.min(1, (h - 17) / 2.5));
}

export function isAwake(bias: TimeBias, phase: HabitatPhase): boolean {
  if (bias === "diurnal") return phase !== "night";
  if (bias === "nocturnal") return phase === "night" || phase === "dusk" || phase === "dawn";
  if (bias === "crepuscular") return phase === "dawn" || phase === "dusk";
  return true;
}

export const kGrowthThresholds = [0, 3, 7, 21] as const;
export function growthStage(streak: number): number {
  let stage = 0;
  for (let i = 0; i < kGrowthThresholds.length; i++) if (streak >= kGrowthThresholds[i]) stage = i;
  return stage;
}
export function nextGrowthThreshold(streak: number): number | null {
  for (const t of kGrowthThresholds) if (streak < t) return t;
  return null;
}

export interface Biome {
  groundNear: string;
  groundFar: string;
  foliage: string;
  foliageFar: string;
  trunk: string;
  outline: string;
  accent: string;
  water?: string;
}

export interface HabitatPalette {
  phase: HabitatPhase;
  skyTop: string;
  skyBottom: string;
  celestial: string;
  celestialOutline: string;
  starOpacity: number;
  biome: Biome;
  lightWarmth: number;
  paper: string;
}

const _kNightTint = "#1B2A4A";
const _kDawnTint = "#FFB77A";
const _kDuskTint = "#FF8A5B";

function tintBiome(b: Biome, tint: string, amount: number): Biome {
  const a = Math.max(0, Math.min(1, amount));
  const f = (c: string) => lerpColor(lerpColor(c, tint, a), c, 0.22);
  return {
    groundNear: f(b.groundNear),
    groundFar: f(b.groundFar),
    foliage: f(b.foliage),
    foliageFar: f(b.foliageFar),
    trunk: f(b.trunk),
    outline: f(b.outline),
    accent: lerpColor(b.accent, tint, a * 0.3),
    water: b.water ? f(b.water) : undefined,
  };
}

export function resolveHabitatPalette(opts: { biome: Biome; now: Date; override?: HabitatPhase }): HabitatPalette {
  const phase = opts.override ?? resolvePhase(opts.now);
  const t = opts.override ? 0.5 : phaseProgress(opts.now);
  const arc = Math.sin(t * Math.PI);
  switch (phase) {
    case "dawn":
      return {
        phase,
        skyTop: "#FFC58F",
        skyBottom: lerpColor("#FFD8A8", "#FFE9C4", t),
        celestial: "#FFD98A",
        celestialOutline: "#E08C3C",
        starOpacity: Math.max(0, Math.min(1, 1 - t * 1.6)) * 0.45,
        biome: tintBiome(opts.biome, _kDawnTint, 0.16 + arc * 0.1),
        lightWarmth: 0.7,
        paper: "#6B4A32",
      };
    case "day":
      return {
        phase,
        skyTop: "#A9D8F5",
        skyBottom: "#D9EEFB",
        celestial: "#FFE066",
        celestialOutline: "#E9A93C",
        starOpacity: 0,
        biome: opts.biome,
        lightWarmth: 0.2,
        paper: "#6B4A32",
      };
    case "dusk":
      return {
        phase,
        skyTop: "#6B5C9E",
        skyBottom: lerpColor("#FFB27A", "#9A6B8E", t),
        celestial: "#FF9E4F",
        celestialOutline: "#C85E22",
        starOpacity: Math.max(0, Math.min(1, t * 1.4 - 0.2)) * 0.6,
        biome: tintBiome(opts.biome, _kDuskTint, 0.18 + t * 0.14),
        lightWarmth: 0.85,
        paper: "#5A3E2A",
      };
    case "night":
    default:
      return {
        phase,
        skyTop: "#131F3A",
        skyBottom: "#2A3A60",
        celestial: "#F2ECD2",
        celestialOutline: "#A9B4CE",
        starOpacity: 1,
        biome: tintBiome(opts.biome, _kNightTint, 0.46 + arc * 0.08),
        lightWarmth: -0.6,
        paper: "#D8C6A8",
      };
  }
}

export type PropKind = "hill" | "tree" | "branch" | "grassTuft" | "rock" | "pond" | "bamboo" | "crag" | "ruinPillar" | "flower" | "cloud" | "cushion" | "lantern" | "kennel" | "ball";
export type SceneLayer = "far" | "mid" | "near";

export interface ScenePropSpec {
  kind: PropKind;
  at: { x: number; y: number };
  size: number;
  layer?: SceneLayer;
  aspect?: number;
  lean?: number;
  variant?: number;
  minStreak?: number;
}

export interface Waypoint {
  id: string;
  at: { x: number; y: number };
  facing?: number;
  scale?: number;
  airborne?: boolean;
}

export type BeatKind = "idle" | "look" | "groom" | "stretch" | "sleep" | "wake" | "call" | "travel" | "daydream" | "bounce" | "chase";
export type BeatWhen = "awake" | "asleep" | "either";
export interface Beat {
  kind: BeatKind;
  seconds?: number;
  waypointId?: string;
  phases?: HabitatPhase[];
  weight?: number;
  when?: BeatWhen;
  minStreak?: number;
}

export type DaydreamIcon = "fish" | "mouse" | "worm" | "bone" | "star" | "heart" | "gem" | "flame" | "moon" | "crown" | "note" | "fly";
export type AmbientKind = "none" | "fireflies" | "leaves" | "petals" | "embers" | "snow" | "dust" | "bubbles" | "sparkles" | "feathers" | "sparks";
export type CallFx = "none" | "beam" | "fire" | "rebirth" | "gust";
export type QuarryKind = "mouse" | "beetle" | "butterfly" | "insect";

export interface Quarry {
  kind: QuarryKind;
  band?: number;
  centerX?: number;
  amp?: number;
  speed?: number;
  seedSalt?: number;
}

export interface HabitatScene {
  avatarId: string;
  biome: Biome;
  bias: TimeBias;
  lockedPhase?: HabitatPhase;
  props: ScenePropSpec[];
  waypoints: Waypoint[];
  beats: Beat[];
  daydream: DaydreamIcon;
  ambient?: AmbientKind;
  ambientDensity?: number;
  horizon?: number;
  animalScale?: number;
  celestialAt?: { x: number; y: number };
  quarry?: Quarry;
  callFx?: CallFx;
}

export function propsFor(scene: HabitatScene, streak: number): ScenePropSpec[] {
  return scene.props.filter((p) => (p.minStreak ?? 0) <= streak);
}

/** The waypoint with `id`, or the first one if it is missing. */
export function waypointOf(scene: HabitatScene, id: string | null | undefined): Waypoint {
  if (id) {
    for (const w of scene.waypoints) if (w.id === id) return w;
  }
  return scene.waypoints[0];
}

export function quarryPositionAt(q: NonNullable<HabitatScene["quarry"]>, seconds: number, seed: number): { x: number; y: number } {
  const t = Math.max(0, seconds);
  const phase = t * (q.speed ?? 0.13) * 2 * Math.PI + Math.sin(t * 0.41) * 0.9 + HandDrawn.noise(seed ^ (q.seedSalt ?? 0), 0, 5) * 2 * Math.PI;
  const x = (q.centerX ?? 0.5) + (q.amp ?? 0.34) * Math.sin(phase);
  const hopStep = Math.floor(t * 6);
  const hop = q.kind === "butterfly" ? Math.sin(t * 2.3) * 0.05 : HandDrawn.noise(seed ^ (q.seedSalt ?? 0), hopStep, 9) > 0.45 ? Math.sin(((t * 6) % 1) * Math.PI) * 0.018 : 0;
  return { x, y: (q.band ?? 0.9) - hop };
}
