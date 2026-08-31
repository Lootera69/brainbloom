"use client";

import { useEffect, useRef } from "react";
import { HandDrawn, HandDrawnRates } from "./hand-drawn";
import { CrayonPen } from "./crayon-pen";
import { crayonAvatarSpecs, kCrayonOwl } from "./crayon-specs";
import type { CrayonAvatarSpec } from "./crayon-pen";

interface CrayonAvatarProps {
  spec?: CrayonAvatarSpec;
  avatarId?: string | null;
  size?: number;
  boil?: boolean;
  gaze?: { x: number; y: number };
  seedSalt?: number;
  eyeOpen?: number;
  limb?: number;
  className?: string;
}

const DESIGN_BOX = 100;

export function CrayonAvatar({
  spec,
  avatarId,
  size = 96,
  boil = true,
  gaze = { x: 0, y: 0 },
  seedSalt = 0,
  eyeOpen = 1,
  limb = 0,
  className,
}: CrayonAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolvedSpec = spec ?? (avatarId ? crayonAvatarSpecs[avatarId] : undefined) ?? kCrayonOwl;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldBoil = boil && !reduceMotion && size >= 56;

    const seed = HandDrawn.seedOf(`crayon/${resolvedSpec.id}/${seedSalt}`);
    const unit = size / DESIGN_BOX;
    const center = { x: size / 2, y: size / 2 };

    let raf = 0;
    let prevStep = -1;
    const start = performance.now();

    const draw = (step: number) => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      // Center the design box (square, so no extra translate needed)
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(HandDrawn.signedNoise(seed, 0, 11) * 0.032);
      ctx.translate(-center.x, -center.y);
      const jitter = HandDrawn.jitter(seed, step, { translate: unit * 0.55, degrees: 0.5 });
      jitter.apply(ctx, center);
      const pen = new CrayonPen(ctx, unit, step, seed, resolvedSpec.palette, gaze, eyeOpen, limb);
      resolvedSpec.draw(pen);
      ctx.restore();
      ctx.restore();
    };

    if (!shouldBoil) {
      draw(0);
      return;
    }

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const step = HandDrawn.step(elapsed, HandDrawnRates.animal);
      if (step !== prevStep) {
        prevStep = step;
        // scale context already has dpr, but draw uses logical pixels with unit based on size
        // Need to reset transform for each draw? We already setTransform(dpr...). Keep.
        draw(step);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // initial draw
    draw(0);
    return () => cancelAnimationFrame(raf);
  }, [resolvedSpec, size, boil, gaze, seedSalt, eyeOpen, limb]);

  return <canvas ref={canvasRef} width={size} height={size} className={className} style={{ width: size, height: size, display: "block" }} />;
}

export function getCrayonSpec(id: string): CrayonAvatarSpec | undefined {
  return crayonAvatarSpecs[id];
}

export { crayonAvatarSpecs };
