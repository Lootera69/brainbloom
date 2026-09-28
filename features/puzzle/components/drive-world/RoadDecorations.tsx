"use client";

import { useMemo } from "react";
import { ROAD_WIDTH, seededRng } from "./constants";
import { roadXAtY, type Pt } from "./geometry";

interface Props {
  centers: Pt[];
  samples: Pt[];
  isDark: boolean;
  /** Segment indices (between node i and i+1) that show a roadworks scene. */
  construction: Set<number>;
}

/** A leafy tree with trunk. */
function Tree() {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden>
      <ellipse cx="17" cy="37" rx="12" ry="3" fill="#000" opacity="0.18" />
      <rect x="15" y="24" width="4" height="12" rx="1.5" fill="#6B4A2B" />
      <circle cx="17" cy="16" r="13" fill="#3E9B57" />
      <circle cx="9" cy="20" r="8" fill="#48A863" />
      <circle cx="25" cy="20" r="8" fill="#34864A" />
    </svg>
  );
}

/** Fuel station pump + canopy. */
function FuelStation() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <ellipse cx="20" cy="37" rx="16" ry="3" fill="#000" opacity="0.18" />
      <rect x="4" y="6" width="32" height="7" rx="2" fill="#E11D48" />
      <rect x="7" y="13" width="3" height="24" fill="#9CA3AF" />
      <rect x="30" y="13" width="3" height="24" fill="#9CA3AF" />
      <rect x="14" y="18" width="12" height="19" rx="2" fill="#334155" />
      <rect x="16" y="21" width="8" height="5" rx="1" fill="#FBBF24" />
    </svg>
  );
}

/** Roadside sign post. */
function SignPost() {
  return (
    <svg width="26" height="40" viewBox="0 0 26 40" aria-hidden>
      <ellipse cx="13" cy="37" rx="9" ry="2.5" fill="#000" opacity="0.18" />
      <rect x="11" y="14" width="3" height="23" fill="#64748B" />
      <rect x="2" y="5" width="22" height="12" rx="2" fill="#2563EB" />
      <rect x="5" y="9" width="16" height="2" rx="1" fill="#fff" opacity="0.85" />
    </svg>
  );
}

/** Street lamp. */
function StreetLamp() {
  return (
    <svg width="24" height="44" viewBox="0 0 24 44" aria-hidden>
      <ellipse cx="9" cy="41" rx="8" ry="2.5" fill="#000" opacity="0.18" />
      <rect x="7" y="8" width="3" height="33" fill="#475569" />
      <path d="M8 8 q0 -6 8 -6" stroke="#475569" strokeWidth="3" fill="none" />
      <circle cx="17" cy="3" r="4" fill="#FDE68A" />
      <circle cx="17" cy="3" r="7" fill="#FDE68A" opacity="0.25" />
    </svg>
  );
}

/** Small roadside building (rest stop / diner). */
function Hut({ color }: { color: string }) {
  return (
    <svg width="42" height="38" viewBox="0 0 42 38" aria-hidden>
      <ellipse cx="21" cy="35" rx="18" ry="3" fill="#000" opacity="0.18" />
      <rect x="6" y="16" width="30" height="19" rx="2" fill={color} />
      <path d="M3 16 L21 4 L39 16 Z" fill="#7F1D1D" />
      <rect x="17" y="24" width="8" height="11" rx="1" fill="#1E293B" />
      <rect x="9" y="20" width="6" height="6" rx="1" fill="#FDE68A" />
      <rect x="27" y="20" width="6" height="6" rx="1" fill="#FDE68A" />
    </svg>
  );
}

/** Bench. */
function Bench() {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" aria-hidden>
      <ellipse cx="15" cy="22" rx="12" ry="2.5" fill="#000" opacity="0.18" />
      <rect x="4" y="8" width="22" height="4" rx="1.5" fill="#8B5E34" />
      <rect x="4" y="13" width="22" height="4" rx="1.5" fill="#8B5E34" />
      <rect x="6" y="12" width="3" height="9" fill="#5B4226" />
      <rect x="21" y="12" width="3" height="9" fill="#5B4226" />
    </svg>
  );
}

const PROPS = [
  <Tree key="t" />,
  <FuelStation key="f" />,
  <SignPost key="s" />,
  <StreetLamp key="l" />,
  <Hut key="h1" color="#F59E0B" />,
  <Bench key="b" />,
  <Hut key="h2" color="#0EA5E9" />,
  <Tree key="t2" />,
];

/** A striped roadworks barrier with cones + hi-vis worker. */
function Construction({ isDark }: { isDark: boolean }) {
  return (
    <svg width="46" height="40" viewBox="0 0 46 40" aria-hidden>
      <ellipse cx="23" cy="37" rx="20" ry="3" fill="#000" opacity={isDark ? 0.3 : 0.18} />
      <rect x="4" y="14" width="38" height="8" rx="1.5" fill="#FBBF24" />
      <path d="M6 14 l6 8 M14 14 l6 8 M22 14 l6 8 M30 14 l6 8" stroke="#1F2937" strokeWidth="3" />
      <rect x="6" y="22" width="3" height="12" fill="#9CA3AF" />
      <rect x="37" y="22" width="3" height="12" fill="#9CA3AF" />
      <path d="M12 37 l4 -12 l4 12 Z" fill="#F97316" />
      <path d="M28 37 l4 -12 l4 12 Z" fill="#F97316" />
      <circle cx="23" cy="8" r="4" fill="#FDE047" />
      <rect x="20" y="12" width="6" height="9" rx="2" fill="#FDE047" />
    </svg>
  );
}

export function RoadDecorations({ centers, samples, isDark, construction }: Props) {
  const items = useMemo(() => {
    const rng = seededRng(42);
    const out: { x: number; y: number; node: React.ReactNode }[] = [];
    for (let i = 0; i < centers.length - 1; i++) {
      const type = Math.floor(rng() * PROPS.length);
      const side = rng() > 0.5 ? 1 : -1;
      const spread = ROAD_WIDTH / 2 + 30 + rng() * 26;
      const y = (centers[i].y + centers[i + 1].y) / 2;
      const x = roadXAtY(samples, y) + side * spread;
      const isWork = construction.has(i);
      out.push({ x, y, node: isWork ? <Construction isDark={isDark} /> : PROPS[type] });
    }
    return out;
  }, [centers, samples, isDark, construction]);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: it.x, top: it.y, transform: "translate(-50%, -60%)" }}
        >
          {it.node}
        </div>
      ))}
    </div>
  );
}
