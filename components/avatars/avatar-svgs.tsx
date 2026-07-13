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

function blinkOverlay(cx: number, cy: number, rx: number, ry: number, g: string) {
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${g})`}>
      <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.78;0.83;1" dur="3s" repeatCount="indefinite" />
    </ellipse>
  );
}

const featherPatternId = "feather-pattern";
const furPatternId = "fur-pattern";
const shellPatternId = "shell-pattern";

export const AvatarOwl: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("owl-body");
  const g2 = uid("owl-eye");
  const g3 = uid("owl-iris");
  const g4 = uid("owl-beak");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#8b7ef6" />
          <stop offset="50%" stopColor="#6d5ae0" />
          <stop offset="100%" stopColor="#3c2f9e" />
        </radialGradient>
        <radialGradient id={g2} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="80%" stopColor="#f0ebff" />
          <stop offset="100%" stopColor="#d4ccf5" />
        </radialGradient>
        <radialGradient id={g3} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <radialGradient id={g4} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <pattern id={`${featherPatternId}-${g1}`} width="8" height="6" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <path d="M0 3 Q2 0 4 3 Q6 6 8 3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${featherPatternId}-${g1})`} />
      <ellipse cx="50" cy="60" rx="30" ry="22" fill="rgba(255,255,255,0.08)" />
      <path d="M28 26 Q25 10 35 18 L38 28Z" fill={`url(#${g1})`} opacity="0.7" />
      <path d="M72 26 Q75 10 65 18 L62 28Z" fill={`url(#${g1})`} opacity="0.7" />
      <circle cx="50" cy="50" r="32" fill="rgba(255,255,255,0.06)" />
      <path d="M22 52 Q50 82 78 52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      <path d="M26 56 Q50 84 74 56" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      <path d="M30 60 Q50 86 70 60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
      <path d="M32 30 L30 22 Q28 18 25 20 L28 28Z" fill="rgba(255,255,255,0.12)" />
      <path d="M68 30 L70 22 Q72 18 75 20 L72 28Z" fill="rgba(255,255,255,0.12)" />
      <path d="M34 48 Q44 54 50 52 L56 54 Q66 48 64 42 Q58 38 50 40 Q42 38 36 42 Q34 46 34 48Z" fill="rgba(255,255,255,0.06)" />
      <circle cx="34" cy="44" r="11" fill={`url(#${g2})`} />
      <circle cx="66" cy="44" r="11" fill={`url(#${g2})`} />
      <circle cx="34" cy="44" r="7" fill={`url(#${g3})`} />
      <circle cx="66" cy="44" r="7" fill={`url(#${g3})`} />
      <circle cx="34" cy="44" r="4" fill="#1e1b4b" />
      <circle cx="66" cy="44" r="4" fill="#1e1b4b" />
      <circle cx="36" cy="42" r="1.8" fill="white" />
      <circle cx="68" cy="42" r="1.8" fill="white" />
      <circle cx="33" cy="42" r="1" fill="white" opacity="0.6" />
      <circle cx="65" cy="42" r="1" fill="white" opacity="0.6" />
      <circle cx="34" cy="44" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <circle cx="66" cy="44" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <path d="M46 50 L50 44 L54 50 L50 56Z" fill={`url(#${g4})`} />
      <path d="M48 48 L50 46 L52 48" fill="rgba(255,255,255,0.3)" />
      <ellipse cx="50" cy="56" rx="4" ry="2" fill="rgba(255,255,255,0.08)" />
      <line x1="47.5" y1="44" x2="52.5" y2="44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <ellipse cx="14" cy="52" rx="8" ry="14" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="86" cy="52" rx="8" ry="14" fill="rgba(255,255,255,0.08)" />
      <path d="M18 58 Q14 66 20 68 Q22 62 18 58Z" fill="rgba(255,255,255,0.05)" />
      <path d="M82 58 Q86 66 80 68 Q78 62 82 58Z" fill="rgba(255,255,255,0.05)" />
      <ellipse cx="36" cy="88" rx="7" ry="3.5" fill="#92400e" />
      <ellipse cx="64" cy="88" rx="7" ry="3.5" fill="#92400e" />
      <path d="M32 86 L36 84 L40 86 L36 90Z" fill="#b45309" />
      <path d="M60 86 L64 84 L68 86 L64 90Z" fill="#b45309" />
    </svg>
  );
};

