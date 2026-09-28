"use client";

// Event "Moments" — bats roosting from the top rim of the bottom nav (port of
// Flutter `event_hanging_bats.dart`). Only on bat Moments (Batman Day / Halloween).

import { useEffect, useRef } from "react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { lerp, hex, fromArgb, BLACK } from "@/lib/events/event-colors";
import { paintHangingBat } from "@/lib/events/event-bat";

const LOOP_MS = 5000;
const POSITIONS = [0.14, 0.86];
const BAT_SIZE = 26;

export function EventHangingBats() {
  const { event, palette } = useActiveMoment();
  const ref = useRef<HTMLCanvasElement>(null);
  const active = !!event && !!palette && event.particle === "bats";

  useEffect(() => {
    if (!active || !event || !palette) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const color = event.id === "batman_day" ? hex(0x0b0b0f) : lerp(fromArgb(palette.accent), BLACK, 0.35);
    let raf = 0, dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const start = performance.now();
    const frame = (now: number) => {
      const t = ((now - start) % LOOP_MS) / LOOP_MS;
      const W = canvas.width / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, canvas.height / dpr);
      POSITIONS.forEach((pos, i) => {
        const phase = i * 1.7;
        const sway = Math.sin(t * Math.PI * 2 + phase) * 0.1;
        paintHangingBat(ctx, { grip: { x: pos * W, y: 0 }, size: BAT_SIZE, sway, color });
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [active, event, palette]);

  if (!active) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-x-[30px] top-0 z-50 h-[30px]" />;
}
