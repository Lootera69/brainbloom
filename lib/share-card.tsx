"use client";

import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { getAvatarById } from "@/components/avatars/avatar-svgs";

export interface ShareCardData {
  displayName: string;
  avatarId: string | null;
  level: number;
  xp: number;
  streak: number;
  puzzlesCompleted: number;
  achievements: number;
  tier: "free" | "premium";
  theme: "light" | "dark" | "system";
}

export const SHARE_CARD_SIZE = 1080;

const cx = SHARE_CARD_SIZE / 2;

const avatarCY = 240;
const avatarR = 88;
const ringR = 100;
const ringThickness = 5;

const statsTileW = 474;
const statsTileH = 158;
const statsGap = 26;
const statsStartX = (SHARE_CARD_SIZE - statsTileW * 2 - statsGap) / 2;
const statsRow0Y = 500;
const statsRow1Y = statsRow0Y + statsTileH + statsGap;

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function getInitial(name: string): string {
  const initial = name.trim().slice(0, 1).toUpperCase();
  return initial || "B";
}

function getRankTitle(level: number): string {
  if (level >= 41) return "GRANDMASTER";
  if (level >= 31) return "LEGEND";
  if (level >= 21) return "MASTER";
  if (level >= 16) return "SAGE";
  if (level >= 11) return "SCHOLAR";
  if (level >= 6) return "THINKER";
  return "BEGINNER";
}