export const AvatarFox: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("fox-body");
  const g2 = uid("fox-snout");
  const g3 = uid("fox-eye");
  const g4 = uid("fox-ear");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={g2} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
        <radialGradient id={g3} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="80%" stopColor="#f0ebff" />
          <stop offset="100%" stopColor="#d4ccf5" />
        </radialGradient>
        <radialGradient id={g4} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
        <pattern id={`${furPatternId}-${g1}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="scale(0.6)">
          <circle cx="2" cy="2" r="0.8" fill="rgba(255,255,255,0.08)" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${furPatternId}-${g1})`} />
      <ellipse cx="50" cy="55" rx="32" ry="28" fill={`url(#${g2})`} />
      <path d="M28 38 L22 10 L42 30 Z" fill={`url(#${g1})`} />
      <path d="M72 38 L78 10 L58 30 Z" fill={`url(#${g1})`} />
      <path d="M24 32 L22 14 L38 28Z" fill="rgba(255,255,255,0.15)" />
      <path d="M76 32 L78 14 L62 28Z" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="30" cy="28" rx="5" ry="7" transform="rotate(-15 30 28)" fill={`url(#${g4})`} />
      <ellipse cx="70" cy="28" rx="5" ry="7" transform="rotate(15 70 28)" fill={`url(#${g4})`} />
      <circle cx="50" cy="48" r="28" fill="rgba(255,255,255,0.06)" />
      <path d="M28 50 Q20 32 32 48" fill="rgba(255,255,255,0.04)" />
      <path d="M72 50 Q80 32 68 48" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="36" cy="42" rx="7" ry="5.5" fill={`url(#${g3})`} />
      <ellipse cx="64" cy="42" rx="7" ry="5.5" fill={`url(#${g3})`} />
      <ellipse cx="36" cy="42" rx="3.5" ry="4" fill={`url(#${g4})`} />
      <ellipse cx="64" cy="42" rx="3.5" ry="4" fill={`url(#${g4})`} />
      <circle cx="36" cy="42" r="2.8" fill="#1e1b4b" />
      <circle cx="64" cy="42" r="2.8" fill="#1e1b4b" />
      <circle cx="34" cy="40.5" r="1.2" fill="white" />
      <circle cx="62" cy="40.5" r="1.2" fill="white" />
      <ellipse cx="50" cy="52" rx="5" ry="3.5" fill="#1e1b4b" />
      <ellipse cx="50" cy="51" rx="2.5" ry="1.5" fill="#292524" />
      <path d="M44 56 Q50 62 56 56" fill="none" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="52" x2="32" y2="55" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="42" y1="54" x2="34" y2="58" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="60" y1="52" x2="68" y2="55" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="58" y1="54" x2="66" y2="58" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
};

