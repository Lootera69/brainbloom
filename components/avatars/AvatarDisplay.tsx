"use client";

import { getAvatarById } from "./avatar-svgs";

interface AvatarDisplayProps {
  avatarId: string | null;
  photoURL?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fallback?: "initials" | "none";
}

export function AvatarDisplay({
  avatarId,
  photoURL,
  name = "?",
  size = 40,
  className = "",
  fallback = "initials",
}: AvatarDisplayProps) {
  const avatar = avatarId ? getAvatarById(avatarId) : null;

  if (avatar) {
    const SvgComponent = avatar.component;
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <SvgComponent size={size} />
      </span>
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
