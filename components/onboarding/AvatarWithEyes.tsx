"use client";

import { useRef, useState, useEffect } from "react";
import { getAvatarById } from "@/components/avatars/avatar-svgs";
import { CrayonAvatar } from "@/components/crayon/CrayonAvatar";

interface AvatarWithEyesProps {
  avatarId: string;
  size?: number;
  className?: string;
}

export default function AvatarWithEyes({ avatarId, size = 64, className }: AvatarWithEyesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 50, y: 50 });
  const currentRef = useRef({ x: 0, y: 0 });
  const focusedRef = useRef<HTMLElement | null>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  const avatar = getAvatarById(avatarId);
  if (!avatar) return <div className={className}></div>;

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
      if (pos === 0) return { x: rect.left + padL + borderL, y: rect.top + rect.height / 2 };
      const textBefore = input.value.slice(0, pos);
      let textWidth = 0;
      if (ctx) {
        ctx.font = `${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
        textWidth = ctx.measureText(textBefore).width;
      }
      return { x: rect.left + padL + borderL + textWidth, y: rect.top + rect.height / 2 };
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
    const active = document.activeElement;
    if (active?.tagName === "INPUT") {
      focusedRef.current = active as HTMLElement;
      hookInput(active as HTMLInputElement);
    }
    const animate = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      let tx: number, ty: number;
      if (focusedRef.current?.isConnected && focusedRef.current.tagName === "INPUT") {
        const pos = measureCaret(focusedRef.current as HTMLInputElement);
        tx = pos.x;
        ty = pos.y;
      } else if (focusedRef.current?.isConnected) {
        const elRect = focusedRef.current.getBoundingClientRect();
        tx = elRect.left + elRect.width / 2;
        ty = elRect.top + elRect.height / 2;
      } else {
        if (focusedRef.current && !focusedRef.current.isConnected) {
          focusedRef.current = null;
          unhookInput();
        }
        tx = mouseRef.current.x;
        ty = mouseRef.current.y;
      }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (tx - cx) / (rect.width * 0.6);
      const dy = (ty - cy) / (rect.height * 0.6);
      const targetX = Math.max(-1, Math.min(1, dx));
      const targetY = Math.max(-1, Math.min(1, dy));
      currentRef.current.x += (targetX - currentRef.current.x) * 0.07;
      currentRef.current.y += (targetY - currentRef.current.y) * 0.07;
      setGaze({ x: currentRef.current.x, y: currentRef.current.y });
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
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-flex shrink-0 ${className ?? ""}`}>
      <CrayonAvatar avatarId={avatarId} size={size} gaze={gaze} />
    </div>
  );
}