export const AvatarCat: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("cat-body");
  const g2 = uid("cat-eye");
  const g3 = uid("cat-ear");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="40%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#9d174d" />
        </radialGradient>
        <radialGradient id={g2} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#ccfbf1" />
          <stop offset="100%" stopColor="#5eead4" />
        </radialGradient>
        <radialGradient id={g3} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#e11d48" />
        </radialGradient>
        <pattern id={`${furPatternId}-${g1}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <line x1="0" y1="3" x2="6" y2="3" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${furPatternId}-${g1})`} />
      <path d="M26 42 L32 14 L44 34 Z" fill={`url(#${g1})`} />
      <path d="M74 42 L68 14 L56 34 Z" fill={`url(#${g1})`} />
      <path d="M29 36 L33 20 L41 34Z" fill="rgba(255,255,255,0.15)" />
      <path d="M71 36 L67 20 L59 34Z" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="34" cy="28" rx="5" ry="7" transform="rotate(-10 34 28)" fill={`url(#${g3})`} />
      <ellipse cx="66" cy="28" rx="5" ry="7" transform="rotate(10 66 28)" fill={`url(#${g3})`} />
      <circle cx="50" cy="52" r="30" fill="rgba(255,255,255,0.06)" />
      <path d="M38 36 L42 28 L44 36" fill="none" stroke="#86198f" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M50 34 L50 26 L50 34" fill="none" stroke="#86198f" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M62 36 L58 28 L56 36" fill="none" stroke="#86198f" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <circle cx="34" cy="44" r="10" fill={`url(#${g2})`} />
      <circle cx="66" cy="44" r="10" fill={`url(#${g2})`} />
      <ellipse cx="34" cy="44" rx="2" ry="6" fill="#1e1b4b" />
      <ellipse cx="66" cy="44" rx="2" ry="6" fill="#1e1b4b" />
      <circle cx="33" cy="42" r="1.2" fill="white" />
      <circle cx="65" cy="42" r="1.2" fill="white" />
      <circle cx="35" cy="42" r="1" fill="white" opacity="0.6" />
      <circle cx="67" cy="42" r="1" fill="white" opacity="0.6" />
      <ellipse cx="50" cy="53" rx="2.5" ry="2" fill="#be185d" />
      <path d="M48 56 L50 55 L52 56" fill="none" stroke="#be185d" strokeWidth="1" strokeLinecap="round" />
      <line x1="28" y1="56" x2="20" y2="58" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="30" y1="58" x2="22" y2="62" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="72" y1="56" x2="80" y2="58" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="70" y1="58" x2="78" y2="62" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <ellipse cx="16" cy="62" rx="8" ry="12" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="84" cy="62" rx="8" ry="12" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
};

export const AvatarDog: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("dog-body");
  const g2 = uid("dog-eye");
  const g3 = uid("dog-ear");
  const g4 = uid("dog-nose");
  const g5 = uid("dog-tongue");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="40%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <radialGradient id={g2} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </radialGradient>
        <radialGradient id={g3} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <radialGradient id={g4} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </radialGradient>
        <radialGradient id={g5} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#e11d48" />
        </radialGradient>
        <pattern id={`${furPatternId}-${g1}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <circle cx="2.5" cy="2.5" r="1" fill="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${furPatternId}-${g1})`} />
      <ellipse cx="28" cy="38" rx="12" ry="20" transform="rotate(-15 28 38)" fill={`url(#${g3})`} />
      <ellipse cx="72" cy="38" rx="12" ry="20" transform="rotate(15 72 38)" fill={`url(#${g3})`} />
      <ellipse cx="28" cy="38" rx="8" ry="16" transform="rotate(-15 28 38)" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="72" cy="38" rx="8" ry="16" transform="rotate(15 72 38)" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="50" cy="55" rx="32" ry="28" fill="#a16207" opacity="0.3" />
      <circle cx="50" cy="48" r="28" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="35" cy="40" rx="9" ry="10" fill={`url(#${g2})`} />
      <ellipse cx="65" cy="40" rx="9" ry="10" fill={`url(#${g2})`} />
      <circle cx="35" cy="40" r="5.5" fill="#292524" />
      <circle cx="65" cy="40" r="5.5" fill="#292524" />
      <circle cx="37" cy="38" r="2" fill="white" />
      <circle cx="67" cy="38" r="2" fill="white" />
      <circle cx="34" cy="38" r="1" fill="white" opacity="0.6" />
      <circle cx="64" cy="38" r="1" fill="white" opacity="0.6" />
      <path d="M30 32 Q28 28 32 30" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M70 32 Q72 28 68 30" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M32 30 Q30 26 34 28" fill="none" stroke="#78350f" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M68 30 Q70 26 66 28" fill="none" stroke="#78350f" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <ellipse cx="50" cy="54" rx="8" ry="6" fill={`url(#${g4})`} />
      <ellipse cx="50" cy="52" rx="4" ry="2.5" fill="#292524" />
      <ellipse cx="50" cy="51" rx="1.5" ry="1" fill="white" opacity="0.4" />
      <path d="M46 58 Q50 68 54 58" fill={`url(#${g5})`} />
      <path d="M48 58 L50 54 L52 58 Z" fill="#e11d48" opacity="0.5" />
      <circle cx="22" cy="56" r="4" fill="rgba(255,255,255,0.08)" />
      <circle cx="78" cy="56" r="4" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="50" cy="84" rx="14" ry="6" fill="rgba(255,255,255,0.06)" />
      <circle cx="30" cy="50" r="2" fill="#78350f" opacity="0.3" />
      <circle cx="70" cy="48" r="2.5" fill="#78350f" opacity="0.25" />
      <circle cx="34" cy="54" r="1.5" fill="#78350f" opacity="0.2" />
      <circle cx="66" cy="52" r="1.8" fill="#78350f" opacity="0.2" />
    </svg>
  );
};

