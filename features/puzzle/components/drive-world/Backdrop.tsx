"use client";

import { useEffect, useMemo, useRef } from "react";
import { seededRng, skyPalette, type SkyPalette } from "./constants";

interface Props {
  /** Live scrollTop ref — drives parallax + cloud velocity without re-renders. */
  scrollRef: { current: number };
  /** Visible viewport height of the scroll container. */
  viewH: number;
  isDark: boolean;
  /** 0–23, defaults to the client clock. */
  hour: number;
}

/** Three stacked tiles + modulo offset = seamless vertical parallax. */
function ParallaxLayer({
  viewH,
  innerRef,
  initialOffset,
  children,
}: {
  viewH: number;
  innerRef: (el: HTMLDivElement | null) => void;
  initialOffset: number;
  children: React.ReactNode;
}) {
  const h = Math.max(1, viewH);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={innerRef}
        style={{ transform: `translateY(${initialOffset}px)`, willChange: "transform" }}
      >
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

// Clouds drift horizontally on their own — alternating directions, calm base
// speed — and pick up a horizontal boost while the player scrolls (decaying
// back to the base drift when scrolling stops). Never move vertically.
function CloudField({ scrollRef, viewH }: { scrollRef: { current: number }; viewH: number }) {
  const clouds = useMemo(() => {
    const rng = seededRng(5);
    return Array.from({ length: 6 }, (_, i) => ({
      y: rng() * Math.max(1, viewH) * 0.7,
      scale: 0.7 + rng() * 0.8,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 7 + rng() * 9,
      x0: rng() * 0.9,
    }));
  }, [viewH]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef<number[]>(clouds.map((c) => c.x0));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    let last = performance.now();
    let prevScroll = scrollRef.current;
    let boost = 0;
    const MARGIN = 140;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sy = scrollRef.current;
      const v = sy - prevScroll;
      prevScroll = sy;
      // Scroll velocity pumps the drift; exponential decay returns to calm.
      boost = boost * 0.9 + Math.abs(v) * 0.4;
      const w = container.clientWidth || 1;
      for (let i = 0; i < clouds.length; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;
        const c = clouds[i];
        let x = posRef.current[i] * w + (c.speed + boost) * c.dir * dt;
        if (x > w + MARGIN) x = -MARGIN;
        else if (x < -MARGIN) x = w + MARGIN;
        posRef.current[i] = x / w;
        el.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clouds, scrollRef]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {clouds.map((c, i) => (
        <div
          key={i}
          ref={(el) => { nodeRefs.current[i] = el; }}
          className="absolute"
          style={{ left: 0, top: c.y }}
        >
          <div className="relative h-5 w-16" style={{ transform: `scale(${c.scale})` }}>
            <span className="absolute left-0 top-1 size-8 rounded-full bg-white/55" />
            <span className="absolute left-5 top-0 size-10 rounded-full bg-white/55" />
            <span className="absolute left-11 top-1.5 size-7 rounded-full bg-white/55" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Rolling hills pinned to the ground — mirrors Flutter `_hills`: the base sits
// at a fixed fraction of the viewport height and the path closes to the
// bottom, so the land never scrolls away. Scrolling only slides the sine-wave
// phase sideways (`shift = scrollY * 0.4`, front layer 1.25x), exactly like
// `hillShift = -cameraY * 0.4` in `drive_world.dart`. Path `d` is rewritten
// imperatively by the parallax rig so scrolling never re-renders React.
function hillPath(base: number, amp: number, shift: number, h: number): string {
  let d = `M0 ${h} L0 ${base - amp * Math.sin((shift / 600) * Math.PI)}`;
  for (let x = 8; x <= 1200; x += 8) {
    d += ` L${x} ${base - amp * Math.sin(((x + shift) / 600) * Math.PI)}`;
  }
  return d + ` L1200 ${h} Z`;
}

function Hills({
  pal,
  viewH,
  scroll0,
  backRef,
  frontRef,
}: {
  pal: SkyPalette;
  viewH: number;
  scroll0: number;
  backRef: (el: SVGPathElement | null) => void;
  frontRef: (el: SVGPathElement | null) => void;
}) {
  const h = Math.max(1, viewH);
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 1200 ${h}`}
      preserveAspectRatio="none"
    >
      <path
        ref={backRef}
        d={hillPath(h * 0.62, 26, scroll0 * 0.4, h)}
        fill={pal.hills[0]}
        opacity="0.85"
      />
      <path
        ref={frontRef}
        d={hillPath(h * 0.72, 32, scroll0 * 0.5, h)}
        fill={pal.hills[1]}
        opacity="0.85"
      />
    </svg>
  );
}

// Sun / moon — position + colour follow the sky phase. Hills render after
// this layer, so the dusk sun sits partially behind the ridge (setting).
function Celestial({ phase }: { phase: SkyPalette["phase"] }) {
  if (phase === "night") {
    return (
      <div className="absolute left-[14%] top-[9%] size-10">
        <div className="absolute inset-0 rounded-full bg-[#EEF2F8] shadow-[0_0_44px_14px_rgba(230,238,250,0.22)]" />
        <div className="absolute -right-1.5 -top-1.5 size-9 rounded-full bg-[#0B1026]" />
      </div>
    );
  }
  if (phase === "dawn") {
    return (
      <div
        className="absolute left-[12%] top-[40%] size-14 rounded-full bg-[#FFCF93]"
        style={{ boxShadow: "0 0 70px 28px rgba(255,190,120,0.45)" }}
      />
    );
  }
  if (phase === "dusk") {
    return (
      <div
        className="absolute right-[16%] top-[50%] size-14 rounded-full bg-[#FF9A66]"
        style={{ boxShadow: "0 0 70px 28px rgba(255,140,80,0.5)" }}
      />
    );
  }
  return (
    <div
      className="absolute right-[10%] top-[8%] size-14 rounded-full bg-[#FFE680] sm:size-16"
      style={{ boxShadow: "0 0 76px 30px rgba(255,226,120,0.4)" }}
    />
  );
}

// Silhouette flock — flies across the sky on a slow loop (alternating
// directions) with a gentle bob. Dawn + dusk only; hidden under
// prefers-reduced-motion (decorative).
function BirdFlock({ phase }: { phase: SkyPalette["phase"] }) {
  if (phase !== "dawn" && phase !== "dusk") return null;
  const birds = [
    { top: "13%", left: "26%", dur: 34, delay: 0, bdur: 2.6, rev: false, w: 26 },
    { top: "19%", left: "62%", dur: 42, delay: -14, bdur: 3.2, rev: true, w: 21 },
    { top: "25%", left: "44%", dur: 30, delay: -7, bdur: 2.2, rev: false, w: 18 },
  ];
  return (
    <>
      {birds.map((b, i) => (
        <div
          key={i}
          className={`absolute inset-x-0 ${b.rev ? "dw-bird-rev" : "dw-bird"}`}
          style={
            {
              top: b.top,
              "--dur": `${b.dur}s`,
              "--delay": `${b.delay}s`,
            } as React.CSSProperties
          }
        >
          <div
            className="dw-bob"
            style={{ marginLeft: b.left, "--bdur": `${b.bdur}s` } as React.CSSProperties}
          >
            <svg width={b.w} height={b.w * 0.42} viewBox="0 0 26 11" fill="none" aria-hidden>
              <path
                d="M1 8 Q7 0.5 13 6.5 Q19 0.5 25 8"
                stroke="rgba(24,20,40,0.55)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      ))}
    </>
  );
}

export function Backdrop({ scrollRef, viewH, isDark, hour }: Props) {
  const pal = skyPalette(hour, isDark);
  const starsInnerRef = useRef<HTMLDivElement | null>(null);
  const hillBackRef = useRef<SVGPathElement | null>(null);
  const hillFrontRef = useRef<SVGPathElement | null>(null);
  const scroll0 = scrollRef.current;

  // Parallax rig: reads the scroll ref once per frame and writes transforms /
  // path data straight to the DOM — stars + hills track scrolling without a
  // single React re-render, so the glide stays at full frame rate.
  useEffect(() => {
    let raf = 0;
    let lastY = NaN;
    let lastH = 0;
    const tick = () => {
      const y = scrollRef.current;
      const h = Math.max(1, viewH);
      if (y !== lastY || h !== lastH) {
        lastY = y;
        lastH = h;
        if (pal.phase === "night" && starsInnerRef.current) {
          starsInnerRef.current.style.transform = `translateY(${((y * 0.15) % h) - h}px)`;
        }
        hillBackRef.current?.setAttribute("d", hillPath(h * 0.62, 26, y * 0.4, h));
        hillFrontRef.current?.setAttribute("d", hillPath(h * 0.72, 32, y * 0.5, h));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollRef, viewH, pal.phase]);

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
        <ParallaxLayer
          viewH={viewH}
          innerRef={(el) => {
            starsInnerRef.current = el;
          }}
          initialOffset={((scroll0 * 0.15) % Math.max(1, viewH)) - Math.max(1, viewH)}
        >
          <StarField viewH={viewH} />
        </ParallaxLayer>
      )}
      {pal.phase === "day" && <CloudField scrollRef={scrollRef} viewH={viewH} />}
      <Celestial phase={pal.phase} />
      <BirdFlock phase={pal.phase} />
      <Hills
        pal={pal}
        viewH={viewH}
        scroll0={scroll0}
        backRef={(el) => {
          hillBackRef.current = el;
        }}
        frontRef={(el) => {
          hillFrontRef.current = el;
        }}
      />
    </div>
  );
}
