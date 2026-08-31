import type { HabitatScene, ScenePropSpec, Waypoint, Beat, Biome } from "./habitat-scene";

// --- biome palettes (authored as if lit at noon) ---------------------------

const oakwood: Biome = { groundNear: "#6E9A4E", groundFar: "#93B07C", foliage: "#5C8A42", foliageFar: "#8CA877", trunk: "#8B6242", outline: "#4A3524", accent: "#E8791F", water: "#6FA8C4" };
const autumnMeadow: Biome = { groundNear: "#97A845", groundFar: "#BCBE83", foliage: "#C97A2A", foliageFar: "#DCA95F", trunk: "#6E4626", outline: "#41290F", accent: "#E8A33A", water: "#7FA8B8" };
const cosyNook: Biome = { groundNear: "#6F8F5A", groundFar: "#B6A17A", foliage: "#4F7A46", foliageFar: "#86A06A", trunk: "#9A6B3E", outline: "#3C2E22", accent: "#E79BB0", water: "#86B6C8" };
const backyard: Biome = { groundNear: "#74B455", groundFar: "#A6C77E", foliage: "#5E923F", foliageFar: "#93B673", trunk: "#B07A3E", outline: "#43301C", accent: "#E0503E", water: "#6FB0C8" };
const badlands: Biome = { groundNear: "#6E4A44", groundFar: "#7C5E58", foliage: "#5A4038", foliageFar: "#6E524A", trunk: "#5A4038", outline: "#241A1C", accent: "#8FE8F0", water: "#5A8CA0" };
const bambooGrove: Biome = { groundNear: "#6FA07A", groundFar: "#A8C0A6", foliage: "#4E8A5A", foliageFar: "#88AE86", trunk: "#9BB05A", outline: "#33422F", accent: "#F2A0C0", water: "#88BEC4" };
const farmyard: Biome = { groundNear: "#C7A24E", groundFar: "#D8C486", foliage: "#7C9A3E", foliageFar: "#A8BE78", trunk: "#9A5A34", outline: "#4A2E18", accent: "#E23A2A", water: "#6FA8C4" };
const lilyPond: Biome = { groundNear: "#C2B274", groundFar: "#A9B490", foliage: "#4F9E7C", foliageFar: "#86BBA0", trunk: "#7C8A3E", outline: "#294438", accent: "#E7C24A", water: "#6FBAC0" };
const volcano: Biome = { groundNear: "#3A2A2E", groundFar: "#4E3438", foliage: "#3A2A2E", foliageFar: "#4E3438", trunk: "#2E2024", outline: "#140C0E", accent: "#FF7A1E", water: "#FF6A1A" };
const pyreSky: Biome = { groundNear: "#6E4632", groundFar: "#8A5E3E", foliage: "#9A5A2E", foliageFar: "#B8823E", trunk: "#7A4A2A", outline: "#3A1E10", accent: "#FFD24A", water: "#E8A24A" };
const eyrie: Biome = { groundNear: "#7C8496", groundFar: "#A6AEBE", foliage: "#5E7A6E", foliageFar: "#8AA096", trunk: "#6E6456", outline: "#2E3038", accent: "#E8B84A", water: "#8FB8C8" };
const pondside: Biome = { groundNear: "#6FA84A", groundFar: "#9CC178", foliage: "#4E8A3A", foliageFar: "#86A96A", trunk: "#6E5230", outline: "#2E4A22", accent: "#E86A78", water: "#5AA8C8" };

// --- grass sets -------------------------------------------------------------

const owlGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.04, y: 0.98 }, size: 13 },
  { kind: "grassTuft", layer: "near", at: { x: 0.11, y: 1.0 }, size: 16, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.19, y: 0.97 }, size: 11, variant: 2 },
  { kind: "grassTuft", layer: "near", at: { x: 0.32, y: 0.99 }, size: 14, variant: 3 },
  { kind: "grassTuft", layer: "near", at: { x: 0.41, y: 1.01 }, size: 17, variant: 4 },
  { kind: "grassTuft", layer: "near", at: { x: 0.56, y: 0.98 }, size: 12, variant: 5 },
  { kind: "grassTuft", layer: "near", at: { x: 0.63, y: 1.0 }, size: 15, variant: 6 },
  { kind: "grassTuft", layer: "near", at: { x: 0.78, y: 0.99 }, size: 13, variant: 7 },
  { kind: "grassTuft", layer: "near", at: { x: 0.93, y: 1.01 }, size: 16, variant: 8 },
];
const foxGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.02, y: 1.0 }, size: 21 },
  { kind: "grassTuft", layer: "near", at: { x: 0.08, y: 1.02 }, size: 25, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.13, y: 0.99 }, size: 18, variant: 2 },
  { kind: "grassTuft", layer: "near", at: { x: 0.35, y: 1.01 }, size: 24, variant: 3 },
  { kind: "grassTuft", layer: "near", at: { x: 0.42, y: 1.03 }, size: 27, variant: 4 },
  { kind: "grassTuft", layer: "near", at: { x: 0.5, y: 1.0 }, size: 20, variant: 5 },
  { kind: "grassTuft", layer: "near", at: { x: 0.83, y: 1.02 }, size: 26, variant: 6 },
  { kind: "grassTuft", layer: "near", at: { x: 0.9, y: 1.0 }, size: 22, variant: 7 },
  { kind: "grassTuft", layer: "near", at: { x: 0.97, y: 1.03 }, size: 28, variant: 8 },
];
const catGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.06, y: 1.0 }, size: 9 },
  { kind: "grassTuft", layer: "near", at: { x: 0.24, y: 1.01 }, size: 8, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.58, y: 1.0 }, size: 10, variant: 2 },
  { kind: "grassTuft", layer: "near", at: { x: 0.92, y: 1.01 }, size: 9, variant: 3 },
];
const dogGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.05, y: 1.0 }, size: 14 },
  { kind: "grassTuft", layer: "near", at: { x: 0.15, y: 1.01 }, size: 12, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.3, y: 1.0 }, size: 15, variant: 2 },
  { kind: "grassTuft", layer: "near", at: { x: 0.52, y: 1.02 }, size: 13, variant: 3 },
  { kind: "grassTuft", layer: "near", at: { x: 0.78, y: 1.0 }, size: 14, variant: 4 },
  { kind: "grassTuft", layer: "near", at: { x: 0.94, y: 1.01 }, size: 12, variant: 5 },
];
const pandaGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.05, y: 1.0 }, size: 15 },
  { kind: "grassTuft", layer: "near", at: { x: 0.38, y: 1.01 }, size: 13, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.58, y: 1.0 }, size: 16, variant: 2 },
  { kind: "grassTuft", layer: "near", at: { x: 0.9, y: 1.01 }, size: 14, variant: 3 },
];
const roosterGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.08, y: 1.0 }, size: 13 },
  { kind: "grassTuft", layer: "near", at: { x: 0.4, y: 1.01 }, size: 15, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.66, y: 1.0 }, size: 12, variant: 2 },
  { kind: "grassTuft", layer: "near", at: { x: 0.92, y: 1.01 }, size: 14, variant: 3 },
];
const turtleGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.1, y: 1.0 }, size: 13 },
  { kind: "grassTuft", layer: "near", at: { x: 0.26, y: 1.01 }, size: 11, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.44, y: 1.0 }, size: 12, variant: 2 },
];
const griffinGrass: ScenePropSpec[] = [
  { kind: "grassTuft", layer: "near", at: { x: 0.12, y: 1.0 }, size: 11 },
  { kind: "grassTuft", layer: "near", at: { x: 0.42, y: 1.01 }, size: 13, variant: 1 },
  { kind: "grassTuft", layer: "near", at: { x: 0.9, y: 1.0 }, size: 10, variant: 2 },
];

// --- scene builder with the same defaults as the Flutter constructor --------

function sc(
  o: Partial<HabitatScene> & Pick<HabitatScene, "avatarId" | "biome" | "bias" | "props" | "waypoints" | "beats" | "daydream">,
): HabitatScene {
  return { horizon: 0.72, animalScale: 0.34, celestialAt: { x: 0.78, y: 0.2 }, ambient: "none", ambientDensity: 1, ...o };
}

// --- owl --------------------------------------------------------------------

const kOwl = sc({
  avatarId: "owl",
  biome: oakwood,
  bias: "nocturnal",
  ambient: "fireflies",
  ambientDensity: 1,
  horizon: 0.78,
  animalScale: 0.3,
  celestialAt: { x: 0.79, y: 0.2 },
  daydream: "moon",
  props: [
    { kind: "hill", layer: "far", at: { x: -0.05, y: 0.9 }, size: 24, aspect: 4.6 },
    { kind: "hill", layer: "far", at: { x: 0.52, y: 0.92 }, size: 18, aspect: 4, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.06, y: 0.1 }, size: 13, aspect: 2.8 },
    { kind: "cloud", layer: "far", at: { x: 0.58, y: 0.05 }, size: 9, aspect: 2.4, variant: 1 },
    { kind: "tree", layer: "mid", at: { x: 0.23, y: 0.88 }, size: 76, lean: -0.12 },
    { kind: "branch", layer: "mid", at: { x: 0.28, y: 0.47 }, size: 38, lean: 0.06 },
    { kind: "branch", layer: "mid", at: { x: 0.15, y: 0.33 }, size: 24, lean: 0.04, variant: 1 },
    { kind: "rock", layer: "near", at: { x: 0.86, y: 0.96 }, size: 11, aspect: 1.8 },
    ...owlGrass,
    { kind: "flower", layer: "near", at: { x: 0.66, y: 0.95 }, size: 10, minStreak: 3 },
    { kind: "flower", layer: "near", at: { x: 0.7, y: 0.97 }, size: 7, variant: 1, minStreak: 3 },
    { kind: "tree", layer: "mid", at: { x: 0.9, y: 0.9 }, size: 30, lean: 0.16, variant: 2, minStreak: 7 },
    { kind: "pond", layer: "near", at: { x: 0.46, y: 0.99 }, size: 9, aspect: 3.4, minStreak: 21 },
  ],
  waypoints: [
    { id: "branch", at: { x: 0.49, y: 0.5 }, facing: -1, airborne: true },
    { id: "branch.high", at: { x: 0.27, y: 0.355 }, facing: 1, scale: 0.9, airborne: true },
    { id: "ground", at: { x: 0.73, y: 0.9 }, facing: -1, scale: 1.1 },
  ],
  beats: [
    { kind: "idle", seconds: 3.4, weight: 3 },
    { kind: "look", seconds: 2.4, weight: 2.2 },
    { kind: "groom", seconds: 2.8, weight: 1.4 },
    { kind: "stretch", seconds: 2, weight: 0.7 },
    { kind: "travel", seconds: 2.6, weight: 1.6 },
    { kind: "bounce", seconds: 1.8, weight: 0.45 },
    { kind: "call", seconds: 2.2, weight: 0.8, phases: ["dusk", "night"], minStreak: 1 },
    { kind: "sleep", seconds: 6.5, weight: 4, when: "asleep" },
    { kind: "daydream", seconds: 5, weight: 1.3, when: "asleep" },
  ],
});

