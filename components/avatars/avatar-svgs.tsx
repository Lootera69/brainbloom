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

function shadowFilter(id: string, dy = 2, blur = 3, opacity = 0.25) {
  return (
    <filter id={id} x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx={0} dy={dy} stdDeviation={blur} floodColor="rgba(0,0,0,0.5)" floodOpacity={opacity} />
    </filter>
  );
}

function glowFilter(id: string, blur = 3) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={blur} result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

function eyeGrad(id: string, c1: string, c2: string) {
  return (
    <radialGradient id={id} cx="35%" cy="35%" r="65%">
      <stop offset="0%" stopColor={c1} />
      <stop offset="50%" stopColor={c2} />
      <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
    </radialGradient>
  );
}

export const AvatarOwl: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("owl");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 5, 0.3)}
        {glowFilter(gl, 1.5)}
        {glowFilter(fs, 10)}
        <radialGradient id={`${g}-body`} cx="45%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="30%" stopColor="#7c3aed" />
          <stop offset="65%" stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#2e1065" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="40%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#2e1065" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-eye`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="60%" stopColor="#faf5ff" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </radialGradient>
        {eyeGrad(`${g}-iris`, "#fbbf24", "#d97706")}
        <radialGradient id={`${g}-beak`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <pattern id={`${g}-tex`} width="6" height="4" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
          <path d="M0 2 Q1.5 0 3 2 Q4.5 4 6 2" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        </pattern>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(167,139,250,0.08)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-body)`} filter={`url(#${s})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-tex)`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-b2)`} />

      {/* Belly feather area */}
      <ellipse cx="50" cy="64" rx="26" ry="20" fill="rgba(255,255,255,0.05)" />
      {/* Feather chevrons on belly */}
      {[58,62,66,70,74].map((cy) => (
        <path key={cy} d={`M${50-(18-(cy-58)*2)} ${cy} Q50 ${cy-4} ${50+(18-(cy-58)*2)} ${cy}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
      ))}

      {/* Ear tufts */}
      <path d="M28 32 Q24 12 34 18 Q30 16 28 32Z" fill="#5b21b6" opacity="0.6" />
      <path d="M72 32 Q76 12 66 18 Q70 16 72 32Z" fill="#5b21b6" opacity="0.6" />
      <ellipse cx="32" cy="20" rx="4.5" ry="9" transform="rotate(-10 32 20)" fill="#7c3aed" filter={`url(#${gl})`} />
      <ellipse cx="68" cy="20" rx="4.5" ry="9" transform="rotate(10 68 20)" fill="#7c3aed" filter={`url(#${gl})`} />
      {/* Ear inner */}
      <ellipse cx="32" cy="20" rx="2.5" ry="6" transform="rotate(-10 32 20)" fill="#a78bfa" opacity="0.3" />
      <ellipse cx="68" cy="20" rx="2.5" ry="6" transform="rotate(10 68 20)" fill="#a78bfa" opacity="0.3" />

      {/* Eyebrow feathers */}
      <path d="M22 38 Q30 30 42 36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M78 38 Q70 30 58 36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" strokeLinecap="round" />

      {/* Eye rings */}
      <circle cx="34" cy="44" r="13" fill={`url(#${g}-eye)`} filter={`url(#${gl})`} />
      <circle cx="66" cy="44" r="13" fill={`url(#${g}-eye)`} filter={`url(#${gl})`} />
      {/* Iris */}
      <circle cx="34" cy="44" r="9" fill={`url(#${g}-iris)`} />
      <circle cx="66" cy="44" r="9" fill={`url(#${g}-iris)`} />
      {/* Pupil */}
      <circle cx="34" cy="44" r="4.5" fill="#1c1917" />
      <circle cx="66" cy="44" r="4.5" fill="#1c1917" />
      {/* Big catchlights */}
      <circle cx="36" cy="41" r="2.8" fill="#fff" />
      <circle cx="68" cy="41" r="2.8" fill="#fff" />
      <circle cx="32" cy="42" r="1.5" fill="#fff" opacity="0.5" />
      <circle cx="64" cy="42" r="1.5" fill="#fff" opacity="0.5" />
      {/* Eye border */}
      <circle cx="34" cy="44" r="14" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <circle cx="66" cy="44" r="14" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

      {/* Beak */}
      <path d="M46 50 L50 44 L54 50 L50 56Z" fill={`url(#${g}-beak)`} filter={`url(#${gl})`} />
      <path d="M48 48 L50 46 L52 48" fill="rgba(255,255,255,0.3)" />
      <path d="M50 44L50 56" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
      {/* Nostril */}
      <circle cx="48" cy="50" r="0.8" fill="#78350f" opacity="0.6" />
      <circle cx="52" cy="50" r="0.8" fill="#78350f" opacity="0.6" />

      {/* Wing shapes */}
      <path d="M16 56 Q10 62 14 72 Q18 64 22 60" fill="rgba(255,255,255,0.04)" />
      <path d="M84 56 Q90 62 86 72 Q82 64 78 60" fill="rgba(255,255,255,0.04)" />
      {/* Wing feather lines */}
      <path d="M16 60 Q20 64 18 68" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
      <path d="M84 60 Q80 64 82 68" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />

      {/* Feet */}
      <ellipse cx="36" cy="88" rx="8" ry="4" fill="#92400e" />
      <ellipse cx="64" cy="88" rx="8" ry="4" fill="#92400e" />
      {/* Talons */}
      <path d="M30 86 L34 84 L38 86 L34 90Z" fill="#b45309" />
      <path d="M58 86 L62 84 L66 86 L62 90Z" fill="#b45309" />
      <path d="M34 90 L34 93 L36 90" fill="#b45309" opacity="0.7" />
      <path d="M62 90 L62 93 L64 90" fill="#b45309" opacity="0.7" />

      {blinkOverlay(34, 44, 13, 13, `${g}-b1`)}
      {blinkOverlay(66, 44, 13, 13, `${g}-b1`)}
    </svg>
  );
};

export const AvatarFox: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("fox");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 4, 0.28)}
        {glowFilter(gl, 1.5)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="45%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="35%" stopColor="#f97316" />
          <stop offset="70%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-chest`} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
        </radialGradient>
        <radialGradient id={`${g}-ear`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="60%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </radialGradient>
        <radialGradient id={`${g}-eye-w`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="60%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </radialGradient>
        {eyeGrad(`${g}-iris`, "#fbbf24", "#b45309")}
        <pattern id={`${g}-tex`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <circle cx="2" cy="2" r="0.6" fill="rgba(0,0,0,0.06)" />
        </pattern>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(251,146,60,0.08)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-body)`} filter={`url(#${s})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-tex)`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-b2)`} />

      {/* Ears */}
      <path d="M28 36 L18 6 L42 28 Z" fill={`url(#${g}-body)`} filter={`url(#${gl})`} />
      <path d="M72 36 L82 6 L58 28 Z" fill={`url(#${g}-body)`} filter={`url(#${gl})`} />
      {/* Ear highlight */}
      <path d="M24 30 L22 14 L38 26 Z" fill="rgba(255,255,255,0.08)" />
      <path d="M76 30 L78 14 L62 26 Z" fill="rgba(255,255,255,0.08)" />
      {/* Inner ear */}
      <ellipse cx="30" cy="26" rx="5.5" ry="9" transform="rotate(-12 30 26)" fill={`url(#${g}-ear)`} filter={`url(#${gl})`} />
      <ellipse cx="70" cy="26" rx="5.5" ry="9" transform="rotate(12 70 26)" fill={`url(#${g}-ear)`} filter={`url(#${gl})`} />
      {/* Inner ear shading */}
      <ellipse cx="30" cy="26" rx="3" ry="5" transform="rotate(-12 30 26)" fill="#9f1239" opacity="0.4" />
      <ellipse cx="70" cy="26" rx="3" ry="5" transform="rotate(12 70 26)" fill="#9f1239" opacity="0.4" />

      {/* Head shape highlight */}
      <ellipse cx="50" cy="42" rx="24" ry="20" fill="rgba(255,255,255,0.04)" />

      {/* Chest/face white area */}
      <ellipse cx="50" cy="56" rx="28" ry="24" fill={`url(#${g}-chest)`} />

      {/* Eyes */}
      <ellipse cx="36" cy="42" rx="8" ry="7" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <ellipse cx="64" cy="42" rx="8" ry="7" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <ellipse cx="36" cy="42" rx="4.5" ry="5" fill={`url(#${g}-iris)`} />
      <ellipse cx="64" cy="42" rx="4.5" ry="5" fill={`url(#${g}-iris)`} />
      <circle cx="36" cy="42" r="3.5" fill="#1c1917" />
      <circle cx="64" cy="42" r="3.5" fill="#1c1917" />
      {/* Catchlights */}
      <circle cx="34" cy="40" r="2" fill="#fff" />
      <circle cx="62" cy="40" r="2" fill="#fff" />
      <circle cx="37" cy="44" r="1" fill="#fff" opacity="0.4" />
      <circle cx="65" cy="44" r="1" fill="#fff" opacity="0.4" />

      {/* Brow */}
      <path d="M28 38 Q36 34 44 38" fill="none" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M56 38 Q64 34 72 38" fill="none" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

      {/* Nose */}
      <ellipse cx="50" cy="54" rx="4" ry="3" fill="#292524" filter={`url(#${gl})`} />
      <ellipse cx="50" cy="53" rx="2" ry="1.2" fill="#1c1917" />
      <ellipse cx="49" cy="52.5" rx="0.8" ry="0.5" fill="rgba(255,255,255,0.15)" />

      {/* Mouth */}
      <path d="M44 58 Q50 64 56 58" fill="none" stroke="#292524" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="57" x2="50" y2="60" stroke="#292524" strokeWidth="1" strokeLinecap="round" />

      {/* Whiskers */}
      <line x1="38" y1="52" x2="26" y2="54" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.25" />
      <line x1="38" y1="54" x2="26" y2="58" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.2" />
      <line x1="62" y1="52" x2="74" y2="54" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.25" />
      <line x1="62" y1="54" x2="74" y2="58" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.2" />

      {/* Cheek fur tufts */}
      <path d="M22 48 Q18 52 22 56 Q26 52 22 48" fill="rgba(255,255,255,0.04)" />
      <path d="M78 48 Q82 52 78 56 Q74 52 78 48" fill="rgba(255,255,255,0.04)" />

      {blinkOverlay(36, 42, 8, 7, `${g}-b1`)}
      {blinkOverlay(64, 42, 8, 7, `${g}-b1`)}
    </svg>
  );
};

export const AvatarCat: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("cat");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 4, 0.28)}
        {glowFilter(gl, 2)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="30%" stopColor="#ec4899" />
          <stop offset="65%" stopColor="#be185d" />
          <stop offset="100%" stopColor="#831843" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="35%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#831843" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-ear`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="60%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#be123c" />
        </radialGradient>
        <radialGradient id={`${g}-eye-w`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="50%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </radialGradient>
        <radialGradient id={`${g}-nose`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </radialGradient>
        {eyeGrad(`${g}-iris`, "#4ade80", "#16a34a")}
        <pattern id={`${g}-tex`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="scale(0.7)">
          <circle cx="2.5" cy="2.5" r="0.7" fill="rgba(0,0,0,0.05)" />
        </pattern>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(244,114,182,0.08)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-body)`} filter={`url(#${s})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-tex)`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-b2)`} />

      {/* Ears */}
      <path d="M26 40 L30 10 L44 32 Z" fill={`url(#${g}-body)`} filter={`url(#${gl})`} />
      <path d="M74 40 L70 10 L56 32 Z" fill={`url(#${g}-body)`} filter={`url(#${gl})`} />
      {/* Ear highlight */}
      <path d="M28 34 L32 16 L41 32Z" fill="rgba(255,255,255,0.08)" />
      <path d="M72 34 L68 16 L59 32Z" fill="rgba(255,255,255,0.08)" />
      {/* Inner ear */}
      <ellipse cx="34" cy="26" rx="5.5" ry="9" transform="rotate(-8 34 26)" fill={`url(#${g}-ear)`} filter={`url(#${gl})`} />
      <ellipse cx="66" cy="26" rx="5.5" ry="9" transform="rotate(8 66 26)" fill={`url(#${g}-ear)`} filter={`url(#${gl})`} />
      <ellipse cx="34" cy="26" rx="3" ry="5" transform="rotate(-8 34 26)" fill="#be123c" opacity="0.4" />
      <ellipse cx="66" cy="26" rx="3" ry="5" transform="rotate(8 66 26)" fill="#be123c" opacity="0.4" />

      {/* Forehead markings */}
      <path d="M38 36 L42 28 L44 36" fill="none" stroke="#9d174d" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M50 34 L50 24 L50 34" fill="none" stroke="#9d174d" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M62 36 L58 28 L56 36" fill="none" stroke="#9d174d" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* Head highlight */}
      <ellipse cx="50" cy="44" rx="22" ry="16" fill="rgba(255,255,255,0.04)" />

      {/* Eyes */}
      <circle cx="34" cy="44" r="11.5" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <circle cx="66" cy="44" r="11.5" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      {/* Cat slit pupils */}
      <ellipse cx="34" cy="44" rx="3" ry="8" fill={`url(#${g}-iris)`} />
      <ellipse cx="66" cy="44" rx="3" ry="8" fill={`url(#${g}-iris)`} />
      <ellipse cx="34" cy="44" rx="1.8" ry="6.5" fill="#1c1917" />
      <ellipse cx="66" cy="44" rx="1.8" ry="6.5" fill="#1c1917" />
      {/* Catchlights */}
      <circle cx="32" cy="40" r="2" fill="#fff" />
      <circle cx="64" cy="40" r="2" fill="#fff" />
      <circle cx="35" cy="40" r="1" fill="#fff" opacity="0.5" />
      <circle cx="67" cy="40" r="1" fill="#fff" opacity="0.5" />
      {/* Eye shadow */}
      <path d="M22 38 Q34 32 44 40" fill="none" stroke="#9d174d" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M56 40 Q66 32 78 38" fill="none" stroke="#9d174d" strokeWidth="1" strokeLinecap="round" opacity="0.3" />

      {/* Nose */}
      <ellipse cx="50" cy="55" rx="3" ry="2.5" fill={`url(#${g}-nose)`} filter={`url(#${gl})`} />
      <ellipse cx="50" cy="54" rx="1.5" ry="1" fill="#be185d" />

      {/* Mouth */}
      <path d="M48 58 L50 56 L52 58" fill="none" stroke="#be185d" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M42 60 Q50 66 58 60" fill="none" stroke="#be185d" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />

      {/* Whiskers */}
      <line x1="26" y1="56" x2="16" y2="58" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.25" />
      <line x1="28" y1="58" x2="18" y2="62" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.2" />
      <line x1="28" y1="60" x2="20" y2="64" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.15" />
      <line x1="74" y1="56" x2="84" y2="58" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.25" />
      <line x1="72" y1="58" x2="82" y2="62" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.2" />
      <line x1="72" y1="60" x2="80" y2="64" stroke="#1c1917" strokeWidth="0.7" strokeLinecap="round" opacity="0.15" />

      {/* Paws */}
      <ellipse cx="20" cy="72" rx="10" ry="8" fill="#be185d" opacity="0.5" />
      <ellipse cx="80" cy="72" rx="10" ry="8" fill="#be185d" opacity="0.5" />
      {/* Paw pads */}
      <ellipse cx="18" cy="70" rx="2" ry="1.5" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="22" cy="72" rx="2" ry="1.5" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="78" cy="70" rx="2" ry="1.5" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="82" cy="72" rx="2" ry="1.5" fill="rgba(255,255,255,0.1)" />

      {/* Body side wisps */}
      <ellipse cx="16" cy="62" rx="8" ry="12" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="84" cy="62" rx="8" ry="12" fill="rgba(255,255,255,0.04)" />

      {blinkOverlay(34, 44, 11.5, 11.5, `${g}-b1`)}
      {blinkOverlay(66, 44, 11.5, 11.5, `${g}-b1`)}
    </svg>
  );
};

export const AvatarDog: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("dog");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 4, 0.28)}
        {glowFilter(gl, 1.5)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="45%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#eab308" />
          <stop offset="25%" stopColor="#ca8a04" />
          <stop offset="65%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#713f12" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#eab308" />
          <stop offset="40%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#713f12" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-ear`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#854d0e" />
          <stop offset="50%" stopColor="#713f12" />
          <stop offset="100%" stopColor="#422006" />
        </radialGradient>
        <radialGradient id={`${g}-eye-w`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="50%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </radialGradient>
        {eyeGrad(`${g}-iris`, "#f59e0b", "#92400e")}
        <radialGradient id={`${g}-nose`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#44403c" />
          <stop offset="60%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </radialGradient>
        <radialGradient id={`${g}-tongue`} cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="60%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </radialGradient>
        <radialGradient id={`${g}-snout`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </radialGradient>
        <pattern id={`${g}-tex`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="scale(0.6)">
          <circle cx="2" cy="2" r="0.8" fill="rgba(0,0,0,0.05)" />
        </pattern>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(234,179,8,0.08)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-body)`} filter={`url(#${s})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-tex)`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-b2)`} />

      {/* Floppy ears */}
      <ellipse cx="28" cy="38" rx="12" ry="24" transform="rotate(-18 28 38)" fill={`url(#${g}-ear)`} filter={`url(#${s})`} />
      <ellipse cx="72" cy="38" rx="12" ry="24" transform="rotate(18 72 38)" fill={`url(#${g}-ear)`} filter={`url(#${s})`} />
      {/* Inner ear */}
      <ellipse cx="28" cy="38" rx="7" ry="18" transform="rotate(-18 28 38)" fill="#a16207" opacity="0.5" />
      <ellipse cx="72" cy="38" rx="7" ry="18" transform="rotate(18 72 38)" fill="#a16207" opacity="0.5" />

      {/* Snout area */}
      <ellipse cx="50" cy="56" rx="30" ry="26" fill={`url(#${g}-snout)`} opacity="0.5" />

      {/* Head highlight */}
      <circle cx="50" cy="46" r="26" fill="rgba(255,255,255,0.05)" />

      {/* Eyebrows */}
      <path d="M28 32 Q34 26 42 30" fill="none" stroke="#713f12" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M58 30 Q66 26 72 32" fill="none" stroke="#713f12" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* Eyes */}
      <ellipse cx="34" cy="40" rx="11" ry="12" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <ellipse cx="66" cy="40" rx="11" ry="12" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <circle cx="34" cy="40" r="7" fill={`url(#${g}-iris)`} />
      <circle cx="66" cy="40" r="7" fill={`url(#${g}-iris)`} />
      <circle cx="34" cy="40" r="5" fill="#1c1917" />
      <circle cx="66" cy="40" r="5" fill="#1c1917" />
      {/* Big puppy eyes catchlights */}
      <circle cx="36" cy="37" r="2.5" fill="#fff" />
      <circle cx="68" cy="37" r="2.5" fill="#fff" />
      <circle cx="32" cy="38" r="1.5" fill="#fff" opacity="0.5" />
      <circle cx="64" cy="38" r="1.5" fill="#fff" opacity="0.5" />

      {/* Nose */}
      <ellipse cx="50" cy="56" rx="8" ry="6" fill={`url(#${g}-nose)`} filter={`url(#${gl})`} />
      <ellipse cx="50" cy="54.5" rx="4" ry="2.5" fill="#292524" />
      {/* Nose highlight */}
      <ellipse cx="48" cy="53.5" rx="2" ry="1" fill="rgba(255,255,255,0.2)" />

      {/* Mouth */}
      <path d="M44 62 L50 58 L56 62" fill="none" stroke="#292524" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M46 62 Q50 70 54 62" fill={`url(#${g}-tongue)`} opacity="0.9" />
      <path d="M48 62 L50 58 L52 62Z" fill="#be123c" opacity="0.5" />
      <path d="M50 66 L50 68" stroke="#be123c" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />

      {/* Cheek spots */}
      <circle cx="22" cy="56" r="5" fill="#713f12" opacity="0.12" />
      <circle cx="78" cy="56" r="5" fill="#713f12" opacity="0.12" />
      <circle cx="28" cy="50" r="3.5" fill="#713f12" opacity="0.1" />
      <circle cx="72" cy="50" r="3.5" fill="#713f12" opacity="0.1" />
      <circle cx="32" cy="54" r="2.5" fill="#713f12" opacity="0.08" />
      <circle cx="68" cy="54" r="2.5" fill="#713f12" opacity="0.08" />

      {/* Body/belly */}
      <ellipse cx="50" cy="82" rx="16" ry="8" fill="rgba(255,255,255,0.05)" />

      {/* Paw pads */}
      <ellipse cx="30" cy="86" rx="6" ry="4" fill="rgba(255,255,255,0.03)" />
      <ellipse cx="70" cy="86" rx="6" ry="4" fill="rgba(255,255,255,0.03)" />

      {blinkOverlay(34, 40, 10.5, 11.5, `${g}-b1`)}
      {blinkOverlay(66, 40, 10.5, 11.5, `${g}-b1`)}
    </svg>
  );
};

