"use client";

import { getAvatarById } from "./avatar-svgs";
import { PremiumAvatarBorder } from "@/components/avatar/PremiumAvatarBorder";

interface AvatarDisplayProps {
  avatarId: string | null;
  photoURL?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fallback?: "initials" | "none";
  premium?: boolean;
}

function renderInner({
  avatarId,
  photoURL,
  name,
  size,
  className,
  fallback,
}: AvatarDisplayProps): React.ReactNode {
  const avatar = avatarId ? getAvatarById(avatarId) : null;

  if (avatar) {
    const SvgComponent = avatar.component;
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
        style={{ width: size ?? 40, height: size ?? 40 }}
      >
        <SvgComponent size={size ?? 40} />
      </span>
    );
  }

  if (photoURL) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className ?? ""}`}
        style={{ width: size ?? 40, height: size ?? 40 }}
      >
        <img src={photoURL} alt="" className="size-full rounded-full object-cover" />
      </span>
    );
  }

  if (fallback === "none") return null;

  const initials = (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white ${className ?? ""}`}
      style={{ width: size ?? 40, height: size ?? 40, fontSize: Math.max(10, (size ?? 40) * 0.35) }}
    >
      {initials || "?"}
    </span>
  );
}

export function AvatarDisplay(props: AvatarDisplayProps) {
  if (props.premium) {
    return (
      <PremiumAvatarBorder size={props.size ?? 40}>
        {renderInner(props)}
      </PremiumAvatarBorder>
    );
  }
  return renderInner(props);
}