// --- fox --------------------------------------------------------------------

const kFox = sc({
  avatarId: "fox",
  biome: autumnMeadow,
  bias: "diurnal",
  ambient: "leaves",
  ambientDensity: 1.3,
  horizon: 0.75,
  animalScale: 0.34,
  celestialAt: { x: 0.72, y: 0.17 },
  daydream: "mouse",
  quarry: { kind: "mouse", band: 0.9, centerX: 0.52, amp: 0.33, speed: 0.12 },
  props: [
    { kind: "hill", layer: "far", at: { x: -0.1, y: 0.88 }, size: 19, aspect: 6 },
    { kind: "hill", layer: "far", at: { x: 0.34, y: 0.9 }, size: 15, aspect: 5.2, variant: 1 },
    { kind: "hill", layer: "far", at: { x: 0.72, y: 0.89 }, size: 22, aspect: 4.4, variant: 2 },
    { kind: "cloud", layer: "far", at: { x: 0.14, y: 0.06 }, size: 14, aspect: 3.2 },
    { kind: "cloud", layer: "far", at: { x: 0.48, y: 0.14 }, size: 10, aspect: 2.6, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.82, y: 0.04 }, size: 11, aspect: 2.9, variant: 2 },
    { kind: "tree", layer: "mid", at: { x: 0.04, y: 0.86 }, size: 46, lean: -0.2 },
    { kind: "tree", layer: "mid", at: { x: 0.95, y: 0.87 }, size: 40, lean: 0.22, variant: 1 },
    { kind: "rock", layer: "near", at: { x: 0.19, y: 0.97 }, size: 20, aspect: 2.1 },
    { kind: "rock", layer: "near", at: { x: 0.29, y: 0.99 }, size: 10, aspect: 1.6, variant: 1 },
    ...foxGrass,
    { kind: "flower", layer: "near", at: { x: 0.56, y: 0.96 }, size: 11, minStreak: 3 },
    { kind: "flower", layer: "near", at: { x: 0.61, y: 0.98 }, size: 8, variant: 1, minStreak: 3 },
    { kind: "flower", layer: "near", at: { x: 0.4, y: 0.99 }, size: 10, variant: 2, minStreak: 7 },
    { kind: "grassTuft", layer: "near", at: { x: 0.48, y: 1.02 }, size: 22, variant: 9, minStreak: 7 },
    { kind: "pond", layer: "near", at: { x: 0.68, y: 1.0 }, size: 9, aspect: 3.6, minStreak: 21 },
  ],
  waypoints: [
    { id: "ground", at: { x: 0.44, y: 0.9 }, facing: 1 },
    { id: "ground.right", at: { x: 0.74, y: 0.92 }, facing: -1, scale: 1.08 },
    { id: "den", at: { x: 0.19, y: 0.87 }, facing: 1, scale: 0.93 },
  ],
  beats: [
    { kind: "idle", seconds: 3.2, weight: 3 },
    { kind: "look", seconds: 2.2, weight: 2.4 },
    { kind: "groom", seconds: 2.6, weight: 1.6 },
    { kind: "stretch", seconds: 2, weight: 0.8 },
    { kind: "travel", seconds: 2.3, weight: 2.2 },
    { kind: "bounce", seconds: 1.5, weight: 1.1 },
    { kind: "chase", seconds: 3.2, weight: 3.4 },
    { kind: "call", seconds: 1.9, weight: 0.9, phases: ["dusk", "dawn"], minStreak: 1 },
    { kind: "sleep", seconds: 6, weight: 4, when: "asleep" },
    { kind: "daydream", seconds: 4.8, weight: 1.4, when: "asleep" },
  ],
});

// --- cat --------------------------------------------------------------------

const kCat = sc({
  avatarId: "cat",
  biome: cosyNook,
  bias: "crepuscular",
  ambient: "dust",
  ambientDensity: 1.1,
  horizon: 0.82,
  animalScale: 0.32,
  celestialAt: { x: 0.85, y: 0.24 },
  daydream: "fish",
  props: [
    { kind: "hill", layer: "far", at: { x: 0.1, y: 0.96 }, size: 12, aspect: 7.5 },
    { kind: "cloud", layer: "far", at: { x: 0.24, y: 0.1 }, size: 10, aspect: 2.8 },
    { kind: "tree", layer: "mid", at: { x: 0.02, y: 0.9 }, size: 38, lean: -0.22 },
    { kind: "tree", layer: "mid", at: { x: 0.97, y: 0.91 }, size: 33, lean: 0.24, variant: 1 },
    { kind: "lantern", layer: "mid", at: { x: 0.7, y: 0.12 }, size: 16 },
    { kind: "cushion", layer: "mid", at: { x: 0.44, y: 0.98 }, size: 20, aspect: 2 },
    { kind: "flower", layer: "near", at: { x: 0.86, y: 0.98 }, size: 13 },
    ...catGrass,
    { kind: "flower", layer: "near", at: { x: 0.14, y: 0.99 }, size: 11, variant: 1, minStreak: 3 },
    { kind: "lantern", layer: "mid", at: { x: 0.24, y: 0.2 }, size: 11, variant: 1, minStreak: 7 },
    { kind: "flower", layer: "near", at: { x: 0.62, y: 1.0 }, size: 12, variant: 2, minStreak: 21 },
    { kind: "flower", layer: "near", at: { x: 0.72, y: 0.99 }, size: 9, variant: 3, minStreak: 21 },
  ],
  waypoints: [
    { id: "cushion", at: { x: 0.44, y: 0.92 }, facing: -1 },
    { id: "corner.left", at: { x: 0.2, y: 0.93 }, facing: 1, scale: 0.96 },
    { id: "corner.right", at: { x: 0.76, y: 0.94 }, facing: -1, scale: 1.04 },
  ],
  beats: [
    { kind: "idle", seconds: 4.2, weight: 3.8 },
    { kind: "look", seconds: 2.6, weight: 1.8 },
    { kind: "groom", seconds: 3.4, weight: 3 },
    { kind: "stretch", seconds: 2.2, weight: 1.2 },
    { kind: "travel", seconds: 2.6, weight: 1.2 },
    { kind: "bounce", seconds: 1.6, weight: 0.4 },
    { kind: "call", seconds: 2, weight: 1, phases: ["dawn", "dusk"], minStreak: 1 },
    { kind: "sleep", seconds: 7, weight: 4.2, when: "asleep" },
    { kind: "daydream", seconds: 5.5, weight: 2.4, when: "asleep" },
  ],
});

