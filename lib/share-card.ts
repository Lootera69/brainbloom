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
  text: string,
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
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const size = SHARE_CARD_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

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
  if (data.tier === "premium") {
    avatarGrad.addColorStop(0, "#fbbf24");
    avatarGrad.addColorStop(1, "#f59e0b");
  } else {
    avatarGrad.addColorStop(0, "#6366f1");
    avatarGrad.addColorStop(1, "#8b5cf6");
  }
  ctx.fillStyle = avatarGrad;
  ctx.fillRect(centerX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);

  drawText(ctx, getInitial(data.displayName), centerX, avatarCenterY + 28, {
    font: "700 72px Inter, system-ui",
    color: "#ffffff",
    align: "center",
    baseline: "middle",
  });
  ctx.restore();

  if (data.tier === "premium") {
    ctx.save();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawText(ctx, data.displayName, centerX, size * 0.42, {
    font: "700 36px Inter, system-ui",
    color: "#f4f2f8",
    align: "center",
  });

  drawText(ctx, `Level ${data.level}`, centerX, size * 0.475, {
    font: "600 28px Inter, system-ui",
    color: data.tier === "premium" ? "#fbbf24" : "#a5b4fc",
    align: "center",
  });

  const statY = size * 0.58;
  const statGap = 180;
  const startX = centerX - statGap * 1.5;

  const stats = [
    { label: "XP", value: data.xp.toLocaleString(), emoji: "⚡" },
    { label: "Streak", value: `${data.streak}d`, emoji: "🔥" },
    { label: "Puzzles", value: data.puzzlesCompleted.toString(), emoji: "🧩" },
    { label: "Achievements", value: data.achievements.toString(), emoji: "🏆" },
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

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else resolve(new Blob());
    }, "image/png");
  });
}