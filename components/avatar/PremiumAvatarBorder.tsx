"use client";

import { motion } from "framer-motion";

interface PremiumAvatarBorderProps {
  children: React.ReactNode;
  size?: number;
}

export function PremiumAvatarBorder({ children, size = 96 }: PremiumAvatarBorderProps) {
  return (
    <span className="relative inline-flex shrink-0">
      <motion.span
        className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 via-orange-400 to-amber-500"
        style={{ padding: 3, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <span className="block size-full rounded-full bg-card" />
      </motion.span>
      <motion.span
        className="absolute -inset-1.5 rounded-full opacity-40 blur-md"
        style={{
          background: "conic-gradient(from 0deg, #fbbf24, #f59e0b, #fbbf24, #f59e0b)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <span className="relative rounded-full overflow-hidden" style={{ width: size, height: size }}>
        {children}
      </span>
    </span>
  );
}
