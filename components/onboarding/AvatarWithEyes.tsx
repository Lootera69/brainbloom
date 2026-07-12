"use client";

import { useRef, useState, useEffect } from "react";
import { getAvatarById } from "@/components/avatars/avatar-svgs";

interface EyeConfig {
  lx: number; ly: number;
  rx: number; ry: number;
  eyeR: number;
  pr: number;
}

const EYE_MAP: Record<string, EyeConfig | null> = {
  owl:     { lx: 35, ly: 44, rx: 65, ry: 44, eyeR: 9, pr: 3 },
  fox:     { lx: 38, ly: 44, rx: 62, ry: 44, eyeR: 5.5, pr: 2 },
  cat:     { lx: 35, ly: 44, rx: 65, ry: 44, eyeR: 9, pr: 4 },
  dog:     { lx: 36, ly: 40, rx: 64, ry: 40, eyeR: 8, pr: 3 },
  ufo:     null,
  panda:   { lx: 37, ly: 45, rx: 63, ry: 45, eyeR: 3.5, pr: 1.5 },
  rooster: { lx: 36, ly: 40, rx: 64, ry: 40, eyeR: 6.5, pr: 2 },
  turtle:  { lx: 42, ly: 76, rx: 58, ry: 76, eyeR: 3, pr: 1.5 },
};

interface AvatarWithEyesProps {
  avatarId: string;
  size?: number;
  className?: string;
}

export default function AvatarWithEyes({ avatarId, size = 64, className }: AvatarWithEyesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 50, y: 50 });
  const currentRef = useRef({ x: 50, y: 50 });
  const focusedRef = useRef<HTMLElement | null>(null);

  const avatar = getAvatarById(avatarId);
  const eyeConfig = EYE_MAP[avatarId];

  const [pupils, setPupils] = useState(
    eyeConfig
      ? { lx: eyeConfig.lx, ly: eyeConfig.ly, rx: eyeConfig.rx, ry: eyeConfig.ry }
      : { lx: 0, ly: 0, rx: 0, ry: 0 }
  );

  if (!avatar) {
    return <div className={className}></div>;
  }

  const AvatarComp = avatar.component;

  if (!eyeConfig) {
    return <div className={className}><AvatarComp size={size} /></div>;
  }

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let currentInput: HTMLInputElement | null = null;

    const measureCaret = (input: HTMLInputElement) => {
      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      const pos = input.selectionStart ?? 0;
      const padL = parseFloat(style.paddingLeft) || 12;
      const borderL = parseFloat(style.borderLeftWidth) || 1;
      if (pos === 0) {
        return { x: rect.left + padL + borderL, y: rect.top + rect.height / 2 };
      }
      const textBefore = input.value.slice(0, pos);
      let textWidth = 0;
      if (ctx) {
        ctx.font = `${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
        textWidth = ctx.measureText(textBefore).width;
      }
      return {
        x: rect.left + padL + borderL + textWidth,
        y: rect.top + rect.height / 2,
      };
    };

    const hookInput = (el: HTMLInputElement) => {
      if (currentInput) {
        currentInput.removeEventListener("input", onInput);
        currentInput.removeEventListener("click", onInput);
        currentInput.removeEventListener("keyup", onInput);
      }
      currentInput = el;
      currentInput.addEventListener("input", onInput);
      currentInput.addEventListener("click", onInput);
      currentInput.addEventListener("keyup", onInput);
    };

    const unhookInput = () => {
      if (currentInput) {
        currentInput.removeEventListener("input", onInput);
        currentInput.removeEventListener("click", onInput);
        currentInput.removeEventListener("keyup", onInput);
        currentInput = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el || !el.isConnected) return;
      if (el.tagName === "INPUT" || el.tagName === "BUTTON" || el.tagName === "TEXTAREA") {
        focusedRef.current = el;
        if (el.tagName === "INPUT") {
          hookInput(el as HTMLInputElement);
          const pos = measureCaret(el as HTMLInputElement);
          mouseRef.current = { x: pos.x, y: pos.y };
        }
      }
    };

    const onFocusOut = () => {
      unhookInput();
      focusedRef.current = null;
    };

    const onInput = () => {
      if (!currentInput || !currentInput.isConnected) return;
      const pos = measureCaret(currentInput);
      mouseRef.current = { x: pos.x, y: pos.y };
    };

    // Pick up any already-focused input (autoFocus, tab switch)
    const active = document.activeElement;
    if (active?.tagName === "INPUT") {
      focusedRef.current = active as HTMLElement;
      hookInput(active as HTMLInputElement);
    }

    const animate = () => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) { rafRef.current = requestAnimationFrame(animate); return; }

      const scale = 100 / containerRect.width;
      let tx: number;
      let ty: number;

      if (focusedRef.current?.isConnected && focusedRef.current.tagName === "INPUT") {
        const el = focusedRef.current as HTMLInputElement;
        const pos = measureCaret(el);
        tx = (pos.x - containerRect.left) * scale;
        ty = (pos.y - containerRect.top) * scale;
      } else if (focusedRef.current?.isConnected) {
        const elRect = focusedRef.current.getBoundingClientRect();
        tx = (elRect.left + elRect.width / 2 - containerRect.left) * scale;
        ty = (elRect.top + elRect.height / 2 - containerRect.top) * scale;
      } else {
        if (focusedRef.current && !focusedRef.current.isConnected) {
          focusedRef.current = null;
          unhookInput();
        }
        tx = (mouseRef.current.x - containerRect.left) * scale;
        ty = (mouseRef.current.y - containerRect.top) * scale;
      }

      currentRef.current.x += (tx - currentRef.current.x) * 0.07;
      currentRef.current.y += (ty - currentRef.current.y) * 0.07;

      const calcPupil = (ex: number, ey: number) => {
        const dx = currentRef.current.x - ex;
        const dy = currentRef.current.y - ey;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, eyeConfig.pr);
        const ratio = clamped / (dist || 1);
        return { x: ex + dx * ratio, y: ey + dy * ratio };
      };

      const left = calcPupil(eyeConfig.lx, eyeConfig.ly);
      const right = calcPupil(eyeConfig.rx, eyeConfig.ry);
      setPupils({ lx: left.x, ly: left.y, rx: right.x, ry: right.y });
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      unhookInput();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [eyeConfig]);

  return (
    <div ref={containerRef} className={`relative inline-flex shrink-0 ${className ?? ""}`}>
      <AvatarComp size={size} />
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 pointer-events-none"
        style={{ width: size, height: size }}
      >
        <circle cx={eyeConfig.lx} cy={eyeConfig.ly} r={eyeConfig.eyeR} fill="white" />
        <circle cx={eyeConfig.rx} cy={eyeConfig.ry} r={eyeConfig.eyeR} fill="white" />
        <circle cx={pupils.lx} cy={pupils.ly} r={Math.max(eyeConfig.pr * 1.3, 4.5)} fill="#1e1b4b" />
        <circle cx={pupils.rx} cy={pupils.ry} r={Math.max(eyeConfig.pr * 1.3, 4.5)} fill="#1e1b4b" />
        <circle cx={pupils.lx + 1.5} cy={pupils.ly - 2} r={Math.max(eyeConfig.pr * 0.45, 1.5)} fill="white" opacity={0.7} />
        <circle cx={pupils.rx + 1.5} cy={pupils.ry - 2} r={Math.max(eyeConfig.pr * 0.45, 1.5)} fill="white" opacity={0.7} />
      </svg>
    </div>
  );
}
