import { CrayonPen, CrayonPalette, CrayonAvatarSpec } from "./crayon-pen";
import { HandDrawn } from "./hand-drawn";
import { rectFromLTRB, rectFromCenter, lerpColor } from "./crayon-stroke";

function lerpOffset(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}



// Owl
const _owlPalette: CrayonPalette = {
  body: "#A98274",
  belly: "#D9C3B4",
  outline: "#5B3A2E",
  accent: "#E8791F",
  eyeWhite: "#FFF6DC",
  pupil: "#33221A",
};
export const kCrayonOwl: CrayonAvatarSpec = { id: "owl", name: "Owl", palette: _owlPalette, draw: _drawOwl };
function _drawOwl(pen: CrayonPen): void {
  const p = pen.palette;
  pen.poly([{ x: 24, y: 30 }, { x: 37, y: 22 }, { x: 27, y: 8 }], { key: "tuft.l", fill: p.body, amplitude: 1.4, width: 2.6, hatch: false });
  pen.poly([{ x: 76, y: 31 }, { x: 64, y: 23 }, { x: 74.5, y: 9 }], { key: "tuft.r", fill: p.body, amplitude: 1.4, width: 2.6, hatch: false });
  pen.blob(rectFromLTRB(17, 15, 83, 89), { key: "body", fill: p.body, amplitude: 3.4, segments: 14, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(33, 55, 67, 86), { key: "belly", fill: p.belly, amplitude: 2.4, segments: 13, width: 2.2, hatchDegrees: 68 });
  const spread = pen.limb;
  pen.blob(rectFromLTRB(11 - spread * 9, 45 - spread * 23, 30 + spread * 2, 77 - spread * 5), { key: "wing.l", fill: p.body, amplitude: 2.2, segments: 12, width: 2.4, hatchDegrees: 58 });
  pen.blob(rectFromLTRB(70 - spread * 2, 47 - spread * 23, 89 + spread * 9, 77 - spread * 5), { key: "wing.r", fill: p.body, amplitude: 2.2, segments: 12, width: 2.4, hatchDegrees: 74 });
  _owlFoot(pen, 38, "foot.l");
  _owlFoot(pen, 62, "foot.r");
  pen.eye({ x: 39, y: 41 }, 17.5, { key: "eye.l" });
  pen.eye({ x: 65.5, y: 43 }, 13.0, { key: "eye.r" });
  pen.poly([{ x: 46, y: 53 }, { x: 58, y: 54 }, { x: 52, y: 67 }], { key: "beak", fill: p.accent, amplitude: 0.9, width: 2.2 });
}
function _owlFoot(pen: CrayonPen, x: number, key: string): void {
  pen.stroke([{ x, y: 85 }, { x, y: 93 }], { key: `${key}.leg`, width: 2.6 });
  pen.stroke([{ x, y: 93 }, { x: x - 5.5, y: 97.5 }], { key: `${key}.toe0`, width: 2.2 });
  pen.stroke([{ x, y: 93 }, { x: x + 0.5, y: 98.5 }], { key: `${key}.toe1`, width: 2.2 });
  pen.stroke([{ x, y: 93 }, { x: x + 5.5, y: 97.5 }], { key: `${key}.toe2`, width: 2.2 });
}

// Fox
const _foxPalette: CrayonPalette = {
  body: "#DD6B2A",
  belly: "#FFF3D6",
  outline: "#5A2E14",
  accent: "#2E1F14",
  eyeWhite: "#FFF8E7",
  pupil: "#3A2410",
};
const _foxSock = "#4A3220";
export const kCrayonFox: CrayonAvatarSpec = { id: "fox", name: "Fox", palette: _foxPalette, draw: _drawFox };
function _drawFox(pen: CrayonPen): void {
  const p = pen.palette;
  const wag = pen.limb;
  pen.blob(rectFromLTRB(1, 38 - wag * 10, 33, 86 - wag * 6), { key: "tail", fill: p.body, amplitude: 3.6, segments: 13, width: 2.8, hatchDegrees: 40 });
  pen.blob(rectFromLTRB(4, 52 - wag * 9, 26, 82 - wag * 5), { key: "tail.mass", fill: p.body, amplitude: 2.8, segments: 11, width: 2.2, hatchDegrees: 74 });
  pen.blob(rectFromLTRB(0, 32 - wag * 11, 17, 52 - wag * 9), { key: "tail.tip", fill: p.belly, amplitude: 1.8, segments: 10, width: 2.0, hatch: false });
  pen.poly([{ x: 27, y: 40 }, { x: 35, y: 6 }, { x: 52, y: 30 }], { key: "ear.l", fill: p.body, amplitude: 1.3, width: 2.5 });
  pen.poly([{ x: 31, y: 34 }, { x: 36, y: 15 }, { x: 45, y: 30 }], { key: "ear.l.in", fill: "#F6B0A6", amplitude: 0.7, width: 1.5, hatch: false });
  pen.poly([{ x: 32, y: 15 }, { x: 35, y: 6 }, { x: 40, y: 17 }], { key: "ear.l.tip", fill: _foxSock, amplitude: 0.6, width: 1.4, hatch: false });
  pen.poly([{ x: 63, y: 33 }, { x: 76, y: 9 }, { x: 82, y: 36 }], { key: "ear.r", fill: p.body, amplitude: 1.3, width: 2.4 });
  pen.poly([{ x: 68, y: 31 }, { x: 75, y: 17 }, { x: 78, y: 33 }], { key: "ear.r.in", fill: "#F6B0A6", amplitude: 0.6, width: 1.4, hatch: false });
  pen.poly([{ x: 72, y: 17 }, { x: 76, y: 9 }, { x: 79, y: 19 }], { key: "ear.r.tip", fill: _foxSock, amplitude: 0.5, width: 1.3, hatch: false });
  pen.blob(rectFromLTRB(23, 25, 81, 91), { key: "body", fill: p.body, amplitude: 3.2, segments: 14, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(35, 60, 72, 89), { key: "belly", fill: p.belly, amplitude: 2.2, segments: 12, width: 2.1, hatchDegrees: 62 });
  pen.poly([{ x: 41, y: 50 }, { x: 22, y: 62 }, { x: 30, y: 72 }, { x: 47, y: 66 }], { key: "ruff.l", fill: p.belly, amplitude: 1.2, width: 2.0, hatch: false });
  pen.poly([{ x: 66, y: 52 }, { x: 84, y: 60 }, { x: 78, y: 71 }, { x: 63, y: 66 }], { key: "ruff.r", fill: p.belly, amplitude: 1.2, width: 2.0, hatch: false });
  pen.poly([{ x: 48, y: 58 }, { x: 95, y: 66 }, { x: 50, y: 78 }], { key: "snout", fill: p.belly, amplitude: 0.9, width: 2.2, hatch: false });
  pen.stroke([{ x: 50, y: 60 }, { x: 72, y: 63 }, { x: 90, y: 66 }], { key: "snout.bridge", color: p.body, width: 3.4, amplitude: 0.6 });
  _foxLeg(pen, 41, "leg.l");
  _foxLeg(pen, 62, "leg.r");
  pen.eye({ x: 41, y: 44 }, 13.5, { key: "eye.l", pupil: 0.44 });
  pen.eye({ x: 67, y: 46 }, 10.0, { key: "eye.r", pupil: 0.44 });
  pen.stroke([{ x: 30, y: 34 }, { x: 48, y: 31 }], { key: "brow.l", width: 2.2, amplitude: 0.5 });
  pen.stroke([{ x: 61, y: 33 }, { x: 76, y: 37 }], { key: "brow.r", width: 2.0, amplitude: 0.5 });
  pen.poly([{ x: 88, y: 63 }, { x: 96, y: 66 }, { x: 88, y: 70 }], { key: "nose", fill: p.accent, amplitude: 0.5, width: 1.8 });
}
function _foxLeg(pen: CrayonPen, x: number, key: string): void {
  pen.stroke([{ x, y: 84 }, { x, y: 92 }], { key: `${key}.leg`, width: 3.0 });
  pen.stroke([{ x, y: 89 }, { x, y: 94 }], { key: `${key}.sock`, color: _foxSock, width: 3.2, amplitude: 0.4 });
  pen.stroke([{ x, y: 94 }, { x: x - 4, y: 97.5 }], { key: `${key}.toe0`, color: _foxSock, width: 2.0 });
  pen.stroke([{ x, y: 94 }, { x: x + 4, y: 97.5 }], { key: `${key}.toe1`, color: _foxSock, width: 2.0 });
}

// Cat
const _catPalette: CrayonPalette = {
  body: "#8E8AA8",
  belly: "#F4EFE4",
  outline: "#3B3348",
  accent: "#E58BA6",
  eyeWhite: "#EFFBE4",
  pupil: "#2E2A38",
};
const _catStripe = "#645F80";
export const kCrayonCat: CrayonAvatarSpec = { id: "cat", name: "Cat", palette: _catPalette, draw: _drawCat };
function _drawCat(pen: CrayonPen): void {
  const p = pen.palette;
  const curl = pen.limb;
  pen.stroke([{ x: 74, y: 88 }, { x: 90, y: 82 - curl * 4 }, { x: 96, y: 62 - curl * 8 }, { x: 84 - curl * 4, y: 50 - curl * 10 }, { x: 74 - curl * 6, y: 56 - curl * 9 }], { key: "tail", color: p.body, width: 7.0, amplitude: 1.0, grain: 0.45 });
  pen.stroke([{ x: 74, y: 88 }, { x: 90, y: 82 - curl * 4 }, { x: 96, y: 62 - curl * 8 }, { x: 84 - curl * 4, y: 50 - curl * 10 }, { x: 74 - curl * 6, y: 56 - curl * 9 }], { key: "tail.ink", width: 1.6, amplitude: 1.0, grain: 0.25 });
  pen.poly([{ x: 28, y: 42 }, { x: 33, y: 13 }, { x: 53, y: 33 }], { key: "ear.l", fill: p.body, amplitude: 1.2, width: 2.5 });
  pen.poly([{ x: 33, y: 37 }, { x: 36, y: 21 }, { x: 47, y: 33 }], { key: "ear.l.in", fill: p.accent, amplitude: 0.7, width: 1.5, hatch: false });
  pen.poly([{ x: 60, y: 33 }, { x: 75, y: 14 }, { x: 80, y: 43 }], { key: "ear.r", fill: p.body, amplitude: 1.2, width: 2.4 });
  pen.poly([{ x: 65, y: 34 }, { x: 74, y: 22 }, { x: 76, y: 38 }], { key: "ear.r.in", fill: p.accent, amplitude: 0.6, width: 1.4, hatch: false });
  pen.blob(rectFromLTRB(24, 26, 79, 93), { key: "body", fill: p.body, amplitude: 3.0, segments: 14, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(35, 62, 70, 91), { key: "belly", fill: p.belly, amplitude: 2.0, segments: 12, width: 2.0, hatchDegrees: 70 });
  for (let i = 0; i < 3; i++) {
    const x = 44.0 + i * 7.0;
    pen.stroke([{ x, y: 24 + i * 0.8 }, { x: x + 1.5, y: 33 + i * 0.8 }], { key: `stripe.head${i}`, color: _catStripe, width: 2.4, amplitude: 0.5 });
  }
  for (let i = 0; i < 2; i++) {
    const y = 68.0 + i * 9.0;
    pen.stroke([{ x: 27 + i * 1.5, y }, { x: 35 + i * 1.5, y: y + 3 }], { key: `stripe.side${i}`, color: _catStripe, width: 2.6, amplitude: 0.5 });
  }
  pen.blob(rectFromLTRB(41, 58, 68, 76), { key: "muzzle", fill: p.belly, amplitude: 1.1, segments: 11, width: 2.0, hatch: false });
  _catPaw(pen, 41, "paw.l");
  _catPaw(pen, 61, "paw.r");
  pen.eye({ x: 39, y: 45 }, 14.0, { key: "eye.l", pupil: 0.5, pupilAspect: 0.34 });
  pen.eye({ x: 64, y: 47 }, 10.5, { key: "eye.r", pupil: 0.5, pupilAspect: 0.34 });
  pen.poly([{ x: 50, y: 64 }, { x: 58, y: 64 }, { x: 54, y: 69 }], { key: "nose", fill: p.accent, amplitude: 0.4, width: 1.6 });
  pen.stroke([{ x: 54, y: 69 }, { x: 48, y: 73 }], { key: "mouth.l", width: 1.6, amplitude: 0.4 });
  pen.stroke([{ x: 54, y: 69 }, { x: 60, y: 73 }], { key: "mouth.r", width: 1.6, amplitude: 0.4 });
  for (let i = 0; i < 3; i++) {
    const dy = -3.5 + i * 3.5;
    pen.stroke([{ x: 47, y: 67 + dy * 0.4 }, { x: 14, y: 60 + dy * 2.2 }], { key: `whisker.l${i}`, width: 1.3, amplitude: 0.45, grain: 0.15 });
    pen.stroke([{ x: 61, y: 67 + dy * 0.4 }, { x: 93, y: 61 + dy * 2.2 }], { key: `whisker.r${i}`, width: 1.3, amplitude: 0.45, grain: 0.15 });
  }
}
function _catPaw(pen: CrayonPen, x: number, key: string): void {
  pen.blob(rectFromLTRB(x - 7, 88, x + 7, 98), { key, fill: pen.palette.belly, amplitude: 1.0, segments: 10, width: 2.0, hatch: false });
  pen.stroke([{ x: x - 2, y: 92 }, { x: x - 2.5, y: 97 }], { key: `${key}.toe0`, width: 1.4, amplitude: 0.3 });
  pen.stroke([{ x: x + 2, y: 92 }, { x: x + 2.5, y: 97 }], { key: `${key}.toe1`, width: 1.4, amplitude: 0.3 });
}

// Dog
const _dogPalette: CrayonPalette = {
  body: "#CC9A5E",
  belly: "#F3E4C8",
  outline: "#4A3118",
  accent: "#E87D8E",
  eyeWhite: "#FFFBEE",
  pupil: "#2C1E10",
};
const _dogPatch = "#8A5A2E";
export const kCrayonDog: CrayonAvatarSpec = { id: "dog", name: "Dog", palette: _dogPalette, draw: _drawDog };
function _drawDog(pen: CrayonPen): void {
  const p = pen.palette;
  const wag = pen.limb;
  pen.stroke([{ x: 78, y: 82 }, { x: 88 + wag * 3, y: 70 - wag * 4 }, { x: 86 + wag * 6, y: 54 - wag * 8 }], { key: "tail", color: p.body, width: 6.0, amplitude: 0.8, grain: 0.4 });
  pen.stroke([{ x: 78, y: 82 }, { x: 88 + wag * 3, y: 70 - wag * 4 }, { x: 86 + wag * 6, y: 54 - wag * 8 }], { key: "tail.ink", width: 1.4, amplitude: 0.8 });
  pen.blob(rectFromLTRB(20, 22, 82, 91), { key: "body", fill: p.body, amplitude: 3.2, segments: 14, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(34, 58, 70, 89), { key: "belly", fill: p.belly, amplitude: 2.2, segments: 12, width: 2.1, hatchDegrees: 64 });
  pen.blob(rectFromLTRB(12, 26, 34, 62), { key: "ear.l", fill: _dogPatch, amplitude: 2.0, segments: 12, width: 2.4, hatch: false });
  pen.blob(rectFromLTRB(68, 27, 90, 64), { key: "ear.r", fill: _dogPatch, amplitude: 2.0, segments: 12, width: 2.4, hatch: false });
  pen.blob(rectFromLTRB(38, 60, 64, 82), { key: "muzzle", fill: p.belly, amplitude: 1.4, segments: 12, width: 2.0, hatch: false });
  _dogLeg(pen, 40, "leg.l");
  _dogLeg(pen, 61, "leg.r");
  pen.blob(rectFromLTRB(52, 34, 74, 54), { key: "patch", fill: _dogPatch, amplitude: 1.6, segments: 11, width: 1.8, hatch: false });
  pen.eye({ x: 41, y: 46 }, 12.5, { key: "eye.l", pupil: 0.5 });
  pen.eye({ x: 63, y: 45 }, 11.0, { key: "eye.r", pupil: 0.5 });
  pen.blob(rectFromLTRB(46, 62, 57, 71), { key: "nose", fill: p.outline, amplitude: 0.8, segments: 10, width: 1.6, hatch: false });
  pen.stroke([{ x: 51, y: 72 }, { x: 51, y: 78 }], { key: "mouth", width: 1.6, amplitude: 0.3 });
  pen.poly([{ x: 47, y: 76 }, { x: 57, y: 76 }, { x: 55, y: 88 + wag * 4 }, { x: 49, y: 88 + wag * 4 }], { key: "tongue", fill: p.accent, amplitude: 0.7, width: 1.8 });
  pen.stroke([{ x: 52, y: 78 }, { x: 52, y: 86 + wag * 4 }], { key: "tongue.crease", color: p.outline, width: 1.0, amplitude: 0.3, grain: 0.1 });
}
function _dogLeg(pen: CrayonPen, x: number, key: string): void {
  pen.stroke([{ x, y: 83 }, { x, y: 93 }], { key: `${key}.leg`, width: 3.4 });
  pen.blob(rectFromLTRB(x - 4, 92, x + 4, 98), { key: `${key}.paw`, fill: pen.palette.body, amplitude: 0.8, segments: 9, width: 1.8, hatch: false });
}

// UFO
const _ufoPalette: CrayonPalette = {
  body: "#B6C0CE",
  belly: "#A6E6F0",
  outline: "#2C3646",
  accent: "#FFE07A",
  eyeWhite: "#CFEFD6",
  pupil: "#15202E",
};
const _ufoAlien = "#8FCB6E";
export const kCrayonUfo: CrayonAvatarSpec = { id: "ufo", name: "UFO", palette: _ufoPalette, draw: _drawUfo };
function _drawUfo(pen: CrayonPen): void {
  const p = pen.palette;
  pen.blob(rectFromLTRB(30, 16, 70, 52), { key: "dome", fill: p.belly, amplitude: 1.6, segments: 13, width: 2.4, hatch: false });
  pen.blob(rectFromLTRB(40, 28, 60, 50), { key: "alien", fill: _ufoAlien, amplitude: 1.0, segments: 11, width: 1.8, hatch: false });
  pen.eye({ x: 45, y: 38 }, 6.5, { key: "eye.l", pupil: 0.72, width: 1.4 });
  pen.eye({ x: 56, y: 39 }, 5.5, { key: "eye.r", pupil: 0.72, width: 1.4 });
  pen.blob(rectFromLTRB(8, 48, 92, 70), { key: "hull", fill: p.body, amplitude: 2.2, segments: 16, width: 3.0, retrace: true, hatchDegrees: 8 });
  pen.blob(rectFromLTRB(6, 58, 94, 72), { key: "brim", fill: p.body, amplitude: 1.6, segments: 16, width: 2.4, hatch: false });
  for (let i = 0; i < 7; i++) {
    const t = i / 6.0;
    const x = 16 + t * 68;
    const y = 65 + Math.sin(t * Math.PI) * 3.5;
    const lit = HandDrawn.noise(pen.seed + 300, pen.step, i);
    const c = lerpColor(p.outline, p.accent, 0.3 + lit * 0.7);
    const r = 2.2 + lit * 0.8;
    pen.blob(rectFromLTRB(x - r, y - r, x + r, y + r), { key: `light${i}`, fill: c, amplitude: 0.6, segments: 9, width: 1.2, hatch: false });
  }
  pen.blob(rectFromLTRB(42, 68, 58, 76), { key: "port", fill: p.accent, amplitude: 0.6, segments: 9, width: 1.4, hatch: false });
}

// Panda
const _pandaPalette: CrayonPalette = {
  body: "#F4F0E6",
  belly: "#FFFFFF",
  outline: "#3A342C",
  accent: "#23201C",
  eyeWhite: "#FFFFFF",
  pupil: "#1A1712",
};
const _pandaBlack = "#2A2620";
export const kCrayonPanda: CrayonAvatarSpec = { id: "panda", name: "Panda", palette: _pandaPalette, draw: _drawPanda };
function _drawPanda(pen: CrayonPen): void {
  const p = pen.palette;
  const reach = pen.limb;
  pen.blob(rectFromLTRB(18, 12, 40, 34), { key: "ear.l", fill: _pandaBlack, amplitude: 1.4, segments: 11, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(60, 12, 82, 34), { key: "ear.r", fill: _pandaBlack, amplitude: 1.4, segments: 11, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(16, 20, 84, 92), { key: "body", fill: p.body, amplitude: 3.2, segments: 15, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(10, 52 - reach * 26, 30, 82 - reach * 20), { key: "arm.l", fill: _pandaBlack, amplitude: 1.8, segments: 11, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(70, 52 - reach * 26, 90, 82 - reach * 20), { key: "arm.r", fill: _pandaBlack, amplitude: 1.8, segments: 11, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(28, 80, 46, 96), { key: "leg.l", fill: _pandaBlack, amplitude: 1.2, segments: 10, width: 2.0, hatch: false });
  pen.blob(rectFromLTRB(54, 80, 72, 96), { key: "leg.r", fill: _pandaBlack, amplitude: 1.2, segments: 10, width: 2.0, hatch: false });
  pen.poly([{ x: 30, y: 34 }, { x: 46, y: 40 }, { x: 42, y: 56 }, { x: 28, y: 50 }], { key: "patch.l", fill: _pandaBlack, amplitude: 1.0, width: 2.0, hatch: false });
  pen.poly([{ x: 70, y: 34 }, { x: 72, y: 50 }, { x: 58, y: 56 }, { x: 54, y: 40 }], { key: "patch.r", fill: _pandaBlack, amplitude: 1.0, width: 2.0, hatch: false });
  pen.eye({ x: 37, y: 45 }, 6.4, { key: "eye.l", pupil: 0.68, width: 1.4 });
  pen.eye({ x: 63, y: 46 }, 6.0, { key: "eye.r", pupil: 0.68, width: 1.4 });
  // rosy cheeks as soft blobs
  pen.blob(rectFromLTRB(20, 54, 31, 61), { key: "cheek.l", fill: "#F2A0C0", amplitude: 0.8, segments: 9, width: 1.0, hatch: false });
  pen.blob(rectFromLTRB(69, 54, 80, 61), { key: "cheek.r", fill: "#F2A0C0", amplitude: 0.8, segments: 9, width: 1.0, hatch: false });
  pen.blob(rectFromLTRB(45, 56, 55, 64), { key: "nose", fill: _pandaBlack, amplitude: 0.6, segments: 9, width: 1.4, hatch: false });
  pen.stroke([{ x: 41, y: 68 }, { x: 50, y: 74 }, { x: 59, y: 68 }], { key: "smile", width: 1.8, amplitude: 0.4 });
}

// Rooster
const _roosterPalette: CrayonPalette = {
  body: "#C8452E",
  belly: "#F0C24A",
  outline: "#4A1E12",
  accent: "#E23A2A",
  eyeWhite: "#FFF6E0",
  pupil: "#2A1206",
};
const _roosterGold = "#F2A82E";
const _roosterTail = "#2E6A54";
export const kCrayonRooster: CrayonAvatarSpec = { id: "rooster", name: "Rooster", palette: _roosterPalette, draw: _drawRooster };
function _drawRooster(pen: CrayonPen): void {
  const p = pen.palette;
  const crow = pen.limb;
  for (let i = 0; i < 4; i++) {
    const t = i / 3.0;
    const root = { x: 30, y: 66 };
    const tip = { x: 6 - i * 1.5, y: 46 - t * 30 };
    const bend = lerpOffset(root, tip, 0.5);
    bend.x += -10;
    bend.y += 2;
    pen.stroke([root, bend, tip], { key: `tail${i}`, color: i % 2 === 0 ? _roosterTail : p.accent, width: 5.0 - i * 0.4, amplitude: 0.8, grain: 0.35 });
  }
  pen.blob(rectFromLTRB(28, 40, 78, 84), { key: "body", fill: p.body, amplitude: 2.8, segments: 14, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(56, 52, 78, 82), { key: "breast", fill: p.belly, amplitude: 2.0, segments: 12, width: 2.0, hatchDegrees: 70 });
  pen.blob(rectFromLTRB(52, 18, 82, 46), { key: "head", fill: p.body, amplitude: 2.0, segments: 12, width: 2.6 });
  pen.poly([{ x: 56, y: 20 }, { x: 60, y: 8 - crow * 2 }, { x: 64, y: 18 }, { x: 69, y: 7 - crow * 2 }, { x: 73, y: 17 }, { x: 78, y: 9 - crow * 2 }, { x: 80, y: 22 }], { key: "comb", fill: p.accent, amplitude: 0.7, width: 2.0, hatch: false });
  pen.poly([{ x: 80, y: 30 }, { x: 96, y: 28 - crow * 2 }, { x: 80, y: 37 }], { key: "beak.top", fill: _roosterGold, amplitude: 0.4, width: 1.8 });
  pen.poly([{ x: 80, y: 38 }, { x: 94, y: 40 + crow * 3 }, { x: 80, y: 43 }], { key: "beak.bot", fill: _roosterGold, amplitude: 0.4, width: 1.6 });
  pen.blob(rectFromLTRB(78, 42, 88, 56), { key: "wattle", fill: p.accent, amplitude: 0.9, segments: 10, width: 1.8, hatch: false });
  _roosterLeg(pen, 46);
  _roosterLeg(pen, 58);
  pen.eye({ x: 68, y: 31 }, 6.5, { key: "eye", pupil: 0.5, width: 1.6 });
}
function _roosterLeg(pen: CrayonPen, x: number): void {
  pen.stroke([{ x, y: 82 }, { x, y: 95 }], { key: `leg${x}.shin`, color: _roosterGold, width: 2.2 });
  for (let i = -1; i <= 1; i++) {
    pen.stroke([{ x, y: 95 }, { x: x + i * 4.5, y: 98.5 }], { key: `leg${x}.toe${i}`, color: _roosterGold, width: 1.6 });
  }
}

// Turtle
const _turtlePalette: CrayonPalette = {
  body: "#5F9E6A",
  belly: "#E9D79A",
  outline: "#2E4A2C",
  accent: "#E0A94A",
  eyeWhite: "#F4FBE8",
  pupil: "#243A22",
};
const _turtleLimb = "#4C8556";
export const kCrayonTurtle: CrayonAvatarSpec = { id: "turtle", name: "Turtle", palette: _turtlePalette, draw: _drawTurtle };
function _drawTurtle(pen: CrayonPen): void {
  const p = pen.palette;
  const peek = pen.limb;
  for (const lx of [26, 70]) {
    pen.blob(rectFromLTRB(lx - 8, 70, lx + 8, 88), { key: `leg${lx}`, fill: _turtleLimb, amplitude: 1.0, segments: 9, width: 2.0, hatch: false });
  }
  pen.poly([{ x: 16, y: 60 }, { x: 6, y: 62 }, { x: 16, y: 66 }], { key: "tail", fill: _turtleLimb, amplitude: 0.5, width: 1.6, hatch: false });
  const hx = 78 + peek * 8;
  pen.stroke([{ x: 70, y: 54 }, { x: hx - 6, y: 50 }], { key: "neck", color: p.body, width: 7.0, amplitude: 0.4 });
  pen.blob(rectFromLTRB(hx - 8, 40, hx + 8, 58), { key: "head", fill: p.body, amplitude: 1.2, segments: 11, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(18, 56, 78, 82), { key: "plastron", fill: p.belly, amplitude: 1.4, segments: 13, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(18, 30, 78, 72), { key: "shell", fill: p.body, amplitude: 2.2, segments: 15, width: 3.0, retrace: true });
  pen.stroke([{ x: 26, y: 58 }, { x: 40, y: 40 }, { x: 58, y: 38 }, { x: 72, y: 56 }], { key: "shell.ridge", color: _turtleLimb, width: 1.6, amplitude: 0.4, grain: 0.15 });
  for (let i = 0; i < 3; i++) {
    const x = 34.0 + i * 12.0;
    pen.stroke([{ x, y: 58 }, { x: x + 4, y: 40 }], { key: `shell.rib${i}`, color: _turtleLimb, width: 1.4, amplitude: 0.3, grain: 0.15 });
  }
  pen.eye({ x: hx + 1, y: 47 }, 4.6, { key: "eye", pupil: 0.5, width: 1.3 });
  pen.stroke([{ x: hx + 3, y: 53 }, { x: hx + 8, y: 54 }], { key: "mouth", width: 1.2, amplitude: 0.2 });
}

// Dragon
const _dragonPalette: CrayonPalette = {
  body: "#9E3324",
  belly: "#F0B23E",
  outline: "#3A140C",
  accent: "#FFC24A",
  eyeWhite: "#FCE08A",
  pupil: "#2A0E06",
};
const _dragonWing = "#6E241A";
const _dragonBone = "#E8D6A8";
export const kCrayonDragon: CrayonAvatarSpec = { id: "dragon", name: "Dragon", palette: _dragonPalette, draw: _drawDragon };
function _drawDragon(pen: CrayonPen): void {
  const p = pen.palette;
  const spread = pen.limb;
  const open = 0.4 + spread * 0.6;
  for (const s of [-1.0, 1.0] as const) {
    const bx = 50 + s * 6;
    pen.poly([{ x: bx, y: 44 }, { x: bx + s * (30 + open * 26), y: 20 - open * 12 }, { x: bx + s * (36 + open * 20), y: 44 }, { x: bx + s * (30 + open * 16), y: 58 }, { x: bx + s * (18 + open * 10), y: 52 }], { key: `wing.${s < 0 ? "l" : "r"}`, fill: _dragonWing, amplitude: 1.2, width: 2.2, hatch: false });
    for (let i = 0; i < 2; i++) {
      pen.stroke([{ x: bx, y: 46 }, { x: bx + s * (24 + i * 8 + open * 18), y: 30 - open * 8 + i * 12 }], { key: `wing.${s < 0 ? "l" : "r"}.rib${i}`, color: p.outline, width: 1.4, amplitude: 0.4 });
    }
  }
  pen.poly([{ x: 38, y: 22 }, { x: 30, y: 4 }, { x: 44, y: 16 }], { key: "horn.l", fill: _dragonBone, amplitude: 0.6, width: 1.8, hatch: false });
  pen.poly([{ x: 58, y: 22 }, { x: 70, y: 5 }, { x: 64, y: 18 }], { key: "horn.r", fill: _dragonBone, amplitude: 0.6, width: 1.8, hatch: false });
  pen.blob(rectFromLTRB(30, 20, 72, 84), { key: "body", fill: p.body, amplitude: 2.8, segments: 14, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(40, 52, 64, 84), { key: "belly", fill: p.belly, amplitude: 1.8, segments: 12, width: 2.0, hatchDegrees: 80 });
  for (let i = 0; i < 4; i++) {
    const t = i / 3.0;
    const x = 34 + t * 10;
    const y = 30 + t * 40;
    pen.poly([{ x: x - 3, y }, { x: x - 8 - i, y: y + 4 }, { x: x - 2, y: y + 7 }], { key: `spike${i}`, fill: _dragonBone, amplitude: 0.4, width: 1.4, hatch: false });
  }
  pen.stroke([{ x: 40, y: 82 }, { x: 24, y: 90 }, { x: 14, y: 80 }, { x: 20, y: 70 }], { key: "tail", color: p.body, width: 5.0, amplitude: 0.7, grain: 0.35 });
  pen.poly([{ x: 20, y: 70 }, { x: 12, y: 64 }, { x: 24, y: 66 }], { key: "tail.spade", fill: p.accent, amplitude: 0.4, width: 1.4, hatch: false });
  _dragonFoot(pen, 42);
  _dragonFoot(pen, 60);
  pen.blob(rectFromLTRB(44, 40, 78, 60), { key: "snout", fill: p.body, amplitude: 1.2, segments: 12, width: 2.2, hatch: false });
  pen.blob(rectFromLTRB(72, 45, 76, 49), { key: "nostril", fill: p.outline, amplitude: 0.4, segments: 8, width: 1.2, hatch: false });
  pen.poly([{ x: 66, y: 58 }, { x: 69, y: 66 }, { x: 72, y: 58 }], { key: "fang", fill: _dragonBone, amplitude: 0.3, width: 1.2, hatch: false });
  pen.eye({ x: 46, y: 34 }, 9.5, { key: "eye.l", pupil: 0.55, pupilAspect: 0.36, width: 1.6 });
  pen.eye({ x: 62, y: 35 }, 7.5, { key: "eye.r", pupil: 0.55, pupilAspect: 0.36, width: 1.6 });
}
function _dragonFoot(pen: CrayonPen, x: number): void {
  pen.stroke([{ x, y: 82 }, { x, y: 92 }], { key: `dfoot${x}.leg`, width: 3.0 });
  for (let i = -1; i <= 1; i++) {
    pen.stroke([{ x, y: 92 }, { x: x + i * 4.0, y: 97.5 }], { key: `dfoot${x}.claw${i}`, color: _dragonBone, width: 1.6 });
  }
}

// Phoenix
const _phoenixPalette: CrayonPalette = {
  body: "#F06A1E",
  belly: "#FFC24A",
  outline: "#7A2408",
  accent: "#FFF0A0",
  eyeWhite: "#FFF3D0",
  pupil: "#5A1A06",
};
const _phoenixDeep = "#D23A16";
const _phoenixGold = "#FFC94A";
export const kCrayonPhoenix: CrayonAvatarSpec = { id: "phoenix", name: "Phoenix", palette: _phoenixPalette, draw: _drawPhoenix };
function _drawPhoenix(pen: CrayonPen): void {
  const p = pen.palette;
  const spread = pen.limb;
  const open = 0.45 + spread * 0.55;
  for (let i = 0; i < 3; i++) {
    const s = (i - 1).toString() as unknown as number;
    const sv = i - 1;
    pen.stroke([{ x: 50, y: 74 }, { x: 50 + sv * 10, y: 88 }, { x: 50 + sv * 16, y: 98 }], { key: `tail${i}`, color: i % 2 === 0 ? _phoenixDeep : _phoenixGold, width: 4.4 - i * 0.4, amplitude: 1.0, grain: 0.3 });
  }
  for (const s of [-1.0, 1.0] as const) {
    for (let i = 0; i < 3; i++) {
      const c = [_phoenixDeep, p.body, _phoenixGold][i];
      pen.poly([{ x: 50 + s * 8, y: 46 }, { x: 50 + s * (26 + open * 22 + i * 4), y: 34 - open * 10 - i * 6 }, { x: 50 + s * (30 + open * 18), y: 50 + i * 3 }], { key: `wing.${s < 0 ? "l" : "r"}.${i}`, fill: c, amplitude: 0.9, width: 1.8, hatch: false });
    }
  }
  for (let i = 0; i < 3; i++) {
    pen.poly([{ x: 44 + i * 6.0, y: 26 }, { x: 40 + i * 7.0, y: 6 + i * 2.0 }, { x: 50 + i * 6.0, y: 24 }], { key: `crest${i}`, fill: i == 1 ? _phoenixGold : p.body, amplitude: 0.5, width: 1.4, hatch: false });
  }
  pen.blob(rectFromLTRB(36, 26, 64, 78), { key: "body", fill: p.body, amplitude: 2.4, segments: 13, width: 2.8, retrace: true });
  pen.blob(rectFromLTRB(42, 48, 60, 76), { key: "belly", fill: p.belly, amplitude: 1.6, segments: 12, width: 1.8, hatchDegrees: 76 });
  pen.poly([{ x: 58, y: 34 }, { x: 72, y: 38 }, { x: 58, y: 42 }], { key: "beak", fill: _phoenixGold, amplitude: 0.4, width: 1.6 });
  pen.eye({ x: 52, y: 36 }, 6.5, { key: "eye", pupil: 0.5, width: 1.4 });
}

// Griffin
const _griffinPalette: CrayonPalette = {
  body: "#C79A54",
  belly: "#F2E4C2",
  outline: "#3E2E1A",
  accent: "#E8B84A",
  eyeWhite: "#FFFBEC",
  pupil: "#2A1E10",
};
const _griffinHead = "#EFE6D0";
const _griffinWing = "#8A6A3E";
export const kCrayonGriffin: CrayonAvatarSpec = { id: "griffin", name: "Griffin", palette: _griffinPalette, draw: _drawGriffin };
function _drawGriffin(pen: CrayonPen): void {
  const p = pen.palette;
  const spread = pen.limb;
  const open = 0.4 + spread * 0.6;
  for (const s of [-1.0, 1.0] as const) {
    const bx = 50 + s * 4;
    pen.poly([{ x: bx, y: 40 }, { x: bx + s * (28 + open * 24), y: 18 - open * 10 }, { x: bx + s * (34 + open * 18), y: 40 }, { x: bx + s * (26 + open * 12), y: 56 }], { key: `wing.${s < 0 ? "l" : "r"}`, fill: _griffinWing, amplitude: 1.1, width: 2.2, hatch: false });
    for (let i = 0; i < 2; i++) {
      pen.stroke([{ x: bx, y: 42 }, { x: bx + s * (22 + i * 8 + open * 16), y: 26 - open * 6 + i * 12 }], { key: `wing.${s < 0 ? "l" : "r"}.rib${i}`, color: p.outline, width: 1.2, amplitude: 0.4 });
    }
  }
  pen.blob(rectFromLTRB(24, 40, 74, 88), { key: "body", fill: p.body, amplitude: 2.6, segments: 14, width: 3.0, retrace: true });
  pen.stroke([{ x: 28, y: 78 }, { x: 14, y: 74 }, { x: 10, y: 60 }], { key: "tail", color: p.body, width: 3.2, amplitude: 0.6 });
  pen.blob(rectFromLTRB(6, 52, 18, 64), { key: "tail.tuft", fill: p.accent, amplitude: 0.8, segments: 10, width: 1.6, hatch: false });
  pen.blob(rectFromLTRB(28, 82, 42, 96), { key: "paw", fill: p.body, amplitude: 0.9, segments: 10, width: 2.0, hatch: false });
  pen.stroke([{ x: 60, y: 84 }, { x: 60, y: 94 }], { key: "talon.leg", color: p.accent, width: 2.6 });
  for (let i = -1; i <= 1; i++) {
    pen.stroke([{ x: 60, y: 94 }, { x: 60 + i * 4.0, y: 98 }], { key: `talon${i}`, color: p.accent, width: 1.6 });
  }
  pen.blob(rectFromLTRB(48, 20, 80, 50), { key: "head", fill: _griffinHead, amplitude: 1.6, segments: 12, width: 2.4 });
  for (let i = 0; i < 3; i++) {
    pen.poly([{ x: 52 + i * 5.0, y: 24 }, { x: 48 + i * 5.0, y: 12 }, { x: 58 + i * 5.0, y: 22 }], { key: `crest${i}`, fill: _griffinHead, amplitude: 0.4, width: 1.2, hatch: false });
  }
  pen.poly([{ x: 74, y: 34 }, { x: 92, y: 38 }, { x: 74, y: 44 }], { key: "beak.top", fill: p.accent, amplitude: 0.4, width: 1.6 });
  pen.stroke([{ x: 88, y: 39 }, { x: 84, y: 46 }], { key: "beak.hook", color: p.outline, width: 1.6 });
  pen.eye({ x: 64, y: 34 }, 7.0, { key: "eye", pupil: 0.5, width: 1.6 });
  pen.stroke([{ x: 56, y: 27 }, { x: 70, y: 30 }], { key: "brow", width: 1.8, amplitude: 0.4 });
}

// Frog
const _frogPalette: CrayonPalette = {
  body: "#5CB94F",
  belly: "#D8EBA4",
  outline: "#245E28",
  accent: "#E8604C",
  eyeWhite: "#FFF7DC",
  pupil: "#241A10",
};
const _frogSpot = "#3C8A38";
const _frogMouth = "#6E1E22";
export const kCrayonFrog: CrayonAvatarSpec = { id: "frog", name: "Frog", palette: _frogPalette, draw: _drawFrog };
function _drawFrog(pen: CrayonPen): void {
  const p = pen.palette;
  const flick = pen.limb;
  for (const hx of [20, 80]) {
    pen.blob(rectFromLTRB(hx - 12, 52, hx + 12, 88), { key: `haunch${hx}`, fill: _frogSpot, amplitude: 1.6, segments: 11, width: 2.4, hatch: false });
  }
  pen.blob(rectFromLTRB(22, 44, 78, 92), { key: "body", fill: p.body, amplitude: 2.6, segments: 15, width: 3.0, retrace: true });
  pen.blob(rectFromLTRB(34, 64, 66, 91), { key: "belly", fill: p.belly, amplitude: 1.6, segments: 12, width: 2.0, hatch: false });
  for (let i = 0; i < 3; i++) {
    const sx = 32.0 + i * 14.0;
    const sy = 50.0 + (i % 2 === 0 ? 0.0 : 5.0);
    pen.blob(rectFromLTRB(sx - 4, sy - 3, sx + 4, sy + 3), { key: `spot${i}`, fill: _frogSpot, amplitude: 0.6, segments: 8, width: 1.4, hatch: false });
  }
  _frogFoot(pen, 38, "foot.l");
  _frogFoot(pen, 62, "foot.r");
  for (const ex of [35, 65]) {
    pen.blob(rectFromLTRB(ex - 12, 16, ex + 12, 40), { key: `bulge${ex}`, fill: p.body, amplitude: 1.2, segments: 12, width: 2.6, hatch: false, retrace: true });
  }
  if (flick < 0.12) {
    pen.stroke([{ x: 30, y: 60 }, { x: 50, y: 67 }, { x: 70, y: 60 }], { key: "mouth", width: 2.2, amplitude: 0.4 });
  } else {
    const open = flick;
    pen.poly([{ x: 31, y: 59 }, { x: 50, y: 63 + open * 8 }, { x: 69, y: 59 }, { x: 50, y: 61 + open * 2 }], { key: "maw", fill: _frogMouth, amplitude: 0.6, width: 2.0, hatch: false });
  }
  pen.eye({ x: 35, y: 27 }, 9.5, { key: "eye.l", pupil: 0.46, width: 1.8 });
  pen.eye({ x: 65, y: 27 }, 9.0, { key: "eye.r", pupil: 0.46, width: 1.8 });
  pen.stroke([{ x: 46, y: 50 }, { x: 46.4, y: 51 }], { key: "nostril.l", width: 1.6, amplitude: 0.1 });
  pen.stroke([{ x: 54, y: 50 }, { x: 54.4, y: 51 }], { key: "nostril.r", width: 1.6, amplitude: 0.1 });
  if (flick >= 0.12) {
    const reach = 6 + flick * 52;
    const root = { x: 56, y: 62 };
    const tip = { x: root.x + reach, y: 60 - flick * 6 };
    const mid = { x: root.x + reach * 0.55, y: 64 - flick * 2 };
    pen.stroke([root, mid, tip], { key: "tongue", color: p.accent, width: 4.2 - flick * 1.2, amplitude: 0.5, grain: 0.2 });
    // sticky ball via blob
    pen.blob(rectFromLTRB(tip.x - 3.2 - flick * 1.4, tip.y - 3.2 - flick * 1.4, tip.x + 3.2 + flick * 1.4, tip.y + 3.2 + flick * 1.4), { key: "tongue.ball", fill: p.accent, amplitude: 0.8, segments: 9, width: 1.2, hatch: false });
  }
}
function _frogFoot(pen: CrayonPen, x: number, key: string): void {
  pen.blob(rectFromLTRB(x - 9, 84, x + 9, 95), { key, fill: pen.palette.belly, amplitude: 0.9, segments: 10, width: 2.0, hatch: false });
  pen.stroke([{ x: x - 3, y: 87 }, { x: x - 4, y: 95 }], { key: `${key}.toe0`, width: 1.3, amplitude: 0.2 });
  pen.stroke([{ x: x + 3, y: 87 }, { x: x + 4, y: 95 }], { key: `${key}.toe1`, width: 1.3, amplitude: 0.2 });
}

export const crayonAvatarSpecs: Record<string, CrayonAvatarSpec> = {
  owl: kCrayonOwl,
  fox: kCrayonFox,
  cat: kCrayonCat,
  dog: kCrayonDog,
  ufo: kCrayonUfo,
  panda: kCrayonPanda,
  rooster: kCrayonRooster,
  turtle: kCrayonTurtle,
  dragon: kCrayonDragon,
  phoenix: kCrayonPhoenix,
  griffin: kCrayonGriffin,
  frog: kCrayonFrog,
};
