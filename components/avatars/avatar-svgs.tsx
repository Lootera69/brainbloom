"use client";

import React from "react";
import { CrayonAvatar } from "@/components/crayon/CrayonAvatar";

interface AvatarSvgProps {
  size?: number;
  className?: string;
}

export const AvatarOwl: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="owl" size={size} className={className} />
);
export const AvatarFox: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="fox" size={size} className={className} />
);
export const AvatarCat: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="cat" size={size} className={className} />
);
export const AvatarDog: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="dog" size={size} className={className} />
);
export const AvatarUfo: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="ufo" size={size} className={className} />
);
export const AvatarPanda: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="panda" size={size} className={className} />
);
export const AvatarRooster: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="rooster" size={size} className={className} />
);
export const AvatarTurtle: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="turtle" size={size} className={className} />
);
export const AvatarDragon: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="dragon" size={size} className={className} />
);
export const AvatarPhoenix: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="phoenix" size={size} className={className} />
);
export const AvatarGriffin: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="griffin" size={size} className={className} />
);
export const AvatarFrog: React.FC<AvatarSvgProps> = ({ size = 100, className }) => (
  <CrayonAvatar avatarId="frog" size={size} className={className} />
);

export interface AvatarDefinition {
  id: string;
  name: string;
  component: React.FC<AvatarSvgProps>;
  premium?: boolean;
}

export const avatars: AvatarDefinition[] = [
  { id: "owl", name: "Owl", component: AvatarOwl },
  { id: "fox", name: "Fox", component: AvatarFox, premium: true },
  { id: "cat", name: "Cat", component: AvatarCat },
  { id: "dog", name: "Dog", component: AvatarDog },
  { id: "ufo", name: "UFO", component: AvatarUfo, premium: true },
  { id: "panda", name: "Panda", component: AvatarPanda, premium: true },
  { id: "rooster", name: "Rooster", component: AvatarRooster, premium: true },
  { id: "turtle", name: "Turtle", component: AvatarTurtle },
  { id: "dragon", name: "Dragon", component: AvatarDragon, premium: true },
  { id: "phoenix", name: "Phoenix", component: AvatarPhoenix, premium: true },
  { id: "griffin", name: "Griffin", component: AvatarGriffin, premium: true },
  { id: "frog", name: "Frog", component: AvatarFrog, premium: true },
];

export function getAvatarById(id: string) {
  return avatars.find((a) => a.id === id) ?? null;
}

/**
 * Avatars ordered for the selection UI: free characters first, premium last.
 * Uses a stable sort, so within each group the authored order is preserved.
 */
export const avatarsForSelection: AvatarDefinition[] = [...avatars].sort(
  (a, b) => (a.premium ? 1 : 0) - (b.premium ? 1 : 0),
);
