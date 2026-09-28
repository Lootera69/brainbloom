"use client";

import { motion } from "framer-motion";
import { AvatarDisplay } from "@/components/avatars/AvatarDisplay";

/** Natural footprint of the vehicle (Flutter `kAvatarVehicleSize`). */
export const CAR_W = 48;
export const CAR_H = 68;

interface Props {
  avatarId: string | null;
  premium?: boolean;
}

/**
 * Top-down racer that carries the player's avatar in its sunroof, ported from
 * `avatar_vehicle.dart`'s `_TopCarPainter`. Drawn nose-down (headlights at the
 * bottom) so it faces along the road ahead; DriveWorld handles the bank tilt
 * and the forward glide when the frontier advances.
 */
export function AvatarCar({ avatarId, premium }: Props) {
  return (
    <motion.div
      className="relative"
      style={{ width: CAR_W, height: CAR_H }}
      animate={{ y: [0, -2.5, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={CAR_W} height={CAR_H} viewBox="0 0 48 68" fill="none" aria-hidden>
        <defs>
          <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#334155" />
            <stop offset="0.55" stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="carGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#93C5FD" stopOpacity="0.5" />
            <stop offset="1" stopColor="#38BDF8" stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="carBeam" cx="0.5" cy="1" r="0.9">
            <stop offset="0" stopColor="#FEF9C3" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FEF9C3" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Headlight cone ahead of the car */}
        <path d="M14 60 L4 78 L44 78 L34 60 Z" fill="url(#carBeam)" />
        {/* Ground shadow */}
        <ellipse cx="24" cy="60" rx="17" ry="7" fill="#000" opacity="0.28" />

        {/* Rear + front wheels (dark) */}
        <rect x="4" y="16" width="6" height="13" rx="3" fill="#0B1120" />
        <rect x="38" y="16" width="6" height="13" rx="3" fill="#0B1120" />
        <rect x="4" y="40" width="6" height="13" rx="3" fill="#0B1120" />
        <rect x="38" y="40" width="6" height="13" rx="3" fill="#0B1120" />

        {/* Body */}
        <rect x="9" y="6" width="30" height="54" rx="13" fill="url(#carBody)" stroke="#0B1120" strokeWidth="1" />
        {/* Centre racing stripe */}
        <rect x="22.4" y="9" width="3.2" height="48" rx="1.6" fill="var(--primary)" opacity="0.85" />
        {/* Rear glass (top) */}
        <path d="M13 13 L35 13 L31 22 L17 22 Z" fill="url(#carGlass)" />
        {/* Windshield (front/bottom) */}
        <path d="M17 46 L31 46 L35 55 L13 55 Z" fill="url(#carGlass)" />

        {/* Side mirrors */}
        <rect x="7" y="34" width="4" height="4" rx="1.5" fill="#334155" />
        <rect x="37" y="34" width="4" height="4" rx="1.5" fill="#334155" />

        {/* Taillights (rear/top) */}
        <rect x="14" y="8" width="7" height="3" rx="1.5" fill="#F84444" />
        <rect x="27" y="8" width="7" height="3" rx="1.5" fill="#F84444" />
        {/* Headlights (front/bottom) */}
        <motion.rect
          x="13.5" y="55" width="7" height="3.5" rx="1.75" fill="#DBEAFE"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.rect
          x="27.5" y="55" width="7" height="3.5" rx="1.75" fill="#DBEAFE"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Sunroof ring the avatar peeks through */}
        <circle cx="24" cy="35" r="12" fill="#0B1120" opacity="0.55" />
      </svg>

      {/* Avatar in the sunroof */}
      <div
        className="pointer-events-none absolute left-1/2 flex items-center justify-center"
        style={{ top: 35, transform: "translate(-50%, -50%)" }}
      >
        <AvatarDisplay avatarId={avatarId} size={26} premium={premium} fallback="none" />
      </div>
    </motion.div>
  );
}
