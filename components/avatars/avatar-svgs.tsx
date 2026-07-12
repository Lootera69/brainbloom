"use client";

import React from "react";

let gradientCounter = 0;
function uid(prefix: string) {
  gradientCounter++;
  return `${prefix}-${gradientCounter}`;
}

interface AvatarSvgProps {
  size?: number;
  className?: string;
}

function blinkOverlay(cx: number, cy: number, rx: number, ry: number, gradId: string) {
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradId})`}>
      <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.78;0.83;1" dur="3s" repeatCount="indefinite" />
    </ellipse>
  );
}

export const AvatarOwl: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("owl");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <ellipse cx="25" cy="28" rx="6" ry="10" transform="rotate(-20 25 28)" fill={`url(#${g})`} />
      <ellipse cx="75" cy="28" rx="6" ry="10" transform="rotate(20 75 28)" fill={`url(#${g})`} />
      <circle cx="50" cy="52" r="34" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="50" cy="62" rx="18" ry="15" fill="rgba(255,255,255,0.08)" />
      <circle cx="35" cy="44" r="10" fill="white" />
      <circle cx="65" cy="44" r="10" fill="white" />
      <circle cx="35" cy="44" r="4.5" fill="#1e1b4b" />
      <circle cx="65" cy="44" r="4.5" fill="#1e1b4b" />
      <circle cx="37" cy="42" r="1.8" fill="white" />
      <circle cx="67" cy="42" r="1.8" fill="white" />
      {blinkOverlay(35, 44, 10.5, 10.5, g)}
      {blinkOverlay(65, 44, 10.5, 10.5, g)}
      <circle cx="35" cy="44" r="12.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" />
      <circle cx="65" cy="44" r="12.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" />
      <line x1="47.5" y1="44" x2="52.5" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" />
      <path d="M46 55 L54 55 L50 62 Z" fill="#fbbf24" />
      <path d="M48 55 L52 55 L50 58 Z" fill="#f59e0b" />
      <ellipse cx="14" cy="55" rx="8" ry="14" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="86" cy="55" rx="8" ry="14" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="36" cy="90" rx="7" ry="3.5" fill="#f59e0b" />
      <ellipse cx="64" cy="90" rx="7" ry="3.5" fill="#f59e0b" />
    </svg>
  );
};

export const AvatarFox: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("fox");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <path d="M28 38 L24 12 L42 30 Z" fill={`url(#${g})`} />
      <path d="M72 38 L76 12 L58 30 Z" fill={`url(#${g})`} />
      <path d="M30 35 L27 18 L39 30 Z" fill="rgba(255,255,255,0.2)" />
      <path d="M70 35 L73 18 L61 30 Z" fill="rgba(255,255,255,0.2)" />
      <circle cx="50" cy="50" r="30" fill="rgba(255,255,255,0.12)" />
      <path d="M32 56 Q50 80 68 56 Q50 76 32 56 Z" fill="rgba(255,255,255,0.25)" />
      <ellipse cx="38" cy="44" rx="6" ry="4.5" fill="white" />
      <ellipse cx="62" cy="44" rx="6" ry="4.5" fill="white" />
      <ellipse cx="38" cy="44" rx="3" ry="3" fill="#1e1b4b" />
      <ellipse cx="62" cy="44" rx="3" ry="3" fill="#1e1b4b" />
      <circle cx="36" cy="42" r="1.2" fill="white" />
      <circle cx="60" cy="42" r="1.2" fill="white" />
      {blinkOverlay(38, 44, 6.5, 5, g)}
      {blinkOverlay(62, 44, 6.5, 5, g)}
      <circle cx="50" cy="53" r="3.5" fill="#1e1b4b" />
      <path d="M44 58 Q50 64 56 58" fill="none" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const AvatarCat: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("cat");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#db2777" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <path d="M24 40 L30 14 L42 32 Z" fill={`url(#${g})`} />
      <path d="M76 40 L70 14 L58 32 Z" fill={`url(#${g})`} />
      <path d="M28 36 L32 20 L40 32 Z" fill="rgba(255,255,255,0.2)" />
      <path d="M72 36 L68 20 L60 32 Z" fill="rgba(255,255,255,0.2)" />
      <circle cx="50" cy="52" r="32" fill="rgba(255,255,255,0.1)" />
      <circle cx="35" cy="44" r="10" fill="white" />
      <circle cx="65" cy="44" r="10" fill="white" />
      <circle cx="35" cy="44" r="6" fill="#1e1b4b" />
      <circle cx="65" cy="44" r="6" fill="#1e1b4b" />
      <circle cx="37" cy="42" r="2.5" fill="white" />
      <circle cx="67" cy="42" r="2.5" fill="white" />
      {blinkOverlay(35, 44, 10.5, 10.5, g)}
      {blinkOverlay(65, 44, 10.5, 10.5, g)}
      <circle cx="50" cy="54" r="2.5" fill="#be185d" />
      <line x1="36" y1="58" x2="28" y2="60" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="38" y1="60" x2="30" y2="64" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="64" y1="58" x2="72" y2="60" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="62" y1="60" x2="70" y2="64" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="16" cy="62" rx="8" ry="12" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="84" cy="62" rx="8" ry="12" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
};

