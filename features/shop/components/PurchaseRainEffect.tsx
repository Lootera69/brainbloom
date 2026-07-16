"use client";

import { useEffect, useRef } from "react";

type RainType = "gems" | "hearts" | "snowflakes";

interface Props {
  active: boolean;
  type: RainType;
  amount?: number;
  duration?: number;
}

const GEM_COLORS = ["#22d3ee", "#06b6d4", "#0e7490", "#67e8f9", "#0891b2", "#2dd4bf"];
const HEART_COLORS = ["#fb7185", "#f43f5e", "#e11d48", "#fda4af", "#f9a8d4", "#ec4899"];
const SNOW_COLORS = ["#60a5fa", "#93c5fd", "#38bdf8", "#7dd3fc", "#818cf8", "#a5b4fc"];

const TINT_FADE_IN = 1000;

function tintColor(type: RainType): string {
  switch (type) {
    case "gems": return "#22d3ee";
    case "hearts": return "#fb7185";
    case "snowflakes": return "#60a5fa";
  }
}

interface Particle {
  x: number; y: number; size: number; color: string;
  speedX: number; speedY: number; rotation: number; rotationSpeed: number;
  sparkle: number; opacity: number; glowSize: number;
}

function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rotation: number, sparkle: number, opacity: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;

  const half = size / 2;

  // Outer glow
  ctx.beginPath();
  ctx.moveTo(0, -half - 2);
  ctx.lineTo(half + 2, 0);
  ctx.lineTo(0, half + 2);
  ctx.lineTo(-half - 2, 0);
  ctx.closePath();
  ctx.fillStyle = color + "30";
  ctx.fill();

  // Diamond
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(half, 0);
  ctx.lineTo(0, half);
  ctx.lineTo(-half, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Top facet
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(half, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();

  // Left facet
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(-half, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();

  // Sparkle
  if (sparkle > 0.5) {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
    // Cross sparkle
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0); ctx.lineTo(size * 0.3, 0);
    ctx.moveTo(0, -size * 0.3); ctx.lineTo(0, size * 0.3);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rotation: number, sparkle: number, opacity: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;

  const s = size * 0.45;

  // Glow
  ctx.beginPath();
  const glowGrad = ctx.createRadialGradient(0, s * 0.1, 0, 0, s * 0.1, s * 1.4);
  glowGrad.addColorStop(0, color + "30");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.arc(0, s * 0.1, s * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Heart shape
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.35, -s * 1.1, s * 0.05, 0, s * 0.85);
  ctx.bezierCurveTo(s * 1.1, s * 0.05, s * 0.6, -s * 0.35, 0, s * 0.35);
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, -s * 0.1, 0, 0, 0, s);
  grad.addColorStop(0, "#fecdd3");
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, color + "cc");
  ctx.fillStyle = grad;
  ctx.fill();

  // Highlight
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, -s * 0.1, s * 0.18, s * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  // Sparkle
  if (sparkle > 0.5) {
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.2, size * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
  }

  ctx.restore();
}