export const AvatarUfo: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("ufo");
  const s = `${g}-s`;
  const gs = `${g}-gs`;
  const fs = `${g}-fs`;
  const fs2 = `${g}-fs2`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 4, 6, 0.35)}
        {glowFilter(gs, 2)}
        {glowFilter(fs, 6)}
        {glowFilter(fs2, 14)}
        <radialGradient id={`${g}-body`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="40%" stopColor="#475569" />
          <stop offset="75%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="40%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${g}-dome`} cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="30%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <radialGradient id={`${g}-dome2`} cx="35%" cy="20%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${g}-beam`} cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-metallic`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
        </linearGradient>
      </defs>

      {/* Ambient glow behind */}
      <circle cx="50" cy="48" r="46" fill="rgba(34,211,238,0.08)" filter={`url(#${fs2})`} />

      {/* Tractor beam */}
      <path d="M30 60 L22 96 L78 96 L70 60 Z" fill={`url(#${g}-beam)`} />

      {/* Main saucer body */}
      <circle cx="50" cy="48" r="42" fill={`url(#${g}-body)`} filter={`url(#${s})`} />

      {/* Metallic sheen over body */}
      <circle cx="50" cy="48" r="42" fill={`url(#${g}-metallic)`} />

      {/* Top saucer ring */}
      <ellipse cx="50" cy="38" rx="38" ry="12" fill="#475569" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <ellipse cx="50" cy="38" rx="38" ry="12" fill={`url(#${g}-glow)`} />

      {/* Panel lines on saucer */}
      <path d="M14 48 L86 48" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
      <path d="M16 44 L84 44" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      <path d="M18 52 L82 52" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      {/* Vertical panel lines */}
      <path d="M22 40 L18 56" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4" />
      <path d="M36 37 L32 53" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4" />
      <path d="M50 36 L50 54" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
      <path d="M64 37 L68 53" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4" />
      <path d="M78 40 L82 56" stroke="rgba(255,255,255,0.03)" strokeWidth="0.4" />

      {/* Rivet dots along panel */}
      {[18,26,34,42,50,58,66,74,82].map((cx) => (
        <circle key={cx} cx={cx} cy={44} r="0.8" fill="rgba(255,255,255,0.08)" />
      ))}
      {[18,26,34,42,50,58,66,74,82].map((cx) => (
        <circle key={cx} cx={cx} cy={52} r="0.8" fill="rgba(255,255,255,0.06)" />
      ))}

      {/* Lower saucer ring */}
      <ellipse cx="50" cy="56" rx="36" ry="10" fill="#334155" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />

      {/* Dome base ring */}
      <ellipse cx="50" cy="34" rx="20" ry="6" fill="#475569" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />

      {/* Glass dome */}
      <ellipse cx="50" cy="30" rx="18" ry="16" fill={`url(#${g}-dome)`} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <ellipse cx="50" cy="28" rx="14" ry="12" fill={`url(#${g}-dome2)`} />
      {/* Dome reflection arc */}
      <path d="M36 24 Q44 18 56 22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Alien silhouette inside dome */}
      <ellipse cx="50" cy="32" rx="6" ry="8" fill="#0f172a" opacity="0.5" />
      <ellipse cx="50" cy="30" rx="5" ry="5" fill="#0f172a" opacity="0.6" />
      {/* Alien eyes */}
      <ellipse cx="47" cy="29" rx="2.5" ry="3" fill="#22d3ee" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="53" cy="29" rx="2.5" ry="3" fill="#22d3ee" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </ellipse>
      <circle cx="47" cy="29" r="0.8" fill="white" opacity="0.6" />
      <circle cx="53" cy="29" r="0.8" fill="white" opacity="0.6" />

      {/* Glowing lights on saucer rim */}
      <circle cx="50" cy="48" r="3.5" fill="#22d3ee" filter={`url(#${gs})`} opacity="0.95">
        <animate attributeName="opacity" values="0.95;0.3;0.95" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="26" cy="48" r="2.5" fill="#22d3ee" filter={`url(#${gs})`} opacity="0.75">
        <animate attributeName="opacity" values="0.75;0.2;0.75" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="74" cy="48" r="2.5" fill="#22d3ee" filter={`url(#${gs})`} opacity="0.75">
        <animate attributeName="opacity" values="0.75;0.2;0.75" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="48" r="2" fill="#22d3ee" filter={`url(#${gs})`} opacity="0.55">
        <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="84" cy="48" r="2" fill="#22d3ee" filter={`url(#${gs})`} opacity="0.55">
        <animate attributeName="opacity" values="0.55;0.15;0.55" dur="1.5s" begin="0.8s" repeatCount="indefinite" />
      </circle>

      {/* Additional rim lights */}
      <circle cx="12" cy="50" r="1.2" fill="#67e8f9" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="50" r="1.2" fill="#67e8f9" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s" begin="0.7s" repeatCount="indefinite" />
      </circle>
      <circle cx="38" cy="54" r="1" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="54" r="1" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" begin="0.6s" repeatCount="indefinite" />
      </circle>

      {/* Underbelly glow */}
      <ellipse cx="50" cy="56" rx="28" ry="8" fill="rgba(34,211,238,0.06)" />

      {/* Bottom exhaust/tech details */}
      <ellipse cx="50" cy="58" rx="14" ry="4" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.6" />
      <ellipse cx="50" cy="60" rx="8" ry="3" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="0.5" />
      <circle cx="44" cy="60" r="1" fill="rgba(34,211,238,0.15)" />
      <circle cx="50" cy="60" r="1" fill="rgba(34,211,238,0.15)" />
      <circle cx="56" cy="60" r="1" fill="rgba(34,211,238,0.15)" />

      {/* Floating particles */}
      <circle cx="8" cy="36" r="0.8" fill="#67e8f9" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="92" cy="40" r="0.8" fill="#67e8f9" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="6" cy="52" r="0.6" fill="#67e8f9" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="94" cy="30" r="0.6" fill="#67e8f9" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0;0.2" dur="4.5s" repeatCount="indefinite" />
      </circle>

      {/* Bottom energy arcs */}
      <path d="M30 62 Q50 70 70 62" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="1" strokeLinecap="round" />
      <path d="M34 66 Q50 74 66 66" fill="none" stroke="rgba(34,211,238,0.05)" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M38 70 Q50 78 62 70" fill="none" stroke="rgba(34,211,238,0.03)" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
};