export const AvatarRobot: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("robot");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <rect x="20" y="18" width="60" height="48" rx="12" fill={`url(#${g})`} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <line x1="50" y1="8" x2="50" y2="18" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="6" r="4" fill="#22d3ee" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <rect x="31" y="34" width="14" height="10" rx="2.5" fill="#155e75" />
      <rect x="55" y="34" width="14" height="10" rx="2.5" fill="#155e75" />
      <circle cx="38" cy="39" r="4" fill="#22d3ee" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="39" r="4" fill="#22d3ee" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <rect x="38" y="50" width="24" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      <rect x="40" y="56" width="20" height="2" rx="1" fill="rgba(255,255,255,0.1)" />
      <rect x="42" y="60" width="16" height="2" rx="1" fill="rgba(255,255,255,0.08)" />
      <circle cx="20" cy="30" r="3" fill="rgba(255,255,255,0.2)" />
      <circle cx="80" cy="30" r="3" fill="rgba(255,255,255,0.2)" />
      <rect x="35" y="68" width="30" height="25" rx="8" fill="rgba(255,255,255,0.06)" />
      <circle cx="50" cy="80" r="5" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
};

export const AvatarAlien: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("alien");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <ellipse cx="50" cy="46" rx="28" ry="34" fill={`url(#${g})`} />
      <ellipse cx="50" cy="50" rx="24" ry="28" fill="rgba(255,255,255,0.08)" />
      <line x1="40" y1="14" x2="38" y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="14" x2="62" y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="38" cy="6" r="3" fill="#6ee7b7" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="6" r="3" fill="#6ee7b7" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="36" cy="40" rx="9" ry="12" fill="#064e3b" />
      <ellipse cx="64" cy="40" rx="9" ry="12" fill="#064e3b" />
      <ellipse cx="36" cy="40" rx="6" ry="8" fill="#a7f3d0" opacity="0.6" />
      <ellipse cx="64" cy="40" rx="6" ry="8" fill="#a7f3d0" opacity="0.6" />
      <circle cx="36" cy="40" r="3" fill="#064e3b" />
      <circle cx="64" cy="40" r="3" fill="#064e3b" />
      <circle cx="34" cy="37" r="1.5" fill="white" opacity="0.6" />
      <circle cx="62" cy="37" r="1.5" fill="white" opacity="0.6" />
      <path d="M44 58 Q50 64 56 58" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export const AvatarPanda: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("panda");
  const g2 = uid("panda-dark");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </radialGradient>
        <radialGradient id={g2} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <circle cx="28" cy="32" r="14" fill="#1e293b" />
      <circle cx="72" cy="32" r="14" fill="#1e293b" />
      <circle cx="50" cy="48" r="30" fill="rgba(255,255,255,0.2)" />
      <ellipse cx="36" cy="46" rx="12" ry="13" fill="#1e293b" transform="rotate(-15 36 46)" />
      <ellipse cx="64" cy="46" rx="12" ry="13" fill="#1e293b" transform="rotate(15 64 46)" />
      <circle cx="37" cy="45" r="4" fill="white" />
      <circle cx="63" cy="45" r="4" fill="white" />
      <circle cx="37" cy="45" r="2" fill="#1e293b" />
      <circle cx="63" cy="45" r="2" fill="#1e293b" />
      <circle cx="39" cy="43" r="1.2" fill="white" />
      <circle cx="65" cy="43" r="1.2" fill="white" />
      {blinkOverlay(37, 45, 4.5, 4.5, g2)}
      {blinkOverlay(63, 45, 4.5, 4.5, g2)}
      <ellipse cx="50" cy="56" rx="4" ry="3" fill="#1e293b" />
      <path d="M42 62 Q50 68 58 62" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="34" cy="64" r="4" fill="#1e293b" opacity="0.3" />
      <circle cx="66" cy="64" r="4" fill="#1e293b" opacity="0.3" />
    </svg>
  );
};