// --- dog --------------------------------------------------------------------

const kDog = sc({
  avatarId: "dog",
  biome: backyard,
  bias: "diurnal",
  ambient: "petals",
  ambientDensity: 0.8,
  horizon: 0.77,
  animalScale: 0.34,
  celestialAt: { x: 0.5, y: 0.16 },
  daydream: "bone",
  props: [
    { kind: "hill", layer: "far", at: { x: 0, y: 0.9 }, size: 16, aspect: 5.4 },
    { kind: "hill", layer: "far", at: { x: 0.6, y: 0.91 }, size: 14, aspect: 5, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.12, y: 0.07 }, size: 12, aspect: 3 },
    { kind: "cloud", layer: "far", at: { x: 0.66, y: 0.11 }, size: 10, aspect: 2.7, variant: 1 },
    { kind: "kennel", layer: "mid", at: { x: 0.2, y: 0.9 }, size: 40 },
    { kind: "tree", layer: "mid", at: { x: 0.88, y: 0.89 }, size: 38, lean: 0.14 },
    { kind: "ball", layer: "near", at: { x: 0.66, y: 0.95 }, size: 11 },
    ...dogGrass,
    { kind: "flower", layer: "near", at: { x: 0.4, y: 0.96 }, size: 10, minStreak: 3 },
    { kind: "flower", layer: "near", at: { x: 0.45, y: 0.98 }, size: 8, variant: 1, minStreak: 3 },
    { kind: "ball", layer: "near", at: { x: 0.34, y: 0.99 }, size: 8, variant: 1, minStreak: 7 },
    { kind: "pond", layer: "near", at: { x: 0.54, y: 1.0 }, size: 7, aspect: 3, minStreak: 21 },
  ],
  waypoints: [
    { id: "kennel", at: { x: 0.2, y: 0.91 }, facing: 1 },
    { id: "yard.mid", at: { x: 0.48, y: 0.93 }, facing: 1, scale: 1.04 },
    { id: "ball", at: { x: 0.68, y: 0.94 }, facing: -1, scale: 1.06 },
  ],
  beats: [
    { kind: "idle", seconds: 2.8, weight: 2.6 },
    { kind: "look", seconds: 2, weight: 2.2 },
    { kind: "groom", seconds: 2.4, weight: 0.8 },
    { kind: "stretch", seconds: 2, weight: 1 },
    { kind: "travel", seconds: 2.2, weight: 2.4 },
    { kind: "bounce", seconds: 1.4, weight: 1.8 },
    { kind: "call", seconds: 1.6, weight: 1.2, phases: ["day", "dawn", "dusk"], minStreak: 1 },
    { kind: "sleep", seconds: 5.5, weight: 3.6, when: "asleep" },
    { kind: "daydream", seconds: 4.6, weight: 1.3, when: "asleep" },
  ],
});

// --- ufo (premium) ----------------------------------------------------------

const kUfo = sc({
  avatarId: "ufo",
  biome: badlands,
  bias: "tireless",
  lockedPhase: "night",
  ambient: "sparkles",
  ambientDensity: 1,
  horizon: 0.82,
  animalScale: 0.28,
  celestialAt: { x: 0.16, y: 0.18 },
  daydream: "star",
  callFx: "beam",
  props: [
    { kind: "crag", layer: "far", at: { x: 0.12, y: 0.98 }, size: 34, aspect: 1.6 },
    { kind: "crag", layer: "far", at: { x: 0.6, y: 1.0 }, size: 44, aspect: 1.4, variant: 1 },
    { kind: "hill", layer: "far", at: { x: 0, y: 0.96 }, size: 14, aspect: 5 },
    { kind: "crag", layer: "mid", at: { x: 0.86, y: 1.0 }, size: 52, aspect: 0.9, variant: 2 },
    { kind: "rock", layer: "near", at: { x: 0.32, y: 0.98 }, size: 12, aspect: 2 },
    { kind: "rock", layer: "near", at: { x: 0.7, y: 0.99 }, size: 9, aspect: 1.7, variant: 1 },
    { kind: "rock", layer: "near", at: { x: 0.5, y: 1.0 }, size: 8, variant: 2, minStreak: 3 },
    { kind: "crag", layer: "far", at: { x: 0.36, y: 1.0 }, size: 26, aspect: 1.3, variant: 3, minStreak: 7 },
    { kind: "flower", layer: "near", at: { x: 0.6, y: 0.99 }, size: 11, minStreak: 21 },
  ],
  waypoints: [
    { id: "hover.l", at: { x: 0.3, y: 0.34 }, airborne: true },
    { id: "hover.r", at: { x: 0.68, y: 0.3 }, facing: -1, airborne: true, scale: 0.94 },
    { id: "hover.high", at: { x: 0.5, y: 0.22 }, airborne: true, scale: 0.88 },
  ],
  beats: [
    { kind: "idle", seconds: 3, weight: 2.8 },
    { kind: "look", seconds: 2.2, weight: 2 },
    { kind: "stretch", seconds: 1.8, weight: 1 },
    { kind: "travel", seconds: 2.6, weight: 2.6 },
    { kind: "bounce", seconds: 1.6, weight: 0.8 },
    { kind: "call", seconds: 2.8, weight: 2.2 },
  ],
});