export const AvatarPanda: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("panda");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 4, 0.3)}
        {glowFilter(gl, 1.5)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="35%" stopColor="#f1f5f9" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-dark`} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${g}-ear-dark`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${g}-eye-w`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
        <radialGradient id={`${g}-iris`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${g}-nose`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${g}-cheek`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${g}-bamboo`} cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
      </defs>

      {/* Soft ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.04)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="52" r="46" fill={`url(#${g}-body)`} filter={`url(#${s})`} />
      <circle cx="50" cy="52" r="46" fill={`url(#${g}-b2)`} />

      {/* Ears */}
      <circle cx="26" cy="30" r="16" fill={`url(#${g}-ear-dark)`} filter={`url(#${s})`} />
      <circle cx="74" cy="30" r="16" fill={`url(#${g}-ear-dark)`} filter={`url(#${s})`} />
      {/* Inner ear */}
      <circle cx="26" cy="30" r="8" fill={`url(#${g}-dark)`} opacity="0.5" />
      <circle cx="74" cy="30" r="8" fill={`url(#${g}-dark)`} opacity="0.5" />

      {/* Head highlight */}
      <circle cx="50" cy="46" r="30" fill="rgba(255,255,255,0.06)" />

      {/* Eye patches */}
      <ellipse cx="36" cy="46" rx="13" ry="14" fill={`url(#${g}-dark)`} transform="rotate(-15 36 46)" filter={`url(#${s})`} />
      <ellipse cx="64" cy="46" rx="13" ry="14" fill={`url(#${g}-dark)`} transform="rotate(15 64 46)" filter={`url(#${s})`} />

      {/* Eyes */}
      <ellipse cx="36" cy="46" rx="10" ry="11" fill={`url(#${g}-eye-w)`} transform="rotate(-15 36 46)" filter={`url(#${gl})`} />
      <ellipse cx="64" cy="46" rx="10" ry="11" fill={`url(#${g}-eye-w)`} transform="rotate(15 64 46)" filter={`url(#${gl})`} />
      {/* Iris */}
      <circle cx="37" cy="45" r="6" fill={`url(#${g}-iris)`} />
      <circle cx="63" cy="45" r="6" fill={`url(#${g}-iris)`} />
      {/* Pupil */}
      <circle cx="37" cy="45" r="3.5" fill="#0f172a" />
      <circle cx="63" cy="45" r="3.5" fill="#0f172a" />
      {/* Big catchlights (cute moe style) */}
      <circle cx="40" cy="42" r="2" fill="white" opacity="0.95" />
      <circle cx="66" cy="42" r="2" fill="white" opacity="0.95" />
      <circle cx="35" cy="43" r="1.2" fill="white" opacity="0.6" />
      <circle cx="61" cy="43" r="1.2" fill="white" opacity="0.6" />
      <circle cx="38" cy="47.5" r="0.7" fill="white" opacity="0.3" />
      <circle cx="64" cy="47.5" r="0.7" fill="white" opacity="0.3" />

      {/* Cheek blush */}
      <ellipse cx="26" cy="56" rx="7" ry="4.5" fill={`url(#${g}-cheek)`} />
      <ellipse cx="74" cy="56" rx="7" ry="4.5" fill={`url(#${g}-cheek)`} />

      {/* Nose */}
      <ellipse cx="50" cy="56" rx="5.5" ry="4.5" fill={`url(#${g}-nose)`} filter={`url(#${gl})`} />
      <ellipse cx="50" cy="55" rx="3" ry="2" fill="#1e293b" />
      {/* Nose highlight */}
      <ellipse cx="49" cy="54" rx="1.2" ry="0.8" fill="rgba(255,255,255,0.15)" />

      {/* Mouth */}
      <path d="M44 60 Q50 66 56 60" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="60" x2="50" y2="63" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cheek fluff */}
      <path d="M22 52 Q18 56 22 60 Q26 56 22 52" fill="#f1f5f9" opacity="0.5" />
      <path d="M78 52 Q82 56 78 60 Q74 56 78 52" fill="#f1f5f9" opacity="0.5" />
      <path d="M20 54 Q16 58 20 62" fill="none" stroke="#e2e8f0" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <path d="M80 54 Q84 58 80 62" fill="none" stroke="#e2e8f0" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />

      {/* Arms/paws */}
      <ellipse cx="24" cy="74" rx="12" ry="10" fill={`url(#${g}-dark)`} filter={`url(#${s})`} opacity="0.9" />
      <ellipse cx="76" cy="74" rx="12" ry="10" fill={`url(#${g}-dark)`} filter={`url(#${s})`} opacity="0.9" />
      {/* Paw pads */}
      <circle cx="20" cy="72" r="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="24" cy="76" r="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="28" cy="72" r="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="72" cy="72" r="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="76" cy="76" r="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="80" cy="72" r="3" fill="rgba(255,255,255,0.08)" />

      {/* Feet */}
      <ellipse cx="36" cy="88" rx="12" ry="7" fill={`url(#${g}-dark)`} opacity="0.8" />
      <ellipse cx="64" cy="88" rx="12" ry="7" fill={`url(#${g}-dark)`} opacity="0.8" />
      {/* Toe pads */}
      <circle cx="30" cy="87" r="2.5" fill="rgba(255,255,255,0.06)" />
      <circle cx="36" cy="89" r="2.5" fill="rgba(255,255,255,0.06)" />
      <circle cx="42" cy="87" r="2.5" fill="rgba(255,255,255,0.06)" />
      <circle cx="58" cy="87" r="2.5" fill="rgba(255,255,255,0.06)" />
      <circle cx="64" cy="89" r="2.5" fill="rgba(255,255,255,0.06)" />
      <circle cx="70" cy="87" r="2.5" fill="rgba(255,255,255,0.06)" />

      {/* Bamboo leaf in mouth */}
      <path d="M50 58 L46 52 L44 48 Q48 50 50 54 Z" fill={`url(#${g}-bamboo)`} opacity="0.9" />
      <path d="M46 52 L42 46 Q46 48 48 52 Z" fill={`url(#${g}-bamboo)`} opacity="0.7" />
      <line x1="50" y1="58" x2="44" y2="48" stroke="#15803d" strokeWidth="0.5" opacity="0.5" />
      <line x1="46" y1="52" x2="42" y2="46" stroke="#15803d" strokeWidth="0.4" opacity="0.4" />

      {/* Belly */}
      <ellipse cx="50" cy="82" rx="16" ry="8" fill="rgba(255,255,255,0.05)" />

      {blinkOverlay(37, 45, 5.5, 5.5, `${g}-b1`)}
      {blinkOverlay(63, 45, 5.5, 5.5, `${g}-b1`)}
    </svg>
  );
};