function drawSnowflake(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rotation: number, _sparkle: number, opacity: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;

  const r = size * 0.45;

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
  glow.addColorStop(0, color + "25");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.07);
  ctx.lineCap = "round";

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const tipX = Math.sin(angle) * r;
    const tipY = Math.cos(angle) * r;

    // Main arm
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Branch 1
    const ba1 = angle + Math.PI / 5;
    ctx.beginPath();
    ctx.moveTo(tipX * 0.6, tipY * 0.6);
    ctx.lineTo(tipX * 0.6 + Math.sin(ba1) * r * 0.3, tipY * 0.6 + Math.cos(ba1) * r * 0.3);
    ctx.stroke();

    // Branch 2
    const ba2 = angle - Math.PI / 5;
    ctx.beginPath();
    ctx.moveTo(tipX * 0.6, tipY * 0.6);
    ctx.lineTo(tipX * 0.6 + Math.sin(ba2) * r * 0.3, tipY * 0.6 + Math.cos(ba2) * r * 0.3);
    ctx.stroke();

    // Tip dot
    ctx.beginPath();
    ctx.arc(tipX, tipY, size * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

const drawMap = { gems: drawGem, hearts: drawHeart, snowflakes: drawSnowflake };
const colorMap = { gems: GEM_COLORS, hearts: HEART_COLORS, snowflakes: SNOW_COLORS };

export function PurchaseRainEffect({ active, type, amount = 0, duration = 2800 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let count: number;
    switch (type) {
      case "gems": count = amount >= 1000 ? 100 : amount >= 500 ? 60 : 30; break;
      case "hearts": count = 45; break;
      case "snowflakes": count = 40; break;
      default: count = 30;
    }

    const colors = colorMap[type];
    const draw = drawMap[type];
    const tint = tintColor(type);

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: -40 - Math.random() * 150,
      size: Math.random() * (type === "snowflakes" ? 14 : 11) + (type === "snowflakes" ? 8 : 5),
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: (Math.random() - 0.5) * (type === "snowflakes" ? 1.5 : 3),
      speedY: Math.random() * (type === "snowflakes" ? 2 : 3.5) + (type === "snowflakes" ? 0.8 : 1.5),
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * (type === "snowflakes" ? 3 : 8),
      sparkle: Math.random() * 0.6 + 0.2,
      opacity: 1,
      glowSize: Math.random() * 20 + 10,
    }));

    // Sparkle bursts
    const sparkles: { x: number; y: number; size: number; life: number; maxLife: number }[] = [];

    let startTime: number | null = null;
    let raf: number;

    function animate(time: number) {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      if (elapsed > duration) {
        particles.forEach((p) => (p.opacity -= 0.025));
        if (particles.every((p) => p.opacity <= 0)) {
          cancelAnimationFrame(raf);
          return;
        }
      }

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Smooth tint wash — fades in over 1s, holds, fades out after duration
      let tintAlpha: number;
      const fadeDuration = Math.min(duration * 0.15, 500);
      if (elapsed < TINT_FADE_IN) {
        tintAlpha = (elapsed / TINT_FADE_IN) * 0.09;
      } else if (elapsed > duration) {
        const fadeOut = (elapsed - duration) / fadeDuration;
        tintAlpha = Math.max(0, 0.09 * (1 - fadeOut));
      } else {
        tintAlpha = 0.09;
      }
      if (tintAlpha > 0.001) {
        ctx!.save();
        ctx!.globalAlpha = tintAlpha;
        ctx!.fillStyle = tint;
        ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
        ctx!.restore();
      }

      // Spawn occasional sparkle bursts
      if (Math.random() < 0.08 && sparkles.length < 8) {
        sparkles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height * 0.4,
          size: Math.random() * 3 + 1.5,
          life: 0,
          maxLife: 30 + Math.random() * 20,
        });
      }

      // Draw sparkle bursts
      sparkles.forEach((s, idx) => {
        s.life++;
        const progress = s.life / s.maxLife;
        const alpha = 1 - progress;

        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size * (1 + progress * 2), 0, Math.PI * 2);
        ctx!.fillStyle = colors[0] + "80";
        ctx!.fill();

        ctx!.beginPath();
        ctx!.moveTo(s.x - s.size * 3, s.y);
        ctx!.lineTo(s.x + s.size * 3, s.y);
        ctx!.moveTo(s.x, s.y - s.size * 3);
        ctx!.lineTo(s.x, s.y + s.size * 3);
        ctx!.strokeStyle = colors[0] + "60";
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.restore();

        if (s.life >= s.maxLife) sparkles.splice(idx, 1);
      });

      // Draw & update particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += type === "snowflakes" ? 0.015 : 0.04;
        p.rotation += p.rotationSpeed;

        draw(ctx!, p.x, p.y, p.size, p.color, p.rotation, p.sparkle, Math.max(0, p.opacity));
      });

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);
    rafRef.current = raf;
    return () => {
      cancelAnimationFrame(raf);
      if (rafRef.current === raf) rafRef.current = undefined;
    };
  }, [active, type, amount, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[200]"
    />
  );
}
