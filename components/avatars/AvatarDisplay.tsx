"use client";

import { motion } from "framer-motion";
import { getAvatarById } from "./avatar-svgs";

interface AvatarDisplayProps {
  avatarId: string | null;
  photoURL?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fallback?: "initials" | "none";
  animate?: boolean;
}

// Stagger floating delays based on avatar ID
function floatDelay(avatarId: string | null): number {
  const delays: Record<string, number> = {
    owl: 0, fox: 0.4, cat: 0.8, robot: 1.2,
    alien: 1.6, panda: 2, bunny: 2.4, turtle: 2.8,
  };
  return avatarId ? delays[avatarId] ?? 0 : 0;
}

export function AvatarDisplay({
  avatarId,
  photoURL,
  name = "?",
  size = 40,
  className = "",
  fallback = "initials",
  animate = true,
}: AvatarDisplayProps) {
  const avatar = avatarId ? getAvatarById(avatarId) : null;

  if (avatar) {
    const SvgComponent = avatar.component;
    return (
      <motion.span
        className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        animate={animate ? { y: [0, -3, 0] } : undefined}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay(avatarId),
        }}
      >
        <SvgComponent size={size} />
      </motion.span>
    );
  }

  if (photoURL) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={photoURL} alt="" className="size-full rounded-full object-cover" />
      </span>
    );
  }

  if (fallback === "none") {
    return null;
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.35) }}
    >
      {initials || "?"}
    </span>
  );
}