export const AvatarRooster: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("rooster");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 4, 0.28)}
        {glowFilter(gl, 1.5)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="45%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="30%" stopColor="#ea580c" />
          <stop offset="65%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-comb`} cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="40%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
        <radialGradient id={`${g}-comb2`} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-wattle`} cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
        <radialGradient id={`${g}-beak`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <radialGradient id={`${g}-eye-w`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="50%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
        <radialGradient id={`${g}-tail`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        {eyeGrad(`${g}-iris`, "#f59e0b", "#92400e")}
        <pattern id={`${g}-tex`} width="5" height="6" patternUnits="userSpaceOnUse" patternTransform="scale(0.7)">
          <path d="M0 3 Q2.5 0 5 3" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(249,115,22,0.08)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-body)`} filter={`url(#${s})`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-tex)`} />
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-b2)`} />

      {/* Tail feathers */}
      <path d="M18 68 Q8 56 4 44 Q10 52 16 60" fill={`url(#${g}-tail)`} opacity="0.6" />
      <path d="M82 68 Q92 56 96 44 Q90 52 84 60" fill={`url(#${g}-tail)`} opacity="0.6" />
      <path d="M20 72 Q8 64 6 52 Q12 58 18 66" fill={`url(#${g}-tail)`} opacity="0.4" />
      <path d="M80 72 Q92 64 94 52 Q88 58 82 66" fill={`url(#${g}-tail)`} opacity="0.4" />
      <path d="M22 76 Q12 70 10 60 Q16 64 20 70" fill="#ea580c" opacity="0.3" />
      <path d="M78 76 Q88 70 90 60 Q84 64 80 70" fill="#ea580c" opacity="0.3" />

      {/* Comb (crown) */}
      <path d="M34 26 Q40 4 50 12 Q60 4 66 26 Q56 30 50 28 Q44 30 34 26Z" fill={`url(#${g}-comb)`} filter={`url(#${s})`} />
      {/* Comb highlight */}
      <path d="M38 24 Q42 12 50 16 Q58 12 62 24 Q56 26 50 24 Q44 26 38 24Z" fill={`url(#${g}-comb2)`} />
      {/* Comb bumps */}
      <path d="M44 20 Q46 16 48 18" fill="none" stroke="#991b1b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M52 18 Q54 16 56 20" fill="none" stroke="#991b1b" strokeWidth="0.8" strokeLinecap="round" />

      {/* Head highlight */}
      <circle cx="50" cy="44" r="28" fill="rgba(255,255,255,0.05)" />

      {/* Eyes */}
      <circle cx="34" cy="40" r="10" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <circle cx="66" cy="40" r="10" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <circle cx="34" cy="40" r="5.5" fill={`url(#${g}-iris)`} />
      <circle cx="66" cy="40" r="5.5" fill={`url(#${g}-iris)`} />
      <circle cx="34" cy="40" r="4" fill="#1c1917" />
      <circle cx="66" cy="40" r="4" fill="#1c1917" />
      {/* Catchlights */}
      <circle cx="36" cy="37" r="2.2" fill="#fff" />
      <circle cx="68" cy="37" r="2.2" fill="#fff" />
      <circle cx="33" cy="38" r="1" fill="#fff" opacity="0.5" />
      <circle cx="65" cy="38" r="1" fill="#fff" opacity="0.5" />
      {/* Eye ring */}
      <circle cx="34" cy="40" r="11" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
      <circle cx="66" cy="40" r="11" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />

      {/* Beak */}
      <path d="M44 48 L50 44 L56 48 L50 52Z" fill={`url(#${g}-beak)`} filter={`url(#${gl})`} />
      <path d="M46 47 L50 45 L54 47" fill="rgba(255,255,255,0.25)" />
      <path d="M50 44L50 52" stroke="#78350f" strokeWidth="0.6" />
      {/* Nostril */}
      <circle cx="48" cy="49" r="0.6" fill="#78350f" opacity="0.5" />
      <circle cx="52" cy="49" r="0.6" fill="#78350f" opacity="0.5" />

      {/* Wattle (chin) */}
      <ellipse cx="50" cy="56" rx="6" ry="5" fill={`url(#${g}-comb)`} filter={`url(#${gl})`} />
      <path d="M46 56 L44 64 Q48 66 50 58 Q52 66 56 64 L54 56" fill={`url(#${g}-wattle)`} filter={`url(#${s})`} />
      <path d="M48 58 L50 54 L52 58" fill="rgba(255,255,255,0.12)" />

      {/* Chest feathers */}
      <path d="M38 60 Q48 76 58 60" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M40 64 Q48 78 56 64" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M42 68 Q48 80 54 68" fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

      {/* Wing detail */}
      <ellipse cx="26" cy="68" rx="6" ry="8" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="74" cy="68" rx="6" ry="8" fill="rgba(255,255,255,0.04)" />
      {/* Wing feather lines */}
      <path d="M22 64 Q26 60 30 64" fill="none" stroke="#ea580c" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M70 64 Q74 60 78 64" fill="none" stroke="#ea580c" strokeWidth="1" strokeLinecap="round" opacity="0.3" />

      {/* Feet */}
      <ellipse cx="50" cy="88" rx="20" ry="7" fill="rgba(255,255,255,0.05)" />
      <line x1="36" y1="88" x2="30" y2="88" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="64" y1="88" x2="70" y2="88" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {blinkOverlay(34, 40, 10, 10, `${g}-b1`)}
      {blinkOverlay(66, 40, 10, 10, `${g}-b1`)}
    </svg>
  );
};