export const AvatarUfo: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("ufo-body");
  const g2 = uid("ufo-dome");
  const g3 = uid("ufo-glow");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="40%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
        <radialGradient id={g2} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="40%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <radialGradient id={g3} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <ellipse cx="50" cy="48" rx="36" ry="14" fill="#334155" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <ellipse cx="50" cy="48" rx="36" ry="14" fill="url(#star-sky)" opacity="0.3" />
      <ellipse cx="50" cy="34" rx="18" ry="16" fill={`url(#${g2})`} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <ellipse cx="50" cy="32" rx="14" ry="12" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="50" cy="34" rx="16" ry="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <ellipse cx="50" cy="48" rx="30" ry="10" fill={`url(#${g3})`} />
      <circle cx="50" cy="48" r="2.5" fill="#22d3ee" opacity="0.95">
        <animate attributeName="opacity" values="0.95;0.3;0.95" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="28" cy="48" r="2" fill="#22d3ee" opacity="0.75">
        <animate attributeName="opacity" values="0.75;0.2;0.75" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="72" cy="48" r="2" fill="#22d3ee" opacity="0.75">
        <animate attributeName="opacity" values="0.75;0.2;0.75" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="48" r="1.5" fill="#22d3ee" opacity="0.55">
        <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="82" cy="48" r="1.5" fill="#22d3ee" opacity="0.55">
        <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.5s" begin="0.8s" repeatCount="indefinite" />
      </circle>
      <path d="M30 66 Q50 74 70 66" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M34 70 Q50 78 66 70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeLinecap="round" />
      <path d="M38 74 Q50 82 62 74" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeLinecap="round" />
      <ellipse cx="18" cy="52" rx="3" ry="5" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="82" cy="52" rx="3" ry="5" fill="rgba(255,255,255,0.04)" />
    </svg>
  );
};

export const AvatarPanda: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("panda-body");
  const g2 = uid("panda-dark");
  const g3 = uid("panda-eye");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="40%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <radialGradient id={g2} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="60%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={g3} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.04)" />
      <circle cx="28" cy="32" r="14" fill={`url(#${g2})`} />
      <circle cx="72" cy="32" r="14" fill={`url(#${g2})`} />
      <circle cx="28" cy="32" r="6" fill="rgba(255,255,255,0.06)" />
      <circle cx="72" cy="32" r="6" fill="rgba(255,255,255,0.06)" />
      <circle cx="50" cy="48" r="28" fill="rgba(255,255,255,0.12)" />
      <ellipse cx="36" cy="46" rx="12" ry="13" fill={`url(#${g2})`} transform="rotate(-15 36 46)" />
      <ellipse cx="64" cy="46" rx="12" ry="13" fill={`url(#${g2})`} transform="rotate(15 64 46)" />
      <ellipse cx="36" cy="46" rx="9" ry="10" fill={`url(#${g3})`} transform="rotate(-15 36 46)" />
      <ellipse cx="64" cy="46" rx="9" ry="10" fill={`url(#${g3})`} transform="rotate(15 64 46)" />
      <circle cx="37" cy="45" r="4.5" fill={`url(#${g2})`} />
      <circle cx="63" cy="45" r="4.5" fill={`url(#${g2})`} />
      <circle cx="37" cy="45" r="2.5" fill="#0f172a" />
      <circle cx="63" cy="45" r="2.5" fill="#0f172a" />
      <circle cx="39" cy="43.5" r="1.2" fill="white" />
      <circle cx="65" cy="43.5" r="1.2" fill="white" />
      <circle cx="36" cy="43.5" r="0.8" fill="white" opacity="0.6" />
      <circle cx="62" cy="43.5" r="0.8" fill="white" opacity="0.6" />
      <ellipse cx="50" cy="56" rx="5" ry="4" fill={`url(#${g2})`} />
      <ellipse cx="50" cy="55" rx="2.5" ry="1.5" fill="#0f172a" />
      <path d="M44 60 Q50 66 56 60" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="34" cy="62" r="4" fill={`url(#${g2})`} opacity="0.3" />
      <circle cx="66" cy="62" r="4" fill={`url(#${g2})`} opacity="0.3" />
      <ellipse cx="50" cy="84" rx="12" ry="6" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
};

