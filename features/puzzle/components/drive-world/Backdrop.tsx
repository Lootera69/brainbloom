"use client";

import { useMemo } from "react";
import { seededRng, skyPalette, type SkyPalette } from "./constants";

interface Props {
  /** Container scrollTop, drives vertical parallax drift. */
  scrollY: number;
  /** Visible viewport height of the scroll container. */
  viewH: number;
  isDark: boolean;
  /** 0–23, defaults to the client clock. */
  hour: number;
}

/** Three stacked tiles + modulo offset = seamless vertical parallax. */
function ParallaxLayer({
  factor,
  scrollY,
  viewH,
  children,
}: {
  factor: number;
  scrollY: number;
  viewH: number;
  children: React.ReactNode;
}) {
  const h = Math.max(1, viewH);
  const offset = ((scrollY * factor) % h) - h;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div style={{ transform: `translateY(${offset}px)`, willChange: "transform" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute left-0 w-full" style={{ top: i * h, height: h }}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

function StarField({ viewH }: { viewH: number }) {
  const stars = useMemo(() => {
    const rng = seededRng(11);
    return Array.from({ length: 40 }, () => ({
      left: rng() * 100,
      top: rng() * Math.max(1, viewH),
      r: 0.6 + rng() * 1.4,
      delay: rng() * 3,
      dur: 2 + rng() * 3,
    }));
  }, [viewH]);
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="dw-star absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: s.top,
            width: s.r * 2,
            height: s.r * 2,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </>
  );
}

function CloudField({ viewH }: { viewH: number }) {
  const clouds = useMemo(() => {
    const rng = seededRng(5);
    return Array.from({ length: 6 }, () => ({
      left: rng() * 90,
      top: rng() * Math.max(1, viewH) * 0.7,
      scale: 0.7 + rng() * 0.8,
      dur: 26 + rng() * 22,
      delay: -rng() * 20,
    }));
  }, [viewH]);
  return (
    <>
      {clouds.map((c, i) => (
        <div
          key={i}
          className="dw-cloud absolute"
          style={{
            left: `${c.left}%`,
            top: c.top,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <div className="relative h-5 w-16" style={{ transform: `scale(${c.scale})` }}>
            <span className="absolute left-0 top-1 size-8 rounded-full bg-white/55" />
            <span className="absolute left-5 top-0 size-10 rounded-full bg-white/55" />
            <span className="absolute left-11 top-1.5 size-7 rounded-full bg-white/55" />
          </div>
        </div>
      ))}
    </>
  );
}

function Hills({ pal, viewH }: { pal: SkyPalette; viewH: number }) {
  const baseBack = viewH * 0.62;
  const baseFront = viewH * 0.72;
  const path = (base: number, amp: number) =>
    `M0 ${base} C 120 ${base - amp}, 240 ${base + amp}, 360 ${base} ` +
    `S 600 ${base - amp}, 840 ${base} S 1080 ${base + amp}, 1200 ${base} ` +
    `L1200 ${viewH} L0 ${viewH} Z`;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 1200 ${Math.max(1, viewH)}`}
      preserveAspectRatio="none"
    >
      <path d={path(baseBack, 26)} fill={pal.hills[0]} opacity="0.85" />
      <path d={path(baseFront, 32)} fill={pal.hills[1]} opacity="0.85" />
    </svg>
  );
}

export function Backdrop({ scrollY, viewH, isDark, hour }: Props) {
  const pal = skyPalette(hour, isDark);
  return (
    <div
      className="pointer-events-none sticky top-0 z-0 w-full overflow-hidden"
      style={{
        height: viewH,
        marginBottom: -viewH,
        background: `linear-gradient(to bottom, ${pal.sky[0]}, ${pal.sky[1]})`,
      }}
    >
      {pal.phase === "night" && (
        <ParallaxLayer factor={0.15} scrollY={scrollY} viewH={viewH}>
          <StarField viewH={viewH} />
        </ParallaxLayer>
      )}
      {pal.phase === "day" && (
        <ParallaxLayer factor={0.25} scrollY={scrollY} viewH={viewH}>
          <CloudField viewH={viewH} />
        </ParallaxLayer>
      )}
      <ParallaxLayer factor={0.4} scrollY={scrollY} viewH={viewH}>
        <Hills pal={pal} viewH={viewH} />
      </ParallaxLayer>
    </div>
  );
}
