// Geometry + palette for the web DriveWorld — a faithful port of the Flutter
// `drive_world.dart` road game, rendered with SVG + HTML over native scroll
// (camera-pan, fling inertia and the speedometer are intentionally dropped).

/** Vertical distance between checkpoint centres, in world px. */
export const NODE_SPACING = 150;
/** Empty band above the first node. */
export const TOP_MARGIN = 110;
/** Empty band below the last node (road runs off-screen into the horizon). */
export const BOTTOM_MARGIN = 220;
/** Checkpoint disc radius. */
export const NODE_RADIUS = 34;
/** Painted asphalt width. */
export const ROAD_WIDTH = 46;
/** Canonical drive-world gold (completed road, done nodes, barricade board). */
export const GOLD = "#FBBF24";

/** Serpentine lane offsets, cycled every 8 nodes. Multiplied by `laneW`. */
export const LANE_PATTERN = [0, 1, 2, 1, 0, -1, -2, -1] as const;
/** Lane amplitude as a fraction of container width. */
export const LANE_W_FACTOR = 0.15;

/** Bezier samples per road segment (for car placement + gold partial path). */
export const SAMPLES_PER_SEGMENT = 12;

/** SECTION·UNIT banner gradient (web `--success` family, green). */
export const SECTION_GRADIENT = ["#22C55E", "#16A34A"] as const;

export interface RoadPalette {
  asphaltEdge: string;
  asphaltSurface: string;
  centerDash: string;
  nodeLocked: string;
  nodeUpcoming: string;
  barricadeStripe: string;
  cone: string;
}

/** Mode-aware road colours, transcribed from `_RoadPainter`. */
export const ROAD_LIGHT: RoadPalette = {
  asphaltEdge: "#B0B5C0",
  asphaltSurface: "#D5D9E2",
  centerDash: "rgba(74, 80, 104, 0.32)",
  nodeLocked: "#B6BECC",
  nodeUpcoming: "#CBD3E0",
  barricadeStripe: "#1F2937",
  cone: "#F97316",
};

export const ROAD_DARK: RoadPalette = {
  asphaltEdge: "#3d4555",
  asphaltSurface: "#2a3040",
  centerDash: "rgba(255, 255, 255, 0.14)",
  nodeLocked: "#262c3a",
  nodeUpcoming: "#3a4358",
  barricadeStripe: "#1F2937",
  cone: "#F97316",
};

export interface SkyPalette {
  sky: [string, string];
  /** Back + front rolling-hill layers. */
  hills: [string, string];
  /** night = moon + stars; dawn/dusk = low sun + birds; day = clouds + sun. */
  phase: "night" | "dawn" | "day" | "dusk";
}

/**
 * Time-of-day + theme → backdrop palette.
 * night = h<5 || h>=21 (moon + stars); dawn = 5≤h<9 (early-morning sun +
 * birds); dusk = 17≤h<21 (setting sun + birds); else day. In dark mode a
 * daytime sky is swapped for a deep teal so the near-black canvas is preserved.
 */
export function skyPalette(hour: number, isDark: boolean): SkyPalette {
  const night = hour < 5 || hour >= 21;
  const dawn = hour >= 5 && hour < 9;
  const dusk = hour >= 17 && hour < 21;
  const hills: [string, string] =
    isDark || night ? ["#16324A", "#1E4258"] : ["#9BD6A0", "#7BC48A"];
  if (night) return { sky: ["#0B1026", "#141B3A"], hills, phase: "night" };
  if (dawn) return { sky: ["#AFC4E6", "#FFD4A8"], hills, phase: "dawn" };
  if (dusk) return { sky: ["#3A2E5A", "#D97A55"], hills, phase: "dusk" };
  if (isDark) return { sky: ["#10233A", "#17324D"], hills, phase: "day" };
  return { sky: ["#7EC8E3", "#BFE3F0"], hills, phase: "day" };
}

/** Deterministic mulberry32 PRNG — stable roadside prop / star placement. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