export const AvatarRooster: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("rooster-body");
  const g2 = uid("rooster-eye");
  const g3 = uid("rooster-comb");
  const g4 = uid("rooster-wattle");
  const g5 = uid("rooster-beak");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={g2} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
        <radialGradient id={g3} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
        <radialGradient id={g4} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
        <radialGradient id={g5} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <pattern id={`${featherPatternId}-${g1}`} width="6" height="8" patternUnits="userSpaceOnUse" patternTransform="scale(0.6)">
          <path d="M0 4 Q3 0 6 4" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />
          <path d="M0 8 Q3 4 6 8" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${featherPatternId}-${g1})`} />
      <path d="M34 26 Q40 8 50 16 Q60 8 66 26 Q60 30 50 28 Q40 30 34 26Z" fill={`url(#${g3})`} />
      <path d="M38 24 Q42 14 50 18 Q58 14 62 24 Q56 26 50 24 Q44 26 38 24Z" fill={`url(#${g4})`} />
      <path d="M44 20 Q46 16 48 18" fill="none" stroke="#991b1b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M52 18 Q54 16 56 20" fill="none" stroke="#991b1b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M40 22 Q42 18 44 20" fill="none" stroke="#991b1b" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="50" cy="46" r="30" fill="rgba(255,255,255,0.06)" />
      <path d="M28 52 Q34 42 40 48 Q46 40 50 44 Q54 40 60 48 Q66 42 72 52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
      <circle cx="34" cy="40" r="8" fill={`url(#${g2})`} />
      <circle cx="66" cy="40" r="8" fill={`url(#${g2})`} />
      <circle cx="34" cy="40" r="4" fill="#1e1b4b" />
      <circle cx="66" cy="40" r="4" fill="#1e1b4b" />
      <circle cx="36" cy="38" r="1.5" fill="white" />
      <circle cx="68" cy="38" r="1.5" fill="white" />
      <circle cx="33" cy="38" r="0.8" fill="white" opacity="0.5" />
      <circle cx="65" cy="38" r="0.8" fill="white" opacity="0.5" />
      <circle cx="34" cy="40" r="9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />
      <circle cx="66" cy="40" r="9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />
      <path d="M44 48 L50 44 L56 48 L50 52Z" fill={`url(#${g5})`} />
      <path d="M46 47 L50 45 L54 47" fill="rgba(255,255,255,0.3)" />
      <ellipse cx="50" cy="55" rx="6" ry="5" fill={`url(#${g3})`} />
      <path d="M46 55 L44 62 Q48 64 50 58 Q52 64 56 62 L54 55" fill={`url(#${g4})`} />
      <path d="M48 56 L50 52 L52 56" fill="rgba(255,255,255,0.15)" />
      <path d="M38 58 Q48 72 58 58" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="56" r="4" fill="rgba(255,255,255,0.06)" />
      <circle cx="78" cy="56" r="4" fill="rgba(255,255,255,0.06)" />
      <line x1="16" y1="60" x2="26" y2="58" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="84" y1="60" x2="74" y2="58" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="50" cy="88" rx="18" ry="6" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
};