export const AvatarTurtle: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("turtle");
  const s = `${g}-s`;
  const gl = `${g}-gl`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 3, 5, 0.3)}
        {glowFilter(gl, 1.5)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="35%" stopColor="#10b981" />
          <stop offset="70%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <radialGradient id={`${g}-shell`} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="30%" stopColor="#34d399" />
          <stop offset="65%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022c22" />
        </radialGradient>
        <radialGradient id={`${g}-shell2`} cx="45%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-b2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={`${g}-head`} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </radialGradient>
        <radialGradient id={`${g}-eye-w`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="50%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </radialGradient>
        {eyeGrad(`${g}-iris`, "#10b981", "#064e3b")}
        <pattern id={`${g}-shell-tex`} width="14" height="12" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <polygon points="7,0 14,4 11,12 3,12 0,4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
          <polygon points="7,3 10,5 9,10 5,10 4,5" fill="rgba(255,255,255,0.04)" />
        </pattern>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="47" fill="rgba(52,211,153,0.08)" filter={`url(#${fs})`} />

      {/* Body */}
      <circle cx="50" cy="50" r="47" fill={`url(#${g}-body)`} filter={`url(#${s})`} />

      {/* Shell */}
      <path d="M20 48 Q50 4 80 48 Q82 74 50 86 Q18 74 20 48Z" fill={`url(#${g}-shell)`} filter={`url(#${s})`} />
      {/* Shell highlight */}
      <path d="M20 48 Q50 4 80 48 Q82 74 50 86 Q18 74 20 48Z" fill={`url(#${g}-shell2)`} />
      {/* Shell hexagonal texture */}
      <path d="M20 48 Q50 4 80 48 Q82 74 50 86 Q18 74 20 48Z" fill={`url(#${g}-shell-tex)`} />
      {/* Shell scute lines */}
      <path d="M50 22 Q68 42 50 66 Q32 42 50 22Z" fill="rgba(255,255,255,0.04)" />
      <path d="M34 48 Q50 36 66 48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <path d="M32 56 Q50 44 68 56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <path d="M50 22 L50 66" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      {/* Additional shell detail lines */}
      <path d="M28 44 Q38 40 42 44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
      <path d="M58 44 Q62 40 72 44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
      <path d="M26 52 Q36 48 44 52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
      <path d="M56 52 Q64 48 74 52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
      <path d="M30 60 Q38 56 46 60" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />
      <path d="M54 60 Q62 56 70 60" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />

      {/* Head */}
      <circle cx="50" cy="78" r="15" fill={`url(#${g}-head)`} filter={`url(#${s})`} />
      <circle cx="50" cy="78" r="13" fill="rgba(255,255,255,0.06)" />

      {/* Cheek highlights */}
      <ellipse cx="36" cy="78" rx="4" ry="3" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="64" cy="78" rx="4" ry="3" fill="rgba(255,255,255,0.04)" />

      {/* Eyes */}
      <ellipse cx="42" cy="76" rx="5" ry="6" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <ellipse cx="58" cy="76" rx="5" ry="6" fill={`url(#${g}-eye-w)`} filter={`url(#${gl})`} />
      <circle cx="42" cy="76" r="3.5" fill={`url(#${g}-iris)`} />
      <circle cx="58" cy="76" r="3.5" fill={`url(#${g}-iris)`} />
      <circle cx="42" cy="76" r="2.5" fill="#064e3b" />
      <circle cx="58" cy="76" r="2.5" fill="#064e3b" />
      {/* Catchlights */}
      <circle cx="40.5" cy="74" r="1.5" fill="#fff" />
      <circle cx="56.5" cy="74" r="1.5" fill="#fff" />
      <circle cx="43" cy="78" r="0.8" fill="#fff" opacity="0.4" />
      <circle cx="59" cy="78" r="0.8" fill="#fff" opacity="0.4" />

      {/* Mouth */}
      <path d="M46 82 Q50 86 54 82" fill="none" stroke="#064e3b" strokeWidth="1.5" strokeLinecap="round" />

      {/* Forelegs */}
      <path d="M14 64 Q10 68 16 74 Q18 68 16 64" fill={`url(#${g}-head)`} opacity="0.8" />
      <path d="M86 64 Q90 68 84 74 Q82 68 84 64" fill={`url(#${g}-head)`} opacity="0.8" />
      {/* Foreleg claws */}
      <path d="M12 74 L10 77 L14 74" fill="none" stroke="#064e3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <path d="M88 74 L90 77 L86 74" fill="none" stroke="#064e3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />

      {/* Hind legs */}
      <ellipse cx="38" cy="88" rx="6" ry="4" fill="rgba(255,255,255,0.05)" />
      <ellipse cx="62" cy="88" rx="6" ry="4" fill="rgba(255,255,255,0.05)" />
      {/* Toe claws */}
      <path d="M36 86 L38 84 L40 86" fill="none" stroke="#064e3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <path d="M60 86 L62 84 L64 86" fill="none" stroke="#064e3b" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />

      {/* Skin texture dots */}
      <circle cx="34" cy="78" r="0.8" fill="#047857" opacity="0.3" />
      <circle cx="66" cy="78" r="0.8" fill="#047857" opacity="0.3" />
      <circle cx="38" cy="80" r="0.6" fill="#047857" opacity="0.2" />
      <circle cx="62" cy="80" r="0.6" fill="#047857" opacity="0.2" />

      {blinkOverlay(42, 76, 4.5, 5.5, `${g}-b1`)}
      {blinkOverlay(58, 76, 4.5, 5.5, `${g}-b1`)}
    </svg>
  );
};