export const AvatarBunny: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("bunny");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <ellipse cx="30" cy="22" rx="8" ry="20" transform="rotate(-12 30 22)" fill={`url(#${g})`} />
      <ellipse cx="70" cy="22" rx="8" ry="20" transform="rotate(12 70 22)" fill={`url(#${g})`} />
      <ellipse cx="30" cy="22" rx="4" ry="14" transform="rotate(-12 30 22)" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="70" cy="22" rx="4" ry="14" transform="rotate(12 70 22)" fill="rgba(255,255,255,0.15)" />
      <circle cx="50" cy="52" r="28" fill="rgba(255,255,255,0.12)" />
      <circle cx="36" cy="46" r="9" fill="white" />
      <circle cx="64" cy="46" r="9" fill="white" />
      <circle cx="36" cy="46" r="5" fill="#1e1b4b" />
      <circle cx="64" cy="46" r="5" fill="#1e1b4b" />
      <circle cx="38" cy="44" r="2" fill="white" />
      <circle cx="66" cy="44" r="2" fill="white" />
      {blinkOverlay(36, 46, 9.5, 9.5, g)}
      {blinkOverlay(64, 46, 9.5, 9.5, g)}
      <ellipse cx="50" cy="57" rx="3" ry="2.5" fill="#a78bfa" />
      <circle cx="42" cy="64" r="1.5" fill="rgba(255,255,255,0.25)" />
      <circle cx="46" cy="66" r="1.5" fill="rgba(255,255,255,0.25)" />
      <circle cx="54" cy="66" r="1.5" fill="rgba(255,255,255,0.25)" />
      <circle cx="58" cy="64" r="1.5" fill="rgba(255,255,255,0.25)" />
      <ellipse cx="50" cy="80" rx="14" ry="8" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
};

export const AvatarTurtle: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("turtle");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <path d="M22 48 Q50 12 78 48 Q80 72 50 84 Q20 72 22 48 Z" fill={`url(#${g})`} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      <path d="M50 28 Q70 48 50 70 Q30 48 50 28 Z" fill="rgba(255,255,255,0.06)" />
      <path d="M34 50 Q50 38 66 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      <path d="M30 60 Q50 48 70 60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <path d="M50 34 L50 66" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <circle cx="50" cy="78" r="12" fill={`url(#${g})`} />
      <circle cx="50" cy="78" r="10" fill="rgba(255,255,255,0.1)" />
      <circle cx="42" cy="76" r="3" fill="#1e1b4b" />
      <circle cx="58" cy="76" r="3" fill="#1e1b4b" />
      <circle cx="40" cy="74.5" r="1.2" fill="white" />
      <circle cx="56" cy="74.5" r="1.2" fill="white" />
      {blinkOverlay(42, 76, 3.5, 3.5, g)}
      {blinkOverlay(58, 76, 3.5, 3.5, g)}
      <path d="M46 82 Q50 86 54 82" fill="none" stroke="#1e1b4b" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="32" cy="72" rx="5" ry="3" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="68" cy="72" rx="5" ry="3" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="38" cy="90" rx="4" ry="2.5" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="62" cy="90" rx="4" ry="2.5" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
};

export interface AvatarDefinition {
  id: string;
  name: string;
  component: React.FC<AvatarSvgProps>;
}

export const avatars: AvatarDefinition[] = [
  { id: "owl", name: "Owl", component: AvatarOwl },
  { id: "fox", name: "Fox", component: AvatarFox },
  { id: "cat", name: "Cat", component: AvatarCat },
  { id: "robot", name: "Robot", component: AvatarRobot },
  { id: "alien", name: "Alien", component: AvatarAlien },
  { id: "panda", name: "Panda", component: AvatarPanda },
  { id: "bunny", name: "Bunny", component: AvatarBunny },
  { id: "turtle", name: "Turtle", component: AvatarTurtle },
];

export function getAvatarById(id: string) {
  return avatars.find((a) => a.id === id) ?? null;
}