export const AvatarTurtle: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g1 = uid("turtle-body");
  const g2 = uid("turtle-shell");
  const g3 = uid("turtle-eye");
  const g4 = uid("turtle-head");
  const g5 = uid("turtle-pattern");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g1} cx="40%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </radialGradient>
        <radialGradient id={g2} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="40%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#065f46" />
        </radialGradient>
        <radialGradient id={g3} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </radialGradient>
        <radialGradient id={g4} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
        <pattern id={`${shellPatternId}-${g1}`} width="14" height="12" patternUnits="userSpaceOnUse" patternTransform="scale(0.7)">
          <polygon points="7,0 14,4 11,12 3,12 0,4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <polygon points="7,2 11,5 9,10 5,10 3,5" fill="rgba(255,255,255,0.04)" />
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g1})`} />
      <path d="M22 48 Q50 10 78 48 Q80 72 50 82 Q20 72 22 48Z" fill={`url(#${g2})`} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <path d="M22 48 Q50 10 78 48 Q80 72 50 82 Q20 72 22 48Z" fill={`url(#${shellPatternId}-${g1})`} />
      <path d="M50 26 Q68 44 50 64 Q32 44 50 26Z" fill="rgba(255,255,255,0.04)" />
      <path d="M36 48 Q50 38 64 48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <path d="M34 56 Q50 46 66 56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <path d="M50 30 L50 64" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <circle cx="50" cy="78" r="14" fill={`url(#${g4})`} />
      <circle cx="50" cy="78" r="12" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="42" cy="76" rx="4" ry="5" fill={`url(#${g3})`} />
      <ellipse cx="58" cy="76" rx="4" ry="5" fill={`url(#${g3})`} />
      <circle cx="42" cy="76" r="2.5" fill="#064e3b" />
      <circle cx="58" cy="76" r="2.5" fill="#064e3b" />
      <circle cx="40.5" cy="74.5" r="1" fill="white" />
      <circle cx="56.5" cy="74.5" r="1" fill="white" />
      <ellipse cx="42" cy="76" rx="1.5" ry="1" fill="white" opacity="0.5" />
      <ellipse cx="58" cy="76" rx="1.5" ry="1" fill="white" opacity="0.5" />
      <path d="M46 82 Q50 85 54 82" fill="none" stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 64 Q14 60 18 64" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M82 64 Q86 60 88 64" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="32" cy="72" rx="5" ry="3" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="68" cy="72" rx="5" ry="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="14" cy="66" r="2" fill="#059669" opacity="0.3" />
      <circle cx="86" cy="66" r="2" fill="#059669" opacity="0.3" />
      <ellipse cx="38" cy="88" rx="5" ry="3" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="62" cy="88" rx="5" ry="3" fill="rgba(255,255,255,0.06)" />
      <path d="M36 86 L38 84 L40 86" fill="none" stroke="#064e3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <path d="M60 86 L62 84 L64 86" fill="none" stroke="#064e3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
};

export const AvatarDragon: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("dragon");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <path d="M15 20 Q25 5 35 20 Q30 15 25 20" fill="#dc2626" />
      <path d="M65 20 Q75 5 85 20 Q80 15 75 20" fill="#dc2626" />
      <path d="M18 18 Q15 8 22 12" fill="#b91c1c" />
      <path d="M82 18 Q85 8 78 12" fill="#b91c1c" />
      <circle cx="50" cy="52" r="32" fill="rgba(255,255,255,0.08)" />
      <path d="M50 38 L43 48 L57 48 Z" fill="#facc15" />
      <path d="M43 48 L57 48 L50 52 Z" fill="#fbbf24" />
      <circle cx="35" cy="42" r="9" fill="white" />
      <circle cx="65" cy="42" r="9" fill="white" />
      <circle cx="35" cy="42" r="4.5" fill="#450a0a" />
      <circle cx="65" cy="42" r="4.5" fill="#450a0a" />
      <circle cx="37" cy="40" r="1.8" fill="white" />
      <circle cx="67" cy="40" r="1.8" fill="white" />
      {blinkOverlay(35, 42, 9.5, 9.5, g)}
      {blinkOverlay(65, 42, 9.5, 9.5, g)}
      <path d="M38 60 Q50 72 62 60 Q50 66 38 60" fill="#facc15" />
      <path d="M15 55 Q10 70 8 80 Q12 72 18 62" fill="#dc2626" />
      <path d="M85 55 Q90 70 92 80 Q88 72 82 62" fill="#dc2626" />
      <ellipse cx="14" cy="55" rx="6" ry="10" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="86" cy="55" rx="6" ry="10" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
};