export const AvatarDragon: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("dragon");
  const s = `${g}-s`;
  const gs = `${g}-gs`;
  const fs = `${g}-fs`;
  const fs2 = `${g}-fs2`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 4, 6, 0.35)}
        {glowFilter(gs, 3)}
        {glowFilter(fs, 6)}
        {glowFilter(fs2, 10)}
        <radialGradient id={`${g}-body`} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="35%" stopColor="#dc2626" />
          <stop offset="70%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#450a0a" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="40%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id={`${g}-belly`} cx="50%" cy="60%" r="40%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${g}-eye-iris`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </radialGradient>
        <radialGradient id={`${g}-horn`} cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="60%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <radialGradient id={`${g}-fire`} cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#facc15" />
          <stop offset="60%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-scale`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
        </linearGradient>
      </defs>

      {/* Shadow glow behind dragon */}
      <circle cx="50" cy="55" r="48" fill="rgba(220,38,38,0.15)" filter={`url(#${fs2})`} />

      {/* Body */}
      <circle cx="50" cy="52" r="46" fill={`url(#${g}-body)`} filter={`url(#${s})`} />

      {/* Scale pattern overlay */}
      <circle cx="50" cy="52" r="46" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      {[34,38,42,46,50,54,58,62,66].map((cx) => (
        <ellipse key={cx} cx={cx} cy={56} rx="1.5" ry="2.5" fill={`url(#${g}-scale)`} opacity="0.3" />
      ))}
      {[36,40,44,48,52,56,60,64].map((cx) => (
        <ellipse key={cx} cx={cx} cy={60} rx="1.5" ry="2.5" fill={`url(#${g}-scale)`} opacity="0.25" />
      ))}
      {[38,42,46,50,54,58,62].map((cx) => (
        <ellipse key={cx} cx={cx} cy={64} rx="1.5" ry="2.5" fill={`url(#${g}-scale)`} opacity="0.2" />
      ))}
      {[40,44,48,52,56,60].map((cx) => (
        <ellipse key={cx} cx={cx} cy={68} rx="1.5" ry="2.5" fill={`url(#${g}-scale)`} opacity="0.15" />
      ))}
      {[42,46,50,54,58].map((cx) => (
        <ellipse key={cx} cx={cx} cy={72} rx="1.5" ry="2.5" fill={`url(#${g}-scale)`} opacity="0.1" />
      ))}

      {/* Belly glow */}
      <ellipse cx="50" cy="62" rx="22" ry="18" fill={`url(#${g}-belly)`} />

      {/* Horns */}
      <path d="M20 24 Q18 8 26 6 Q24 14 26 22" fill={`url(#${g}-horn)`} filter={`url(#${gs})`} opacity="0.9" />
      <path d="M80 24 Q82 8 74 6 Q76 14 74 22" fill={`url(#${g}-horn)`} filter={`url(#${gs})`} opacity="0.9" />
      <path d="M14 30 Q8 16 18 12 Q14 20 18 28" fill={`url(#${g}-horn)`} opacity="0.7" />
      <path d="M86 30 Q92 16 82 12 Q86 20 82 28" fill={`url(#${g}-horn)`} opacity="0.7" />

      {/* Spines down back */}
      <path d="M24 34 L20 26 L28 32" fill="#facc15" opacity="0.8" />
      <path d="M76 34 L80 26 L72 32" fill="#facc15" opacity="0.8" />
      <path d="M20 42 L14 36 L24 40" fill="#facc15" opacity="0.7" />
      <path d="M80 42 L86 36 L76 40" fill="#facc15" opacity="0.7" />
      <path d="M18 50 L12 46 L22 48" fill="#facc15" opacity="0.6" />
      <path d="M82 50 L88 46 L78 48" fill="#facc15" opacity="0.6" />

      {/* Upper brow ridges */}
      <path d="M26 34 Q32 28 40 32" fill="none" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M74 34 Q68 28 60 32" fill="none" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* Eyes */}
      <ellipse cx="35" cy="42" rx="10" ry="10" fill="#fef2f2" filter={`url(#${gs})`} />
      <ellipse cx="65" cy="42" rx="10" ry="10" fill="#fef2f2" filter={`url(#${gs})`} />
      <ellipse cx="35" cy="42" rx="7" ry="8" fill={`url(#${g}-eye-iris)`} />
      <ellipse cx="65" cy="42" rx="7" ry="8" fill={`url(#${g}-eye-iris)`} />
      {/* Dragon slit pupils */}
      <ellipse cx="35" cy="42" rx="1.8" ry="6" fill="#1c1917" />
      <ellipse cx="65" cy="42" rx="1.8" ry="6" fill="#1c1917" />
      {/* Catchlights */}
      <circle cx="32" cy="38" r="2.5" fill="white" opacity="0.9" />
      <circle cx="62" cy="38" r="2.5" fill="white" opacity="0.9" />
      <circle cx="37" cy="45" r="1.2" fill="white" opacity="0.5" />
      <circle cx="67" cy="45" r="1.2" fill="white" opacity="0.5" />
      {/* Eye shadow */}
      <path d="M25 36 Q35 28 45 36" fill="none" stroke="#450a0a" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M55 36 Q65 28 75 36" fill="none" stroke="#450a0a" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {blinkOverlay(35, 42, 10, 10, `${g}-b1`)}
      {blinkOverlay(65, 42, 10, 10, `${g}-b1`)}

      {/* Nostril */}
      <ellipse cx="42" cy="52" rx="2" ry="1.2" fill="#450a0a" opacity="0.6" />
      <ellipse cx="58" cy="52" rx="2" ry="1.2" fill="#450a0a" opacity="0.6" />

      {/* Snout */}
      <path d="M28 50 Q28 58 35 60" fill="none" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M72 50 Q72 58 65 60" fill="none" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Fire breath */}
      <path d="M42 56 Q35 68 28 76 Q38 72 44 64" fill={`url(#${g}-fire)`} filter={`url(#${fs})`} opacity="0.7" />
      <path d="M58 56 Q65 68 72 76 Q62 72 56 64" fill={`url(#${g}-fire)`} filter={`url(#${fs})`} opacity="0.7" />
      <path d="M44 58 Q40 70 36 78 Q44 74 48 66" fill={`url(#${g}-fire)`} opacity="0.5" />
      <path d="M56 58 Q60 70 64 78 Q56 74 52 66" fill={`url(#${g}-fire)`} opacity="0.5" />

      {/* Jaw/teeth */}
      <path d="M30 58 Q50 68 70 58 Q50 64 30 58" fill="none" stroke="#450a0a" strokeWidth="0.8" />
      <path d="M34 58 L36 62 L38 58" fill="#fef2f2" opacity="0.8" />
      <path d="M44 60 L46 64 L48 60" fill="#fef2f2" opacity="0.8" />
      <path d="M52 60 L54 64 L56 60" fill="#fef2f2" opacity="0.8" />
      <path d="M62 58 L64 62 L66 58" fill="#fef2f2" opacity="0.8" />

      {/* Wing shapes */}
      <path d="M10 48 Q0 30 6 18 Q10 28 14 36 Q18 28 22 20 Q20 34 16 44 Z" fill="#b91c1c" opacity="0.85" filter={`url(#${gs})`} />
      <path d="M90 48 Q100 30 94 18 Q90 28 86 36 Q82 28 78 20 Q80 34 84 44 Z" fill="#b91c1c" opacity="0.85" filter={`url(#${gs})`} />
      {/* Wing membrane lines */}
      <path d="M10 48 Q6 34 6 18" fill="none" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.4" />
      <path d="M10 48 Q10 30 14 22" fill="none" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.4" />
      <path d="M10 48 Q16 32 22 20" fill="none" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.4" />
      <path d="M90 48 Q94 34 94 18" fill="none" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.4" />
      <path d="M90 48 Q90 30 86 22" fill="none" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.4" />
      <path d="M90 48 Q84 32 78 20" fill="none" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.4" />

      {/* Chest highlight */}
      <ellipse cx="50" cy="50" rx="16" ry="12" fill="rgba(255,255,255,0.05)" />
    </svg>
  );
};