// --- panda (premium) --------------------------------------------------------

const kPanda = sc({
  avatarId: "panda",
  biome: bambooGrove,
  bias: "diurnal",
  ambient: "snow",
  ambientDensity: 1.1,
  horizon: 0.8,
  animalScale: 0.34,
  celestialAt: { x: 0.82, y: 0.19 },
  daydream: "heart",
  quarry: { kind: "butterfly", band: 0.7, centerX: 0.54, amp: 0.28, speed: 0.1 },
  props: [
    { kind: "hill", layer: "far", at: { x: -0.05, y: 0.92 }, size: 20, aspect: 4.8 },
    { kind: "hill", layer: "far", at: { x: 0.55, y: 0.94 }, size: 16, aspect: 4.2, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.1, y: 0.09 }, size: 13, aspect: 3 },
    { kind: "bamboo", layer: "mid", at: { x: 0.08, y: 0.9 }, size: 66, lean: 0.05 },
    { kind: "bamboo", layer: "mid", at: { x: 0.19, y: 0.91 }, size: 54, lean: -0.04, variant: 1 },
    { kind: "bamboo", layer: "mid", at: { x: 0.86, y: 0.9 }, size: 60, lean: -0.06, variant: 2 },
    { kind: "bamboo", layer: "mid", at: { x: 0.95, y: 0.92 }, size: 48, lean: 0.05, variant: 3 },
    { kind: "rock", layer: "near", at: { x: 0.24, y: 0.98 }, size: 12, aspect: 1.9 },
    ...pandaGrass,
    { kind: "flower", layer: "near", at: { x: 0.66, y: 0.96 }, size: 11, minStreak: 3 },
    { kind: "bamboo", layer: "mid", at: { x: 0.72, y: 0.91 }, size: 44, lean: 0.04, variant: 4, minStreak: 7 },
    { kind: "pond", layer: "near", at: { x: 0.46, y: 1.0 }, size: 8, aspect: 3.2, minStreak: 21 },
  ],
  waypoints: [
    { id: "ground", at: { x: 0.42, y: 0.9 }, facing: 1 },
    { id: "ground.right", at: { x: 0.7, y: 0.91 }, facing: -1, scale: 1.05 },
    { id: "ground.left", at: { x: 0.28, y: 0.92 }, facing: 1, scale: 1.02 },
  ],
  beats: [
    { kind: "idle", seconds: 4, weight: 3.4 },
    { kind: "look", seconds: 2.4, weight: 1.8 },
    { kind: "groom", seconds: 3, weight: 2 },
    { kind: "stretch", seconds: 2.2, weight: 1 },
    { kind: "travel", seconds: 2.6, weight: 1.4 },
    { kind: "bounce", seconds: 1.6, weight: 0.6 },
    { kind: "chase", seconds: 3, weight: 1.8 },
    { kind: "call", seconds: 2, weight: 0.8, phases: ["day", "dawn"], minStreak: 1 },
    { kind: "sleep", seconds: 7, weight: 3.8, when: "asleep" },
    { kind: "daydream", seconds: 5, weight: 1.6, when: "asleep" },
  ],
});

// --- rooster ----------------------------------------------------------------

