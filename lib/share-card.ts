"use client";

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

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
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

function getInitial(name: string): string {
  const initial = name.trim().slice(0, 1).toUpperCase();
  return initial || "B";
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

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  color1: string,
  color2: string,
): void {
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();

  const clamped = Math.min(Math.max(progress, 0), 1);
  if (clamped > 0) {
    const pw = Math.max(h, w * clamped);
    drawRoundedRect(ctx, x, y, pw, h, h / 2);
    const grad = ctx.createLinearGradient(x, y, x + pw, y);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawStatCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
  icon: string,
  bg: string,
  fg: string,
): void {
  drawRoundedRect(ctx, x, y, w, h, 20);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawText(ctx, icon, x + w / 2, y + 40, {
    font: "36px Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji",
    color: fg,
    align: "center",
    baseline: "middle",
  });

  drawText(ctx, value, x + w / 2, y + 80, {
    font: "700 38px Inter, system-ui",
    color: "#f4f2f8",
    align: "center",
  });

  drawText(ctx, label, x + w / 2, y + h - 16, {
    font: "500 15px Inter, system-ui",
    color: "rgba(244,242,248,0.5)",
    align: "center",
  });
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
      new Promise((resolve) => setTimeout(resolve, 400)),
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

  try {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(0.4, "#0f0c29");
    grad.addColorStop(0.7, "#1a1040");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const orb1 = ctx.createRadialGradient(size * 0.1, size * 0.15, 0, size * 0.1, size * 0.15, size * 0.7);
    orb1.addColorStop(0, "rgba(99, 102, 241, 0.2)");
    orb1.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, size, size);

    const orb2 = ctx.createRadialGradient(size * 0.9, size * 0.85, 0, size * 0.9, size * 0.85, size * 0.6);
    orb2.addColorStop(0, tier === "premium" ? "rgba(245, 158, 11, 0.12)" : "rgba(139, 92, 246, 0.12)");
    orb2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, size, size);

    if (tier === "premium") {
      const orb3 = ctx.createRadialGradient(size * 0.5, size * 0.3, 0, size * 0.5, size * 0.3, size * 0.4);
      orb3.addColorStop(0, "rgba(251, 191, 36, 0.06)");
      orb3.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = orb3;
      ctx.fillRect(0, 0, size, size);
    }

    for (let i = 0; i < 6; i++) {
      const sx = 80 + Math.random() * (size - 160);
      const sy = 80 + Math.random() * (size - 160);
      const sr = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.15})`;
      ctx.fill();
    }

    const cx = size / 2;

    drawText(ctx, "🧠 BrainBloom", cx, 80, {
      font: "700 40px Inter, system-ui",
      color: "#f4f2f8",
      align: "center",
    });
    drawText(ctx, "Daily brain training", cx, 118, {
      font: "400 18px Inter, system-ui",
      color: "rgba(244,242,248,0.45)",
      align: "center",
    });

    const avatarY = 240;
    const avatarR = 72;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, avatarY, avatarR, 0, Math.PI * 2);
    ctx.clip();

    const avatarGrad = ctx.createLinearGradient(cx - avatarR, avatarY - avatarR, cx + avatarR, avatarY + avatarR);
    if (tier === "premium") {
      avatarGrad.addColorStop(0, "#fbbf24");
      avatarGrad.addColorStop(0.5, "#f59e0b");
      avatarGrad.addColorStop(1, "#d97706");
    } else {
      avatarGrad.addColorStop(0, "#6366f1");
      avatarGrad.addColorStop(0.5, "#818cf8");
      avatarGrad.addColorStop(1, "#8b5cf6");
    }
    ctx.fillStyle = avatarGrad;
    ctx.fillRect(cx - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);

    drawText(ctx, getInitial(displayName), cx, avatarY + 4, {
      font: "700 64px Inter, system-ui",
      color: "#ffffff",
      align: "center",
      baseline: "middle",
    });
    ctx.restore();

    if (tier === "premium") {
      ctx.save();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(251, 191, 36, 0.4)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, avatarY, avatarR + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      drawText(ctx, "⭐", cx + avatarR + 4, avatarY - avatarR - 4, {
        font: "28px Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji",
        color: "#fbbf24",
        align: "center",
      });
    }

    drawText(ctx, displayName, cx, 350, {
      font: "700 36px Inter, system-ui",
      color: "#f4f2f8",
      align: "center",
      maxWidth: 600,
    });

    const levelColor = tier === "premium" ? "#fbbf24" : "#a5b4fc";
    drawText(ctx, `Level ${level}`, cx, 390, {
      font: "600 24px Inter, system-ui",
      color: levelColor,
      align: "center",
    });

    const xpForNext = level * 100;
    const xpInLevel = xp % xpForNext;
    const progress = xpForNext > 0 ? xpInLevel / xpForNext : 0;
    drawProgressBar(ctx, cx - 200, 410, 400, 10, progress, tier === "premium" ? "#fbbf24" : "#818cf8", tier === "premium" ? "#f59e0b" : "#6366f1");

    const remaining = xpForNext - xpInLevel;
    drawText(ctx, isStart ? "Your journey begins here!" : `${remaining.toLocaleString()} XP to Level ${level + 1}`, cx, 448, {
      font: "400 16px Inter, system-ui",
      color: "rgba(244,242,248,0.4)",
      align: "center",
    });

    const cardW = 210;
    const cardH = 150;
    const gap = 30;
    const row1Y = 490;
    const row2Y = row1Y + cardH + 24;
    const totalW = cardW * 2 + gap;
    const startX = cx - totalW / 2;

    const statsGrid = [
      {
        value: xp.toLocaleString(),
        label: "Total XP",
        icon: "⚡",
        bg: "rgba(99, 102, 241, 0.15)",
        fg: "#818cf8",
      },
      {
        value: `${streak}`,
        label: "Day Streak",
        icon: "🔥",
        bg: "rgba(245, 158, 11, 0.15)",
        fg: "#fbbf24",
      },
      {
        value: `${puzzlesCompleted}`,
        label: "Puzzles",
        icon: "🧩",
        bg: "rgba(34, 211, 238, 0.12)",
        fg: "#22d3ee",
      },
      {
        value: `${achievements}`,
        label: "Achievements",
        icon: "🏆",
        bg: "rgba(34, 197, 94, 0.12)",
        fg: "#22c55e",
      },
    ];

    statsGrid.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gap);
      const y = row === 0 ? row1Y : row2Y;
      drawStatCard(ctx, x, y, cardW, cardH, s.value, s.label, s.icon, s.bg, s.fg);
    });

    if (isStart) {
      drawRoundedRect(ctx, cx - 180, 860, 360, 50, 25);
      const btnGrad = ctx.createLinearGradient(cx - 180, 860, cx + 180, 860);
      btnGrad.addColorStop(0, "#6366f1");
      btnGrad.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = btnGrad;
      ctx.fill();
      drawText(ctx, "🚀 Start Your Journey", cx, 890, {
        font: "600 20px Inter, system-ui",
        color: "#ffffff",
        align: "center",
      });
    } else {
      const tagline = streak >= 7
        ? `${streak} day streak — unstoppable! 🔥`
        : streak >= 3
          ? `${streak} day streak and growing! 💪`
          : puzzlesCompleted >= 50
            ? `${puzzlesCompleted} puzzles conquered! 🧩`
            : achievements >= 5
              ? `${achievements} achievements unlocked! 🏆`
              : "Training my brain every day 🧠";
      drawText(ctx, tagline, cx, 880, {
        font: "500 18px Inter, system-ui",
        color: "rgba(244,242,248,0.6)",
        align: "center",
      });
    }

    drawText(ctx, "brainblooms.vercel.app", cx, size - 40, {
      font: "400 16px Inter, system-ui",
      color: "rgba(244,242,248,0.25)",
      align: "center",
    });

    return await exportCanvasAsBlob(canvas);
  } catch {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0f0c29";
    ctx.fillRect(0, 0, size, size);
    drawText(ctx, "🧠 BrainBloom", size / 2, size * 0.3, {
      font: "700 48px system-ui, sans-serif",
      color: "#f4f2f8",
      align: "center",
    });
    drawText(ctx, displayName, size / 2, size * 0.45, {
      font: "700 42px system-ui, sans-serif",
      color: "#f4f2f8",
      align: "center",
    });
    drawText(ctx, `Level ${level}  •  ${xp.toLocaleString()} XP`, size / 2, size * 0.55, {
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
