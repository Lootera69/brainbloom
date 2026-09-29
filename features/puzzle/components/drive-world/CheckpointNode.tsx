"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { NODE_RADIUS } from "./constants";
import { type Pt } from "./geometry";

export interface NodeVisual {
  center: Pt;
  face: string;
  glossy: number;
  icon: "done" | "locked" | { num: number };
  isFrontier: boolean;
  banner?: { text: string; locked: boolean };
  subLabel?: { text: string; dim: boolean };
  disabled: boolean;
  labelRight: boolean;
  entranceDelay: number;
  onActivate: () => void;
}

const SIZE = NODE_RADIUS * 2;

export const CheckpointNode = memo(function CheckpointNode({
  v,
  bannerHidden,
}: {
  v: NodeVisual;
  /** Fade the group banner as its node slides under the sticky section pill. */
  bannerHidden: boolean;
}) {
  const { center } = v;
  return (
    <>
      {/* Group banner */}
      {v.banner && (
        <div
          className="absolute z-10 -translate-x-1/2 truncate rounded-xl px-2.5 py-1 text-center text-[12px] font-extrabold tracking-tight text-white shadow-md transition-opacity duration-300 ease-out"
          style={{
            left: center.x,
            top: center.y - NODE_RADIUS - 30,
            maxWidth: 160,
            opacity: bannerHidden ? 0 : 1,
            pointerEvents: bannerHidden ? "none" : undefined,
            background: v.banner.locked ? "rgba(58,65,82,0.85)" : "color-mix(in oklab, var(--primary) 95%, transparent)",
          }}
        >
          {v.banner.locked ? "🔒 " : ""}
          {v.banner.text}
        </div>
      )}

      {/* Sub-lesson label pill */}
      {v.subLabel && (
        <div
          className="absolute z-10 line-clamp-2 rounded-[10px] bg-black/60 px-2 py-1 text-[12px] font-bold leading-tight text-white"
          style={{
            top: center.y - 14,
            maxWidth: 132,
            opacity: v.subLabel.dim ? 0.55 : 1,
            ...(v.labelRight
              ? { left: center.x + NODE_RADIUS + 10 }
              : { right: `calc(100% - ${center.x - NODE_RADIUS - 10}px)`, textAlign: "right" as const }),
          }}
        >
          {v.subLabel.text}
        </div>
      )}

      {/* Frontier pulse ring */}
      {v.isFrontier && (
        <motion.div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: center.x,
            top: center.y,
            width: SIZE + 18,
            height: SIZE + 18,
            border: "3px solid color-mix(in oklab, var(--primary) 70%, transparent)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* The checkpoint disc */}
      <motion.button
        type="button"
        disabled={v.disabled}
        onClick={v.onActivate}
        aria-label={v.subLabel?.text ?? v.banner?.text ?? "Checkpoint"}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_oklab,var(--primary)_50%,transparent)]"
        style={{
          left: center.x,
          top: center.y,
          width: SIZE,
          height: SIZE,
          cursor: v.disabled ? "default" : "pointer",
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: v.entranceDelay }}
        whileHover={v.disabled ? undefined : { scale: 1.06 }}
        whileTap={v.disabled ? undefined : { scale: 0.94 }}
      >
        {/* Base disc + drop shadow */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: v.face,
            boxShadow: v.isFrontier
              ? "0 8px 18px rgba(0,0,0,0.28), 0 0 0 4px rgba(255,255,255,0.55)"
              : "0 6px 14px rgba(0,0,0,0.22)",
          }}
        />
        {/* Glossy top highlight */}
        <span
          className="absolute left-1/2 top-[6px] h-[42%] w-[70%] -translate-x-1/2 rounded-full"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0))",
            opacity: v.glossy,
          }}
        />
        {/* Icon */}
        <span className="absolute inset-0 flex items-center justify-center">
          {v.icon === "done" ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12.5 L10 17.5 L19 6.5"
                stroke="#fff"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : v.icon === "locked" ? (
            <span className="text-[22px] leading-none opacity-90" aria-hidden>
              🔒
            </span>
          ) : (
            <span className="text-[22px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
              {v.icon.num}
            </span>
          )}
        </span>
      </motion.button>
    </>
  );
});