const kRooster = sc({
  avatarId: "rooster",
  biome: farmyard,
  bias: "diurnal",
  ambient: "feathers",
  ambientDensity: 0.9,
  horizon: 0.76,
  animalScale: 0.32,
  celestialAt: { x: 0.85, y: 0.26 },
  daydream: "note",
  props: [
    { kind: "hill", layer: "far", at: { x: -0.06, y: 0.9 }, size: 18, aspect: 5.2 },
    { kind: "hill", layer: "far", at: { x: 0.5, y: 0.92 }, size: 15, aspect: 4.6, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.16, y: 0.08 }, size: 12, aspect: 2.8 },
    { kind: "ruinPillar", layer: "mid", at: { x: 0.2, y: 0.9 }, size: 43, aspect: 0.7 },
    { kind: "ruinPillar", layer: "mid", at: { x: 0.34, y: 0.91 }, size: 26, aspect: 0.7, variant: 1 },
    { kind: "ruinPillar", layer: "mid", at: { x: 0.47, y: 0.91 }, size: 24, aspect: 0.7, variant: 2 },
    { kind: "branch", layer: "mid", at: { x: 0.2, y: 0.66 }, size: 30, lean: 0.02 },
    { kind: "rock", layer: "near", at: { x: 0.82, y: 0.97 }, size: 10, aspect: 1.8 },
    ...roosterGrass,
    { kind: "flower", layer: "near", at: { x: 0.62, y: 0.96 }, size: 11, minStreak: 3 },
    { kind: "ruinPillar", layer: "mid", at: { x: 0.6, y: 0.92 }, size: 22, aspect: 0.7, variant: 3, minStreak: 7 },
    { kind: "pond", layer: "near", at: { x: 0.7, y: 1.0 }, size: 8, aspect: 3, minStreak: 21 },
  ],
  waypoints: [
    { id: "post", at: { x: 0.2, y: 0.47 }, facing: 1, scale: 0.92, airborne: true },
    { id: "yard", at: { x: 0.5, y: 0.9 }, facing: 1 },
    { id: "yard.right", at: { x: 0.76, y: 0.92 }, facing: -1, scale: 1.05 },
  ],
  beats: [
    { kind: "idle", seconds: 2.8, weight: 2.6 },
    { kind: "look", seconds: 2, weight: 2.4 },
    { kind: "groom", seconds: 2.2, weight: 2 },
    { kind: "stretch", seconds: 1.8, weight: 0.9 },
    { kind: "travel", seconds: 2.2, weight: 1.8 },
    { kind: "bounce", seconds: 1.4, weight: 1 },
    { kind: "call", seconds: 2.4, weight: 2, phases: ["dawn"], minStreak: 1 },
    { kind: "sleep", seconds: 6, weight: 4, when: "asleep" },
    { kind: "daydream", seconds: 4.6, weight: 1.2, when: "asleep" },
  ],
});

// --- turtle -----------------------------------------------------------------

const kTurtle = sc({
  avatarId: "turtle",
  biome: lilyPond,
  bias: "diurnal",
  ambient: "bubbles",
  ambientDensity: 1,
  horizon: 0.72,
  animalScale: 0.28,
  celestialAt: { x: 0.8, y: 0.2 },
  daydream: "worm",
  props: [
    { kind: "hill", layer: "far", at: { x: 0, y: 0.86 }, size: 15, aspect: 5.4 },
    { kind: "cloud", layer: "far", at: { x: 0.5, y: 0.08 }, size: 12, aspect: 3 },
    { kind: "bamboo", layer: "mid", at: { x: 0.08, y: 0.86 }, size: 30, lean: 0.08 },
    { kind: "bamboo", layer: "mid", at: { x: 0.15, y: 0.87 }, size: 24, lean: -0.05, variant: 1 },
    { kind: "rock", layer: "mid", at: { x: 0.36, y: 0.88 }, size: 22, aspect: 2.2 },
    { kind: "pond", layer: "near", at: { x: 0.66, y: 1.0 }, size: 13, aspect: 3.8 },
    ...turtleGrass,
    { kind: "flower", layer: "near", at: { x: 0.58, y: 0.97 }, size: 10, minStreak: 3 },
    { kind: "bamboo", layer: "mid", at: { x: 0.9, y: 0.88 }, size: 26, lean: -0.06, variant: 2, minStreak: 7 },
    { kind: "flower", layer: "near", at: { x: 0.72, y: 0.99 }, size: 9, variant: 1, minStreak: 21 },
  ],
  waypoints: [
    { id: "rock", at: { x: 0.36, y: 0.84 }, facing: 1, scale: 0.95 },
    { id: "bank", at: { x: 0.56, y: 0.92 }, facing: 1 },
    { id: "waterside", at: { x: 0.68, y: 0.94 }, facing: -1, scale: 1.05 },
  ],
  beats: [
    { kind: "idle", seconds: 4.6, weight: 4 },
    { kind: "look", seconds: 3, weight: 1.8 },
    { kind: "groom", seconds: 3.2, weight: 1.4 },
    { kind: "stretch", seconds: 2.6, weight: 1.6 },
    { kind: "travel", seconds: 3, weight: 1 },
    { kind: "call", seconds: 2, weight: 0.6, phases: ["day"], minStreak: 1 },
    { kind: "sleep", seconds: 7.5, weight: 4, when: "asleep" },
    { kind: "daydream", seconds: 5.5, weight: 1.6, when: "asleep" },
  ],
});

// --- dragon (ultra premium) -------------------------------------------------

const kDragon = sc({
  avatarId: "dragon",
  biome: volcano,
  bias: "nocturnal",
  lockedPhase: "night",
  ambient: "embers",
  ambientDensity: 1.3,
  horizon: 0.82,
  animalScale: 0.32,
  celestialAt: { x: 0.2, y: 0.16 },
  daydream: "gem",
  callFx: "fire",
  props: [
    { kind: "crag", layer: "far", at: { x: 0.1, y: 1.0 }, size: 40, aspect: 1.4 },
    { kind: "crag", layer: "far", at: { x: 0.66, y: 1.0 }, size: 50, aspect: 1.2, variant: 1 },
    { kind: "crag", layer: "mid", at: { x: 0.24, y: 1.0 }, size: 70, aspect: 0.85, variant: 2 },
    { kind: "pond", layer: "near", at: { x: 0.62, y: 1.0 }, size: 10, aspect: 3.6 },
    { kind: "rock", layer: "near", at: { x: 0.86, y: 0.98 }, size: 12, aspect: 1.9 },
    { kind: "flower", layer: "near", at: { x: 0.4, y: 0.99 }, size: 10, minStreak: 3 },
    { kind: "pond", layer: "near", at: { x: 0.18, y: 1.0 }, size: 7, aspect: 3, variant: 1, minStreak: 7 },
    { kind: "crag", layer: "far", at: { x: 0.42, y: 1.0 }, size: 30, aspect: 1.3, variant: 3, minStreak: 21 },
  ],
  waypoints: [
    { id: "crag", at: { x: 0.24, y: 0.5 }, facing: 1, scale: 0.95, airborne: true },
    { id: "sky", at: { x: 0.62, y: 0.34 }, facing: -1, scale: 0.9, airborne: true },
    { id: "low", at: { x: 0.5, y: 0.62 }, airborne: true },
  ],
  beats: [
    { kind: "idle", seconds: 3, weight: 2.6 },
    { kind: "look", seconds: 2.2, weight: 2 },
    { kind: "groom", seconds: 2.6, weight: 1 },
    { kind: "stretch", seconds: 2.2, weight: 1.2 },
    { kind: "travel", seconds: 2.6, weight: 2.4 },
    { kind: "bounce", seconds: 1.6, weight: 0.6 },
    { kind: "call", seconds: 3, weight: 2.4 },
  ],
});