function getTagline(data: ShareCardData): string {
  const { streak, puzzlesCompleted, achievements, level, xp } = data;
  if (xp === 0 && streak === 0 && puzzlesCompleted === 0) return "My brain training journey starts now!";
  if (streak >= 30) return `${streak}-day streak \u2014 absolute legend! \uD83D\uDD25`;
  if (streak >= 14) return `${streak} days strong \u2014 unstoppable! \uD83D\uDCAA`;
  if (streak >= 7) return `${streak}-day streak and counting! \uD83D\uDCAA`;
  if (puzzlesCompleted >= 100) return `${puzzlesCompleted} puzzles conquered! \uD83E\uDDE9`;
  if (achievements >= 10) return `${achievements} achievements unlocked! \uD83C\uDFC6`;
  if (level >= 20) return `Level ${level} brain trainer! \uD83E\uDDE0`;
  return "Training my brain every day \uD83E\uDDE0";
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: unknown,
  x: number,
  y: number,
  opts: {
    font?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    maxWidth?: number;
  } = {},
): void {
  const { font = "400 24px Inter, system-ui", color = "#f4f2f8", align = "left", baseline = "alphabetic", maxWidth } = opts;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const safe = String(text ?? "");
  const width = typeof maxWidth === "number" && Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : undefined;
  if (width) {
    ctx.fillText(safe, x, y, width);
  } else {
    ctx.fillText(safe, x, y);
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStatTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
  emoji: string,
  accentR: number,
  accentG: number,
  accentB: number,
): void {
  const r = 22;

  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const sheenX = x + w - 80;
  const sheenY = y - 20;
  const sheen = ctx.createRadialGradient(sheenX, sheenY, 0, sheenX, sheenY, 140);
  sheen.addColorStop(0, `rgba(${accentR},${accentG},${accentB},0.07)`);
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);

  const iconCX = x + 56;
  const iconCY = y + h / 2;
  const iconR = 30;

  ctx.beginPath();
  ctx.arc(iconCX, iconCY, iconR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${accentR},${accentG},${accentB},0.12)`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(iconCX, iconCY, iconR + 20, 0, Math.PI * 2);
  const iconGlow = ctx.createRadialGradient(iconCX, iconCY, iconR, iconCX, iconCY, iconR + 20);
  iconGlow.addColorStop(0, `rgba(${accentR},${accentG},${accentB},0.07)`);
  iconGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = iconGlow;
  ctx.fill();

  drawText(ctx, emoji, iconCX, iconCY, {
    font: "36px Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji",
    color: `rgb(${accentR},${accentG},${accentB})`,
    align: "center",
    baseline: "middle",
  });

  drawText(ctx, value, x + 108, y + h / 2 + 20, {
    font: "700 54px Inter, system-ui",
    color: "#f4f2f8",
    align: "left",
    baseline: "middle",
    maxWidth: w - 132,
  });

  drawText(ctx, label, x + 108, y + h / 2 + 48, {
    font: "600 17px Inter, system-ui",
    color: "rgba(244,242,248,0.42)",
    align: "left",
    baseline: "alphabetic",
  });
}

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  c1: string,
  c2: string,
): void {
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  const clamped = Math.min(Math.max(progress, 0), 1);
  if (clamped > 0) {
    const pw = Math.max(h, w * clamped);
    drawRoundedRect(ctx, x, y, pw, h, h / 2);
    const grad = ctx.createLinearGradient(x, y, x + pw, y);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawProgressRing(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  thickness: number,
  progress: number,
  c1: string,
  c2: string,
): void {
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = thickness;
  ctx.stroke();

  const clamped = Math.min(Math.max(progress, 0), 0.999);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + clamped * Math.PI * 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  const grad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.strokeStyle = grad;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.stroke();
}

async function renderAvatarToImage(
  avatarId: string,
  renderSize: number,
): Promise<HTMLImageElement | null> {
  const avatar = getAvatarById(avatarId);
  if (!avatar?.component) return null;

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden";
  document.body.appendChild(container);

  try {
    const root = createRoot(container);
    flushSync(() => {
      root.render(React.createElement(avatar.component, { size: renderSize }));
    });

    const svgEl = container.querySelector("svg");
    if (!svgEl) return null;

    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    URL.revokeObjectURL(url);

    if (!img.complete || img.naturalWidth === 0) return null;
    return img;
  } finally {
    container.remove();
  }
}

function dataURLToBlob(dataURL: string): Blob {
  const commaIndex = dataURL.indexOf(",");
  const header = commaIndex >= 0 ? dataURL.slice(0, commaIndex) : "";
  const payload = commaIndex >= 0 ? dataURL.slice(commaIndex + 1) : dataURL;
  const mimeMatch = /^data:(.*?)(;base64)?$/i.exec(header);
  const mime = mimeMatch?.[1] || "image/png";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function exportCanvasAsBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (blob && blob.size > 0) return blob;
  } catch {
    // fall through
  }
  try {
    const dataURL = canvas.toDataURL("image/png");
    const blob = dataURLToBlob(dataURL);
    if (blob.size > 0) return blob;
  } catch {
    // fall through
  }
  throw new Error("Share card image generation failed");
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const size = SHARE_CARD_SIZE;

  try {
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]);
  } catch {
    // Font readiness is non-fatal
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const displayName = safeText(data.displayName, "Player");
  const level = safeNumber(data.level, 1);
  const xp = safeNumber(data.xp, 0);
  const streak = safeNumber(data.streak, 0);
  const puzzlesCompleted = safeNumber(data.puzzlesCompleted, 0);
  const achievements = safeNumber(data.achievements, 0);
  const tier = data.tier === "premium" ? "premium" : "free";
  const isStart = xp === 0 && streak === 0 && puzzlesCompleted === 0;

  const isPremium = tier === "premium";
  const accentC1 = isPremium ? "#fbbf24" : "#818cf8";
  const accentC2 = isPremium ? "#f59e0b" : "#6366f1";

  try {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#1a1040");
    grad.addColorStop(0.25, "#130e2e");
    grad.addColorStop(0.5, "#0f0c29");
    grad.addColorStop(0.75, "#15102e");
    grad.addColorStop(1, "#1a1040");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const orb1 = ctx.createRadialGradient(size * 0.08, size * 0.12, 0, size * 0.08, size * 0.12, size * 0.7);
    orb1.addColorStop(0, "rgba(99, 102, 241, 0.18)");
    orb1.addColorStop(0.5, "rgba(99, 102, 241, 0.06)");
    orb1.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, size, size);

    const orb2 = ctx.createRadialGradient(size * 0.92, size * 0.88, 0, size * 0.92, size * 0.88, size * 0.55);
    orb2.addColorStop(0, isPremium ? "rgba(245, 158, 11, 0.12)" : "rgba(139, 92, 246, 0.12)");
    orb2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, size, size);

    const orb3 = ctx.createRadialGradient(size * 0.5, size * 0.55, 0, size * 0.5, size * 0.55, size * 0.5);
    orb3.addColorStop(0, isPremium ? "rgba(251, 191, 36, 0.06)" : "rgba(167, 139, 250, 0.06)");
    orb3.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orb3;
    ctx.fillRect(0, 0, size, size);

    const orb4 = ctx.createRadialGradient(size * 0.3, size * 0.9, 0, size * 0.3, size * 0.9, size * 0.4);
    orb4.addColorStop(0, "rgba(236, 72, 153, 0.06)");
    orb4.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orb4;
    ctx.fillRect(0, 0, size, size);

    const sweep = ctx.createLinearGradient(0, 0, size, size);
    sweep.addColorStop(0, "rgba(255,255,255,0.015)");
    sweep.addColorStop(0.4, "rgba(255,255,255,0.03)");
    sweep.addColorStop(0.6, "rgba(255,255,255,0.015)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 50; i++) {
      const sx = 40 + Math.random() * (size - 80);
      const sy = 40 + Math.random() * (size - 80);
      const sr = 0.4 + Math.random() * 1.6;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.12})`;
      ctx.fill();
    }

    const vignette = ctx.createRadialGradient(cx, size / 2, size * 0.25, cx, size / 2, size * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    drawText(ctx, "\uD83E\uDDE0 BrainBloom", cx, 56, {
      font: "700 26px Inter, system-ui",
      color: "rgba(244,242,248,0.55)",
      align: "center",
    });

    const avatarGlow = ctx.createRadialGradient(cx, avatarCY, avatarR * 0.3, cx, avatarCY, avatarR + 30);
    avatarGlow.addColorStop(0, isPremium ? "rgba(251,191,36,0.18)" : "rgba(99,102,241,0.18)");
    avatarGlow.addColorStop(0.6, isPremium ? "rgba(251,191,36,0.06)" : "rgba(99,102,241,0.06)");
    avatarGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = avatarGlow;
    ctx.beginPath();
    ctx.arc(cx, avatarCY, avatarR + 30, 0, Math.PI * 2);
    ctx.fill();

    const avatarImg = data.avatarId ? await renderAvatarToImage(data.avatarId, avatarR * 2) : null;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.clip();

    if (avatarImg) {
      ctx.drawImage(avatarImg, cx - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    } else {
      const avatarBg = ctx.createLinearGradient(cx - avatarR, avatarCY - avatarR, cx + avatarR, avatarCY + avatarR);
      avatarBg.addColorStop(0, isPremium ? "#fbbf24" : "#6366f1");
      avatarBg.addColorStop(0.5, isPremium ? "#f59e0b" : "#818cf8");
      avatarBg.addColorStop(1, isPremium ? "#d97706" : "#8b5cf6");
      ctx.fillStyle = avatarBg;
      ctx.fillRect(cx - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);

      drawText(ctx, getInitial(displayName), cx, avatarCY + 4, {
        font: "700 64px Inter, system-ui",
        color: "#ffffff",
        align: "center",
        baseline: "middle",
      });
    }
    ctx.restore();

    if (isPremium) {
      ctx.save();
      const ringGrad = ctx.createLinearGradient(cx - avatarR, avatarCY - avatarR, cx + avatarR, avatarCY + avatarR);
      ringGrad.addColorStop(0, "#fbbf24");
      ringGrad.addColorStop(0.5, "#f59e0b");
      ringGrad.addColorStop(1, "#d97706");
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(251, 191, 36, 0.45)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, avatarCY, avatarR + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = "rgba(129, 140, 248, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, avatarCY, avatarR + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const xpForNext = level * 100;
    const xpInLevel = xp % xpForNext;
    const levelProgress = xpForNext > 0 ? xpInLevel / xpForNext : 0;

    drawProgressRing(ctx, cx, avatarCY, ringR, ringThickness, levelProgress, accentC1, accentC2);

    drawText(ctx, displayName, cx, 388, {
      font: "700 52px Inter, system-ui",
      color: isPremium ? "#fbbf24" : "#f4f2f8",
      align: "center",
      maxWidth: 620,
    });

    const rankTitle = getRankTitle(level);

    const chipW = 280;
    const chipH = 34;
    const chipX = cx - chipW / 2;
    const chipY = 420;

    drawRoundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();

    if (isPremium) {
      const chipBorderGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY);
      chipBorderGrad.addColorStop(0, "rgba(251,191,36,0.35)");
      chipBorderGrad.addColorStop(0.5, "rgba(245,158,11,0.2)");
      chipBorderGrad.addColorStop(1, "rgba(251,191,36,0.35)");
      ctx.strokeStyle = chipBorderGrad;
    } else {
      ctx.strokeStyle = "rgba(129,140,248,0.2)";
    }
    ctx.lineWidth = 1;
    ctx.stroke();

    drawText(ctx, `LEVEL ${level}  \u00B7  ${rankTitle}`, cx, chipY + 22, {
      font: "600 13px Inter, system-ui",
      color: isPremium ? "#fbbf24" : "rgba(165,180,252,0.8)",
      align: "center",
      baseline: "alphabetic",
    });

    if (!isStart) {
      const remaining = xpForNext - xpInLevel;
      drawText(ctx, `${remaining.toLocaleString()} XP to Level ${level + 1}`, cx, 468, {
        font: "400 16px Inter, system-ui",
        color: "rgba(244,242,248,0.35)",
        align: "center",
      });
    } else {
      drawText(ctx, "Your journey begins here!", cx, 468, {
        font: "400 16px Inter, system-ui",
        color: "rgba(244,242,248,0.35)",
        align: "center",
      });
    }

    const stats = [
      {
        value: xp.toLocaleString(),
        label: "Total XP",
        emoji: "\u26A1",
        r: 99, g: 102, b: 241,
      },
      {
        value: `${streak}`,
        label: "Day Streak",
        emoji: "\uD83D\uDD25",
        r: 245, g: 158, b: 11,
      },
      {
        value: `${puzzlesCompleted}`,
        label: "Puzzles Solved",
        emoji: "\uD83E\uDDE9",
        r: 34, g: 211, b: 238,
      },
      {
        value: `${achievements}`,
        label: "Achievements",
        emoji: "\uD83C\uDFC6",
        r: 34, g: 197, b: 94,
      },
    ];

    stats.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = statsStartX + col * (statsTileW + statsGap);
      const y = row === 0 ? statsRow0Y : statsRow1Y;
      drawStatTile(ctx, x, y, statsTileW, statsTileH, s.value, s.label, s.emoji, s.r, s.g, s.b);
    });

    const tagline = getTagline(data);
    drawText(ctx, tagline, cx, 880, {
      font: "500 18px Inter, system-ui",
      color: "rgba(244,242,248,0.45)",
      align: "center",
    });

    const ctaW = 360;
    const ctaH = 48;
    const ctaX = cx - ctaW / 2;
    const ctaY = 918;

    drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
    ctaGrad.addColorStop(0, isPremium ? "#f59e0b" : "#6366f1");
    ctaGrad.addColorStop(1, isPremium ? "#d97706" : "#8b5cf6");
    ctx.fillStyle = ctaGrad;
    ctx.fill();
    ctx.shadowColor = isPremium ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fillStyle = ctaGrad;
    ctx.fill();
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawText(ctx, "Train your brain with me \u2192", cx, ctaY + 30, {
      font: "600 18px Inter, system-ui",
      color: "#ffffff",
      align: "center",
    });

    drawText(ctx, "brainblooms.vercel.app", cx, size - 44, {
      font: "400 15px Inter, system-ui",
      color: "rgba(244,242,248,0.2)",
      align: "center",
    });

    return await exportCanvasAsBlob(canvas);
  } catch {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0f0c29";
    ctx.fillRect(0, 0, size, size);
    drawText(ctx, "\uD83E\uDDE0 BrainBloom", size / 2, size * 0.3, {
      font: "700 48px system-ui, sans-serif",
      color: "#f4f2f8",
      align: "center",
    });
    drawText(ctx, displayName, size / 2, size * 0.45, {
      font: "700 42px system-ui, sans-serif",
      color: "#f4f2f8",
      align: "center",
    });
    drawText(ctx, `Level ${level}  \u2022  ${xp.toLocaleString()} XP`, size / 2, size * 0.55, {
      font: "400 28px system-ui, sans-serif",
      color: "#a5b4fc",
      align: "center",
    });
    try {
      return await exportCanvasAsBlob(canvas);
    } catch {
      throw new Error("Share card generation failed");
    }
  }
}
