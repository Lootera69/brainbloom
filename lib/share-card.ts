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

function drawGradientBackground(ctx: CanvasRenderingContext2D, size: number): void {
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#1e1b4b");
  grad.addColorStop(0.5, "#0f0c29");
  grad.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const orb1 = ctx.createRadialGradient(size * 0.15, size * 0.2, 0, size * 0.15, size * 0.2, size * 0.6);
  orb1.addColorStop(0, "rgba(99, 102, 241, 0.15)");
  orb1.addColorStop(1, "rgba(99, 102, 241, 0)");
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, size, size);

  const orb2 = ctx.createRadialGradient(size * 0.85, size * 0.8, 0, size * 0.85, size * 0.8, size * 0.55);
  orb2.addColorStop(0, "rgba(245, 158, 11, 0.1)");
  orb2.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, size, size);
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

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error("toBlob produced no image"));
          }
        },
        "image/png",
      );
    } catch (e) {
      reject(e instanceof Error ? e : new Error("toBlob threw"));
    }
  });
}

async function exportCanvasAsBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  try {
    return await canvasToPngBlob(canvas);
  } catch {
    try {
      const dataURL = canvas.toDataURL("image/png");
      const blob = dataURLToBlob(dataURL);
      if (blob.size > 0) return blob;
    } catch {
      // fall through
    }
  }
  throw new Error("Share card image generation failed");
}

function drawMinimalCard(
  ctx: CanvasRenderingContext2D,
  size: number,
  displayName: string,
  level: number,
  xp: number,
  streak: number,
  puzzlesCompleted: number,
  achievements: number,
): void {
  const centerX = size / 2;
  ctx.fillStyle = "#0f0c29";
  ctx.fillRect(0, 0, size, size);
  drawText(ctx, "BrainBloom", centerX, size * 0.12, {
    font: "700 48px system-ui, sans-serif",
    color: "#f4f2f8",
    align: "center",
  });
  drawText(ctx, displayName, centerX, size * 0.3, {
    font: "700 42px system-ui, sans-serif",
    color: "#f4f2f8",
    align: "center",
  });
  drawText(ctx, `Level ${level}`, centerX, size * 0.4, {
    font: "600 32px system-ui, sans-serif",
    color: "#a5b4fc",
    align: "center",
  });
  drawText(ctx, `XP ${xp.toLocaleString()}  |  Streak ${streak}d  |  Puzzles ${puzzlesCompleted}  |  Achievements ${achievements}`, centerX, size * 0.55, {
    font: "400 28px system-ui, sans-serif",
    color: "#f4f2f8",
    align: "center",
  });
  drawText(ctx, "brainblooms.vercel.app", centerX, size * 0.92, {
    font: "400 20px system-ui, sans-serif",
    color: "rgba(244,242,248,0.5)",
    align: "center",
  });
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const size = SHARE_CARD_SIZE;

  try {
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);
  } catch {
    // Font readiness is non-fatal — fall back to system fonts
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

  try {
    drawGradientBackground(ctx, size);

    const centerX = size / 2;

    drawText(ctx, "🧠 BrainBloom", centerX, size * 0.1, {
      font: "700 42px Inter, system-ui",
      color: "#f4f2f8",
      align: "center",
    });

    drawText(ctx, "Daily brain training", centerX, size * 0.155, {
      font: "400 20px Inter, system-ui",
      color: "rgba(244,242,248,0.6)",
      align: "center",
    });

    const avatarCenterY = size * 0.28;
    const avatarRadius = 80;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();

    const avatarGrad = ctx.createLinearGradient(
      centerX - avatarRadius,
      avatarCenterY - avatarRadius,
      centerX + avatarRadius,
      avatarCenterY + avatarRadius,
    );
    if (tier === "premium") {
      avatarGrad.addColorStop(0, "#fbbf24");
      avatarGrad.addColorStop(1, "#f59e0b");
    } else {
      avatarGrad.addColorStop(0, "#6366f1");
      avatarGrad.addColorStop(1, "#8b5cf6");
    }
    ctx.fillStyle = avatarGrad;
    ctx.fillRect(centerX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);

    drawText(ctx, getInitial(displayName), centerX, avatarCenterY + 28, {
      font: "700 72px Inter, system-ui",
      color: "#ffffff",
      align: "center",
      baseline: "middle",
    });
    ctx.restore();

    if (tier === "premium") {
      ctx.save();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawText(ctx, displayName, centerX, size * 0.42, {
      font: "700 36px Inter, system-ui",
      color: "#f4f2f8",
      align: "center",
    });

    drawText(ctx, `Level ${level}`, centerX, size * 0.475, {
      font: "600 28px Inter, system-ui",
      color: tier === "premium" ? "#fbbf24" : "#a5b4fc",
      align: "center",
    });

    const statY = size * 0.58;
    const statGap = 180;
    const startX = centerX - statGap * 1.5;

    const stats = [
      { label: "XP", value: xp.toLocaleString(), emoji: "⚡" },
      { label: "Streak", value: `${streak}d`, emoji: "🔥" },
      { label: "Puzzles", value: puzzlesCompleted.toString(), emoji: "🧩" },
      { label: "Achievements", value: achievements.toString(), emoji: "🏆" },
    ];

    stats.forEach((s, i) => {
      const x = startX + i * statGap;
      drawText(ctx, s.emoji, x, statY, {
        font: "28px Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji",
        color: "#f4f2f8",
        align: "center",
        baseline: "top",
      });
      drawText(ctx, s.value, x, statY + 38, {
        font: "700 32px Inter, system-ui",
        color: "#f4f2f8",
        align: "center",
      });
      drawText(ctx, s.label, x, statY + 76, {
        font: "400 16px Inter, system-ui",
        color: "rgba(244,242,248,0.6)",
        align: "center",
      });
    });

    drawText(ctx, "brainblooms.vercel.app", centerX, size * 0.92, {
      font: "400 18px Inter, system-ui",
      color: "rgba(244,242,248,0.4)",
      align: "center",
    });

    return await exportCanvasAsBlob(canvas);
  } catch {
    ctx.clearRect(0, 0, size, size);
    drawMinimalCard(ctx, size, displayName, level, xp, streak, puzzlesCompleted, achievements);
    try {
      return await exportCanvasAsBlob(canvas);
    } catch {
      throw new Error("Share card generation failed");
    }
  }
}