// --- phoenix (ultra premium) ------------------------------------------------

const kPhoenix = sc({
  avatarId: "phoenix",
  biome: pyreSky,
  bias: "tireless",
  lockedPhase: "dusk",
  ambient: "sparks",
  ambientDensity: 1.1,
  horizon: 0.84,
  animalScale: 0.32,
  celestialAt: { x: 0.82, y: 0.24 },
  daydream: "flame",
  callFx: "rebirth",
  props: [
    { kind: "crag", layer: "far", at: { x: -0.02, y: 1.0 }, size: 34, aspect: 1.5 },
    { kind: "crag", layer: "far", at: { x: 0.72, y: 1.0 }, size: 40, aspect: 1.3, variant: 1 },
    { kind: "ruinPillar", layer: "mid", at: { x: 0.3, y: 0.98 }, size: 58, aspect: 1.1 },
    { kind: "rock", layer: "near", at: { x: 0.72, y: 0.98 }, size: 12, aspect: 2 },
    { kind: "flower", layer: "near", at: { x: 0.5, y: 0.99 }, size: 10, minStreak: 3 },
    { kind: "ruinPillar", layer: "mid", at: { x: 0.6, y: 0.99 }, size: 34, aspect: 1, variant: 1, minStreak: 7 },
    { kind: "flower", layer: "near", at: { x: 0.16, y: 1.0 }, size: 9, variant: 1, minStreak: 21 },
  ],
  waypoints: [
    { id: "pyre", at: { x: 0.3, y: 0.5 }, facing: 1, scale: 0.95, airborne: true },
    { id: "high", at: { x: 0.66, y: 0.28 }, facing: -1, scale: 0.86, airborne: true },
    { id: "wheel", at: { x: 0.5, y: 0.4 }, airborne: true },
  ],
  beats: [
    { kind: "idle", seconds: 3, weight: 2.4 },
    { kind: "look", seconds: 2.2, weight: 1.8 },
    { kind: "stretch", seconds: 2.2, weight: 1.4 },
    { kind: "travel", seconds: 2.6, weight: 2.6 },
    { kind: "bounce", seconds: 1.6, weight: 0.8 },
    { kind: "call", seconds: 3.2, weight: 2.4 },
  ],
});

// --- griffin (ultra premium) ------------------------------------------------

const kGriffin = sc({
  avatarId: "griffin",
  biome: eyrie,
  bias: "diurnal",
  ambient: "feathers",
  ambientDensity: 1,
  horizon: 0.84,
  animalScale: 0.33,
  celestialAt: { x: 0.78, y: 0.16 },
  daydream: "crown",
  callFx: "gust",
  props: [
    { kind: "crag", layer: "far", at: { x: 0.08, y: 1.0 }, size: 46, aspect: 1.3 },
    { kind: "crag", layer: "far", at: { x: 0.78, y: 1.0 }, size: 54, aspect: 1.1, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.3, y: 0.1 }, size: 13, aspect: 3 },
    { kind: "crag", layer: "mid", at: { x: 0.28, y: 1.0 }, size: 62, aspect: 0.9, variant: 2 },
    { kind: "rock", layer: "near", at: { x: 0.8, y: 0.98 }, size: 13, aspect: 1.8 },
    ...griffinGrass,
    { kind: "flower", layer: "near", at: { x: 0.5, y: 0.98 }, size: 10, minStreak: 3 },
    { kind: "crag", layer: "far", at: { x: 0.5, y: 1.0 }, size: 34, aspect: 1.2, variant: 3, minStreak: 7 },
    { kind: "pond", layer: "near", at: { x: 0.64, y: 1.0 }, size: 8, aspect: 3, minStreak: 21 },
  ],
  waypoints: [
    { id: "eyrie", at: { x: 0.28, y: 0.54 }, facing: 1, scale: 0.95, airborne: true },
    { id: "soar", at: { x: 0.68, y: 0.3 }, facing: -1, scale: 0.88, airborne: true },
    { id: "ledge", at: { x: 0.5, y: 0.66 }, airborne: true },
  ],
  beats: [
    { kind: "idle", seconds: 3.2, weight: 3 },
    { kind: "look", seconds: 2.4, weight: 2.2 },
    { kind: "groom", seconds: 2.8, weight: 1.4 },
    { kind: "stretch", seconds: 2.2, weight: 1.2 },
    { kind: "travel", seconds: 2.6, weight: 2.2 },
    { kind: "bounce", seconds: 1.6, weight: 0.6 },
    { kind: "call", seconds: 2.6, weight: 1.8, phases: ["day", "dawn", "dusk"] },
    { kind: "sleep", seconds: 6, weight: 3.6, when: "asleep" },
    { kind: "daydream", seconds: 4.8, weight: 1.2, when: "asleep" },
  ],
});

