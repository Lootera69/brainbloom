"use client";

import { useEffect, useState } from "react";

const orbs = [
  { size: 300, x: "10%", y: "0%", delay: 0, duration: 12, color: "var(--primary)" },
  { size: 250, x: "70%", y: "20%", delay: 2, duration: 15, color: "#8b5cf6" },
  { size: 200, x: "50%", y: "60%", delay: 4, duration: 10, color: "var(--secondary)" },
  { size: 180, x: "85%", y: "70%", delay: 1, duration: 14, color: "#f59e0b" },
  { size: 220, x: "20%", y: "80%", delay: 3, duration: 11, color: "var(--primary)" },
];

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-[0.04] blur-3xl dark:opacity-[0.06]"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            animation: `float-orb ${orb.duration}s ease-in-out ${orb.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-orb {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.1); }
          66% { transform: translate(-20px, 15px) scale(0.9); }
          100% { transform: translate(15px, -10px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