export const AvatarPhoenix: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("phoenix");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <path d="M25 18 Q20 8 30 10 Q22 8 25 18" fill="#ea580c" />
      <path d="M75 18 Q80 8 70 10 Q78 8 75 18" fill="#ea580c" />
      <path d="M50 20 L42 8 L58 8 Z" fill="#facc15" />
      <circle cx="50" cy="48" r="30" fill="rgba(255,255,255,0.08)" />
      <circle cx="34" cy="40" r="9" fill="white" />
      <circle cx="66" cy="40" r="9" fill="white" />
      <circle cx="34" cy="40" r="4.5" fill="#7c2d12" />
      <circle cx="66" cy="40" r="4.5" fill="#7c2d12" />
      <circle cx="36" cy="38" r="1.8" fill="white" />
      <circle cx="68" cy="38" r="1.8" fill="white" />
      {blinkOverlay(34, 40, 9.5, 9.5, g)}
      {blinkOverlay(66, 40, 9.5, 9.5, g)}
      <path d="M35 58 Q30 68 25 80 Q34 72 40 64" fill="#facc15" />
      <path d="M65 58 Q70 68 75 80 Q66 72 60 64" fill="#facc15" />
      <path d="M42 55 Q50 70 58 55 Q50 62 42 55" fill="#fbbf24" />
      <ellipse cx="15" cy="52" rx="7" ry="12" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="85" cy="52" rx="7" ry="12" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
};

export const AvatarGriffin: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("griffin");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={g} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7e22ce" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#${g})`} />
      <path d="M20 22 L15 8 L30 15 Z" fill="#d8b4fe" />
      <path d="M80 22 L85 8 L70 15 Z" fill="#d8b4fe" />
      <circle cx="50" cy="50" r="28" fill="rgba(255,255,255,0.06)" />
      <circle cx="34" cy="40" r="9" fill="white" />
      <circle cx="66" cy="40" r="9" fill="white" />
      <circle cx="34" cy="40" r="4.5" fill="#3b0764" />
      <circle cx="66" cy="40" r="4.5" fill="#3b0764" />
      <circle cx="36" cy="38" r="1.8" fill="white" />
      <circle cx="68" cy="38" r="1.8" fill="white" />
      {blinkOverlay(34, 40, 9.5, 9.5, g)}
      {blinkOverlay(66, 40, 9.5, 9.5, g)}
      <path d="M38 52 Q44 48 50 44 Q56 48 62 52 Q56 62 44 62 Z" fill="#facc15" />
      <path d="M44 58 Q50 68 56 58" fill="#fbbf24" />
      <ellipse cx="18" cy="52" rx="8" ry="14" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="82" cy="52" rx="8" ry="14" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="40" cy="88" rx="6" ry="4" fill="#d8b4fe" />
      <ellipse cx="60" cy="88" rx="6" ry="4" fill="#d8b4fe" />
    </svg>
  );
};

export interface AvatarDefinition {
  id: string;
  name: string;
  component: React.FC<AvatarSvgProps>;
  premium?: boolean;
}

export const avatars: AvatarDefinition[] = [
  { id: "owl", name: "Owl", component: AvatarOwl },
  { id: "fox", name: "Fox", component: AvatarFox },
  { id: "cat", name: "Cat", component: AvatarCat },
  { id: "dog", name: "Dog", component: AvatarDog },
  { id: "ufo", name: "UFO", component: AvatarUfo, premium: true },
  { id: "panda", name: "Panda", component: AvatarPanda, premium: true },
  { id: "rooster", name: "Rooster", component: AvatarRooster },
  { id: "turtle", name: "Turtle", component: AvatarTurtle },
  { id: "dragon", name: "Dragon", component: AvatarDragon, premium: true },
  { id: "phoenix", name: "Phoenix", component: AvatarPhoenix, premium: true },
  { id: "griffin", name: "Griffin", component: AvatarGriffin, premium: true },
];

export function getAvatarById(id: string) {
  return avatars.find((a) => a.id === id) ?? null;
}