// --- frog (premium) ---------------------------------------------------------

const kFrog = sc({
  avatarId: "frog",
  biome: pondside,
  bias: "diurnal",
  ambient: "none",
  horizon: 0.7,
  animalScale: 0.32,
  celestialAt: { x: 0.74, y: 0.18 },
  daydream: "fly",
  quarry: { kind: "insect", band: 0.9, centerX: 0.55, amp: 0.3, speed: 0.11 },
  props: [
    { kind: "hill", layer: "far", at: { x: -0.08, y: 0.86 }, size: 20, aspect: 5.4 },
    { kind: "hill", layer: "far", at: { x: 0.58, y: 0.88 }, size: 16, aspect: 4.8, variant: 1 },
    { kind: "cloud", layer: "far", at: { x: 0.16, y: 0.08 }, size: 13, aspect: 3 },
    { kind: "cloud", layer: "far", at: { x: 0.7, y: 0.12 }, size: 10, aspect: 2.6, variant: 1 },
    { kind: "tree", layer: "mid", at: { x: 0.03, y: 0.84 }, size: 45, lean: -0.18 },
    { kind: "pond", layer: "near", at: { x: 0.58, y: 1.0 }, size: 14, aspect: 4.4 },
    { kind: "rock", layer: "near", at: { x: 0.2, y: 0.98 }, size: 16, aspect: 2.2 },
    { kind: "grassTuft", layer: "near", at: { x: 0.02, y: 1.0 }, size: 22 },
    { kind: "grassTuft", layer: "near", at: { x: 0.9, y: 1.01 }, size: 24, variant: 3 },
    { kind: "grassTuft", layer: "near", at: { x: 0.36, y: 1.02 }, size: 18, variant: 5 },
    { kind: "flower", layer: "near", at: { x: 0.62, y: 0.96 }, size: 11, minStreak: 3 },
    { kind: "flower", layer: "near", at: { x: 0.48, y: 0.99 }, size: 9, variant: 1, minStreak: 7 },
    { kind: "grassTuft", layer: "near", at: { x: 0.72, y: 1.02 }, size: 20, variant: 8, minStreak: 7 },
    { kind: "lantern", layer: "near", at: { x: 0.86, y: 0.7 }, size: 12, minStreak: 21 },
  ],
  waypoints: [
    { id: "rock", at: { x: 0.2, y: 0.88 }, facing: 1, scale: 0.98 },
    { id: "bank", at: { x: 0.46, y: 0.9 }, facing: 1 },
    { id: "edge", at: { x: 0.72, y: 0.92 }, facing: -1, scale: 1.06 },
  ],
  beats: [
    { kind: "idle", seconds: 3.2, weight: 3 },
    { kind: "look", seconds: 2.2, weight: 2.2 },
    { kind: "groom", seconds: 2.6, weight: 1.2 },
    { kind: "stretch", seconds: 2, weight: 0.7 },
    { kind: "travel", seconds: 2.2, weight: 1.8 },
    { kind: "bounce", seconds: 1.4, weight: 1.4 },
    { kind: "chase", seconds: 3, weight: 3.6 },
    { kind: "call", seconds: 1.8, weight: 1.2, minStreak: 1 },
    { kind: "sleep", seconds: 6, weight: 4, when: "asleep" },
    { kind: "daydream", seconds: 4.6, weight: 1.2, when: "asleep" },
  ],
});

export const habitatScenes: Record<string, HabitatScene> = {
  owl: kOwl,
  fox: kFox,
  cat: kCat,
  dog: kDog,
  ufo: kUfo,
  panda: kPanda,
  rooster: kRooster,
  turtle: kTurtle,
  dragon: kDragon,
  phoenix: kPhoenix,
  griffin: kGriffin,
  frog: kFrog,
};

/** The stage used for avatars with no bespoke scene: the owl's wood, no branches. */
export const fallbackHabitatScene: HabitatScene = sc({
  avatarId: "_fallback",
  biome: oakwood,
  bias: "diurnal",
  ambient: "leaves",
  horizon: 0.78,
  animalScale: 0.3,
  celestialAt: { x: 0.79, y: 0.2 },
  daydream: "star",
  props: kOwl.props.filter((p) => p.kind !== "branch"),
  waypoints: [
    { id: "ground", at: { x: 0.36, y: 0.9 }, facing: 1 },
    { id: "ground.right", at: { x: 0.72, y: 0.91 }, facing: -1, scale: 1.05 },
  ],
  beats: [
    { kind: "idle", seconds: 3.4, weight: 3 },
    { kind: "look", seconds: 2.4, weight: 2 },
    { kind: "groom", seconds: 2.8, weight: 1.2 },
    { kind: "stretch", seconds: 2, weight: 0.8 },
    { kind: "travel", seconds: 2.4, weight: 1.5 },
    { kind: "bounce", seconds: 1.8, weight: 0.6 },
    { kind: "sleep", seconds: 6.5, weight: 4, when: "asleep" },
    { kind: "daydream", seconds: 5, weight: 1.2, when: "asleep" },
  ],
});

export function habitatSceneFor(id: string | null | undefined): HabitatScene {
  if (!id) return fallbackHabitatScene;
  return habitatScenes[id] ?? fallbackHabitatScene;
}