export const AvatarPhoenix: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("phoenix");
  const s = `${g}-s`;
  const gs = `${g}-gs`;
  const fs = `${g}-fs`;
  const fs2 = `${g}-fs2`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 4, 6, 0.35)}
        {glowFilter(gs, 3)}
        {glowFilter(fs, 6)}
        {glowFilter(fs2, 10)}
        <radialGradient id={`${g}-body`} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="30%" stopColor="#f97316" />
          <stop offset="60%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={`${g}-crest`} cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#facc15" />
          <stop offset="70%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={`${g}-eye-iris`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#713f12" />
        </radialGradient>
        <radialGradient id={`${g}-feather`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <linearGradient id={`${g}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="70%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${g}-ember`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient glow */}
      <circle cx="50" cy="50" r="48" fill="rgba(249,115,22,0.12)" filter={`url(#${fs2})`} />

      {/* Body */}
      <circle cx="50" cy="52" r="45" fill={`url(#${g}-body)`} filter={`url(#${s})`} />

      {/* Feather texture - layered arcs */}
      {[56,60,64,68,72].map((cy) => (
        <ellipse key={cy} cx="50" cy={cy} rx={35-(cy-56)*3} ry="3" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      ))}
      {/* Feather chevron pattern */}
      {[58,62,66,70].map((cy) => (
        <path key={cy} d={`M${50-(34-(cy-58)*3)} ${cy} L50 ${cy-3} L${50+(34-(cy-58)*3)} ${cy}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
      ))}

      {/* Crest / crown feathers */}
      <path d="M50 8 Q44 14 38 10 Q44 18 50 12" fill={`url(#${g}-crest)`} filter={`url(#${gs})`} />
      <path d="M50 8 Q56 14 62 10 Q56 18 50 12" fill={`url(#${g}-crest)`} filter={`url(#${gs})`} />
      <path d="M50 6 Q46 12 42 8 Q46 16 50 10" fill={`url(#${g}-feather)`} filter={`url(#${gs})`} />
      <path d="M50 6 Q54 12 58 8 Q54 16 50 10" fill={`url(#${g}-feather)`} filter={`url(#${gs})`} />
      <path d="M50 4 L48 12 L52 12 Z" fill="#fef08a" filter={`url(#${gs})`} />

      {/* Head highlight */}
      <ellipse cx="50" cy="30" rx="18" ry="14" fill="rgba(255,255,255,0.05)" />

      {/* Eyes */}
      <ellipse cx="34" cy="40" rx="9" ry="9" fill="#fef2f2" filter={`url(#${gs})`} />
      <ellipse cx="66" cy="40" rx="9" ry="9" fill="#fef2f2" filter={`url(#${gs})`} />
      <circle cx="34" cy="40" r="5.5" fill={`url(#${g}-eye-iris)`} />
      <circle cx="66" cy="40" r="5.5" fill={`url(#${g}-eye-iris)`} />
      <circle cx="34" cy="40" r="2.5" fill="#292524" />
      <circle cx="66" cy="40" r="2.5" fill="#292524" />
      {/* Catchlights */}
      <circle cx="32" cy="37" r="2" fill="white" opacity="0.9" />
      <circle cx="64" cy="37" r="2" fill="white" opacity="0.9" />
      <circle cx="36" cy="42" r="1" fill="white" opacity="0.4" />
      <circle cx="68" cy="42" r="1" fill="white" opacity="0.4" />
      {blinkOverlay(34, 40, 9, 9, `${g}-b1`)}
      {blinkOverlay(66, 40, 9, 9, `${g}-b1`)}

      {/* Beak */}
      <path d="M44 46 L50 52 L56 46" fill="#a16207" />
      <path d="M46 46 L50 50 L54 46" fill="#854d0e" />
      <path d="M50 46 L50 52" stroke="#713f12" strokeWidth="0.5" />
      <ellipse cx="50" cy="46" rx="3" ry="1.5" fill="#fef08a" opacity="0.3" />

      {/* Cheek feathers */}
      <path d="M24 44 Q20 50 24 54 Q28 50 24 44" fill={`url(#${g}-feather)`} opacity="0.6" />
      <path d="M76 44 Q80 50 76 54 Q72 50 76 44" fill={`url(#${g}-feather)`} opacity="0.6" />

      {/* Flame wings - left */}
      <path d="M16 38 Q4 30 2 18 Q8 24 14 28 Q10 16 12 6 Q18 14 20 24 Q22 14 28 6 Q24 18 22 30 Z" fill={`url(#${g}-flame)`} filter={`url(#${fs})`} opacity="0.8" />
      {/* Flame wings - right */}
      <path d="M84 38 Q96 30 98 18 Q92 24 86 28 Q90 16 88 6 Q82 14 80 24 Q78 14 72 6 Q76 18 78 30 Z" fill={`url(#${g}-flame)`} filter={`url(#${fs})`} opacity="0.8" />

      {/* Smaller wing flame wisps */}
      <path d="M14 42 Q6 38 4 30 Q10 34 16 36" fill={`url(#${g}-flame)`} opacity="0.5" />
      <path d="M86 42 Q94 38 96 30 Q90 34 84 36" fill={`url(#${g}-flame)`} opacity="0.5" />

      {/* Tail feathers */}
      <path d="M34 62 Q28 72 22 84 Q30 78 36 70" fill={`url(#${g}-feather)`} opacity="0.7" />
      <path d="M66 62 Q72 72 78 84 Q70 78 64 70" fill={`url(#${g}-feather)`} opacity="0.7" />
      <path d="M38 66 Q32 76 26 90 Q34 82 40 74" fill="#facc15" opacity="0.5" />
      <path d="M62 66 Q68 76 74 90 Q66 82 60 74" fill="#facc15" opacity="0.5" />
      <path d="M42 68 Q38 78 34 88 Q40 82 44 76" fill="#f59e0b" opacity="0.4" />
      <path d="M58 68 Q62 78 66 88 Q60 82 56 76" fill="#f59e0b" opacity="0.4" />

      {/* Ember particles */}
      <circle cx="16" cy="14" r="1.2" fill={`url(#${g}-ember)`} opacity="0.8" />
      <circle cx="84" cy="14" r="1.2" fill={`url(#${g}-ember)`} opacity="0.8" />
      <circle cx="10" cy="22" r="0.8" fill={`url(#${g}-ember)`} opacity="0.6" />
      <circle cx="90" cy="22" r="0.8" fill={`url(#${g}-ember)`} opacity="0.6" />
      <circle cx="22" cy="8" r="0.8" fill={`url(#${g}-ember)`} opacity="0.5" />
      <circle cx="78" cy="8" r="0.8" fill={`url(#${g}-ember)`} opacity="0.5" />
      <circle cx="30" cy="78" r="1" fill={`url(#${g}-ember)`} opacity="0.5" />
      <circle cx="70" cy="78" r="1" fill={`url(#${g}-ember)`} opacity="0.5" />

      {/* Chest glow */}
      <ellipse cx="50" cy="56" rx="14" ry="10" fill="rgba(255,255,255,0.05)" />
    </svg>
  );
};

export const AvatarGriffin: React.FC<AvatarSvgProps> = ({ size = 100, className }) => {
  const g = uid("griffin");
  const s = `${g}-s`;
  const gs = `${g}-gs`;
  const fs = `${g}-fs`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        {shadowFilter(s, 4, 6, 0.35)}
        {glowFilter(gs, 3)}
        {glowFilter(fs, 8)}
        <radialGradient id={`${g}-body`} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="30%" stopColor="#a855f7" />
          <stop offset="60%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id={`${g}-b1`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="40%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#6b21a8" />
        </radialGradient>
        <radialGradient id={`${g}-eye-iris`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#713f12" />
        </radialGradient>
        <radialGradient id={`${g}-beak`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <radialGradient id={`${g}-feather-collar`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="40%" stopColor="#d8b4fe" />
          <stop offset="100%" stopColor="#a855f7" />
        </radialGradient>
        <radialGradient id={`${g}-fur`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6b21a8" />
        </radialGradient>
        <radialGradient id={`${g}-mane`} cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6b21a8" />
        </radialGradient>
        <linearGradient id={`${g}-wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="50%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>

      {/* Ambient purple glow */}
      <circle cx="50" cy="52" r="47" fill="rgba(147,51,234,0.12)" filter={`url(#${fs})`} />

      {/* Lion body */}
      <ellipse cx="50" cy="66" rx="30" ry="26" fill={`url(#${g}-fur)`} filter={`url(#${s})`} />

      {/* Fur texture on body */}
      {[60,64,68,72,76,80].map((cy) => (
        <ellipse key={cy} cx="50" cy={cy} rx={28-(cy-60)*2} ry="2.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.7" />
      ))}

      {/* Belly highlight */}
      <ellipse cx="50" cy="70" rx="16" ry="14" fill="rgba(255,255,255,0.05)" />

      {/* Eagle head */}
      <circle cx="50" cy="40" r="24" fill={`url(#${g}-body)`} filter={`url(#${gs})`} />

      {/* Feather collar / ruff */}
      <path d="M28 44 Q22 50 26 58 Q30 52 32 48" fill={`url(#${g}-feather-collar)`} />
      <path d="M72 44 Q78 50 74 58 Q70 52 68 48" fill={`url(#${g}-feather-collar)`} />
      <path d="M30 48 Q24 56 30 62 Q34 56 34 52" fill={`url(#${g}-feather-collar)`} opacity="0.8" />
      <path d="M70 48 Q76 56 70 62 Q66 56 66 52" fill={`url(#${g}-feather-collar)`} opacity="0.8" />
      <path d="M34 52 Q28 60 34 66 Q38 60 38 56" fill={`url(#${g}-feather-collar)`} opacity="0.6" />
      <path d="M66 52 Q72 60 66 66 Q62 60 62 56" fill={`url(#${g}-feather-collar)`} opacity="0.6" />

      {/* Mane */}
      <path d="M28 32 Q20 22 24 14 Q28 20 32 26" fill={`url(#${g}-mane)`} opacity="0.8" />
      <path d="M72 32 Q80 22 76 14 Q72 20 68 26" fill={`url(#${g}-mane)`} opacity="0.8" />
      <path d="M32 28 Q26 18 30 10 Q34 16 36 22" fill={`url(#${g}-mane)`} opacity="0.6" />
      <path d="M68 28 Q74 18 70 10 Q66 16 64 22" fill={`url(#${g}-mane)`} opacity="0.6" />

      {/* Ears */}
      <path d="M30 30 L24 18 L34 26" fill="#d8b4fe" />
      <path d="M70 30 L76 18 L66 26" fill="#d8b4fe" />
      <path d="M28 28 L24 20 L32 26" fill="#e9d5ff" opacity="0.5" />
      <path d="M72 28 L76 20 L68 26" fill="#e9d5ff" opacity="0.5" />

      {/* Eyes */}
      <ellipse cx="37" cy="38" rx="8" ry="8.5" fill="#fef2f2" filter={`url(#${gs})`} />
      <ellipse cx="63" cy="38" rx="8" ry="8.5" fill="#fef2f2" filter={`url(#${gs})`} />
      <ellipse cx="37" cy="38" rx="5.5" ry="6.5" fill={`url(#${g}-eye-iris)`} />
      <ellipse cx="63" cy="38" rx="5.5" ry="6.5" fill={`url(#${g}-eye-iris)`} />
      {/* Eagle sharp pupils */}
      <ellipse cx="37" cy="38" rx="2" ry="5" fill="#1c1917" />
      <ellipse cx="63" cy="38" rx="2" ry="5" fill="#1c1917" />
      {/* Catchlights */}
      <circle cx="35" cy="35" r="2" fill="white" opacity="0.9" />
      <circle cx="61" cy="35" r="2" fill="white" opacity="0.9" />
      <circle cx="39" cy="41" r="1" fill="white" opacity="0.4" />
      <circle cx="65" cy="41" r="1" fill="white" opacity="0.4" />
      {/* Eye shadow */}
      <path d="M29 34 Q37 28 45 34" fill="none" stroke="#4c1d95" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M55 34 Q63 28 71 34" fill="none" stroke="#4c1d95" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {blinkOverlay(37, 38, 8, 8.5, `${g}-b1`)}
      {blinkOverlay(63, 38, 8, 8.5, `${g}-b1`)}

      {/* Beak */}
      <path d="M44 44 L50 50 L56 44" fill={`url(#${g}-beak)`} filter={`url(#${gs})`} />
      <path d="M46 44 L50 48 L54 44" fill="#78350f" />
      <path d="M50 44 L50 50" stroke="#451a03" strokeWidth="0.5" />
      <ellipse cx="50" cy="44" rx="3" ry="1.5" fill="#fef08a" opacity="0.2" />

      {/* Eagle wings */}
      <path d="M16 44 Q6 32 2 20 Q10 28 16 34 Q18 24 24 14 Q20 26 18 38 Z" fill={`url(#${g}-wing)`} opacity="0.85" filter={`url(#${gs})`} />
      <path d="M84 44 Q94 32 98 20 Q90 28 84 34 Q82 24 76 14 Q80 26 82 38 Z" fill={`url(#${g}-wing)`} opacity="0.85" filter={`url(#${gs})`} />
      {/* Wing feather lines */}
      <path d="M16 44 Q10 34 8 22" fill="none" stroke="#4c1d95" strokeWidth="0.5" opacity="0.4" />
      <path d="M16 44 Q14 30 18 20" fill="none" stroke="#4c1d95" strokeWidth="0.5" opacity="0.4" />
      <path d="M16 44 Q20 30 24 16" fill="none" stroke="#4c1d95" strokeWidth="0.5" opacity="0.4" />
      <path d="M84 44 Q90 34 92 22" fill="none" stroke="#4c1d95" strokeWidth="0.5" opacity="0.4" />
      <path d="M84 44 Q86 30 82 20" fill="none" stroke="#4c1d95" strokeWidth="0.5" opacity="0.4" />
      <path d="M84 44 Q80 30 76 16" fill="none" stroke="#4c1d95" strokeWidth="0.5" opacity="0.4" />

      {/* Lion front legs */}
      <path d="M34 72 Q30 80 32 88 Q34 82 36 76" fill={`url(#${g}-fur)`} opacity="0.8" />
      <path d="M66 72 Q70 80 68 88 Q66 82 64 76" fill={`url(#${g}-fur)`} opacity="0.8" />
      {/* Paws */}
      <ellipse cx="34" cy="89" rx="5" ry="3.5" fill={`url(#${g}-feather-collar)`} />
      <ellipse cx="66" cy="89" rx="5" ry="3.5" fill={`url(#${g}-feather-collar)`} />
      {/* Claws */}
      <path d="M30 90 L29 94 L31 90" fill="#e9d5ff" opacity="0.7" />
      <path d="M34 91 L34 95 L36 91" fill="#e9d5ff" opacity="0.7" />
      <path d="M38 90 L39 94 L37 90" fill="#e9d5ff" opacity="0.7" />
      <path d="M62 90 L61 94 L63 90" fill="#e9d5ff" opacity="0.7" />
      <path d="M66 91 L66 95 L68 91" fill="#e9d5ff" opacity="0.7" />
      <path d="M70 90 L71 94 L69 90" fill="#e9d5ff" opacity="0.7" />

      {/* Chest highlight */}
      <ellipse cx="50" cy="48" rx="14" ry="10" fill="rgba(255,255,255,0.05)" />

      {/* Crown of feathers on head */}
      <path d="M44 18 L42 10 L46 16" fill="#fcd34d" opacity="0.7" />
      <path d="M50 16 L50 8 L52 14" fill="#fcd34d" opacity="0.8" />
      <path d="M56 18 L58 10 L54 16" fill="#fcd34d" opacity="0.7" />
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
