let ctx: AudioContext | null = null;
let _enabled = true;

export function setSoundEnabled(v: boolean) {
  _enabled = v;
}

export function isSoundEnabled() {
  return _enabled;
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function gain(vol = 0.3) {
  const g = getCtx().createGain();
  g.gain.value = vol;
  g.connect(getCtx().destination);
  return g;
}

function osc(type: OscillatorType, freq: number, start: number, stop: number) {
  const o = getCtx().createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.start(start);
  o.stop(stop);
  return o;
}

function noise(duration: number) {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

// --- Sounds ---

export function playClick() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.1);
    const o = osc("sine", 800, c.currentTime, c.currentTime + 0.05);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
  } catch { /* silent fallback */ }
}

export function playCorrect() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.25);
    const o = osc("sine", 523, c.currentTime, c.currentTime + 0.4);
    o.frequency.setValueAtTime(523, c.currentTime);
    o.frequency.setValueAtTime(659, c.currentTime + 0.12);
    o.frequency.setValueAtTime(784, c.currentTime + 0.24);
    o.connect(g);
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.45);
  } catch { /* silent fallback */ }
}

export function playWrong() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.2);
    const o = osc("sawtooth", 150, c.currentTime, c.currentTime + 0.35);
    o.connect(g);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.35);
  } catch { /* silent fallback */ }
}

export function playHeartbreak() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    // Descending tone
    const g1 = gain(0.2);
    const o1 = osc("square", 400, c.currentTime, c.currentTime + 0.5);
    o1.frequency.setValueAtTime(400, c.currentTime);
    o1.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.5);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.2, c.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5);
    // Noise burst
    const g2 = gain(0.12);
    const n = noise(0.15);
    n.connect(g2);
    n.start(c.currentTime);
    n.stop(c.currentTime + 0.15);
    g2.gain.setValueAtTime(0.12, c.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.15);
  } catch { /* silent fallback */ }
}

export function playXp() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.2);
    const o = osc("sine", 440, c.currentTime, c.currentTime + 0.5);
    o.frequency.setValueAtTime(440, c.currentTime);
    o.frequency.setValueAtTime(554, c.currentTime + 0.12);
    o.frequency.setValueAtTime(659, c.currentTime + 0.24);
    o.frequency.setValueAtTime(880, c.currentTime + 0.36);
    o.connect(g);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.55);
  } catch { /* silent fallback */ }
}

export function playGem() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.15);
    const o = osc("sine", 1200, c.currentTime, c.currentTime + 0.6);
    o.frequency.setValueAtTime(1200, c.currentTime);
    o.frequency.setValueAtTime(1400, c.currentTime + 0.15);
    o.frequency.setValueAtTime(1600, c.currentTime + 0.3);
    o.connect(g);
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.6);
  } catch { /* silent fallback */ }
}

export function playComplete() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.25);
    // Major chord arpeggio
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const dur = 0.1;
    const o = osc("sine", 523, c.currentTime, c.currentTime + notes.length * dur + 0.3);
    notes.forEach((f, i) => {
      o.frequency.setValueAtTime(f, c.currentTime + i * dur);
    });
    o.connect(g);
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.setValueAtTime(0.25, c.currentTime + notes.length * dur);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + notes.length * dur + 0.3);
  } catch { /* silent fallback */ }
}

export function playDailyComplete() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.3);
    const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
    const dur = 0.12;
    const o = osc("triangle", 523, c.currentTime, c.currentTime + notes.length * dur + 0.5);
    notes.forEach((f, i) => {
      o.frequency.setValueAtTime(f, c.currentTime + i * dur);
    });
    o.connect(g);
    g.gain.setValueAtTime(0.3, c.currentTime);
    g.gain.setValueAtTime(0.3, c.currentTime + notes.length * dur);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + notes.length * dur + 0.5);
  } catch { /* silent fallback */ }
}

export function playLessonComplete() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.2);
    const o = osc("sine", 440, c.currentTime, c.currentTime + 0.5);
    o.frequency.setValueAtTime(440, c.currentTime);
    o.frequency.setValueAtTime(554, c.currentTime + 0.15);
    o.frequency.setValueAtTime(440, c.currentTime + 0.3);
    o.connect(g);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5);
  } catch { /* silent fallback */ }
}

export function playUnlock() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.2);
    const o = osc("sine", 300, c.currentTime, c.currentTime + 0.4);
    o.frequency.setValueAtTime(300, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.35);
    o.connect(g);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);
  } catch { /* silent fallback */ }
}

export function playStreak() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.25);
    const notes = [392, 440, 494, 523, 587, 659]; // G4, A4, B4, C5, D5, E5
    const dur = 0.08;
    const o = osc("triangle", 392, c.currentTime, c.currentTime + notes.length * dur + 0.3);
    notes.forEach((f, i) => {
      o.frequency.setValueAtTime(f, c.currentTime + i * dur);
    });
    o.connect(g);
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.setValueAtTime(0.25, c.currentTime + notes.length * dur);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + notes.length * dur + 0.3);
  } catch { /* silent fallback */ }
}

export function playRiddleReveal() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.2);
    // Suspenseful rising tone — slow ascending sine
    const o = osc("sine", 200, c.currentTime, c.currentTime + 1.2);
    o.frequency.setValueAtTime(200, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 1.0);
    o.connect(g);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.2);
    // Soft shimmer
    const g2 = gain(0.08);
    const o2 = osc("triangle", 1200, c.currentTime + 0.8, c.currentTime + 1.3);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.08, c.currentTime + 0.8);
    g2.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.3);
  } catch { /* silent fallback */ }
}

export function playRiddleCorrect() {
  if (!_enabled) return;
  try {
    const c = getCtx();
    const g = gain(0.2);
    // Gentle two-note chime
    const notes = [523, 784];
    const dur = 0.2;
    const o = osc("triangle", notes[0], c.currentTime, c.currentTime + dur * 2 + 0.3);
    notes.forEach((f, i) => {
      o.frequency.setValueAtTime(f, c.currentTime + i * dur);
    });
    o.connect(g);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.setValueAtTime(0.2, c.currentTime + dur * 2);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + dur * 2 + 0.3);
  } catch { /* silent fallback */ }
}

// --- Avatar Selection Sounds (HTML Audio, no AudioContext needed) ---

const avatarEls: Record<string, HTMLAudioElement | null> = {};
let playingAvatarId: string | null = null;
let avatarTimer: ReturnType<typeof setTimeout> | null = null;

function stopAvatarSound() {
  if (avatarTimer) { clearTimeout(avatarTimer); avatarTimer = null; }
  if (playingAvatarId) {
    const el = avatarEls[playingAvatarId];
    if (el) { el.pause(); el.currentTime = 0; }
    playingAvatarId = null;
  }
}

function playAvatar(id: string, vol = 0.35) {
  // Always stop current sound first (even when sound disabled, to silence anything playing)
  stopAvatarSound();
  if (!_enabled) return;
  // Get or create audio element
  let audio = avatarEls[id];
  if (!audio) {
    audio = new Audio(`/sounds/avatars/${id}.mp3`);
    avatarEls[id] = audio;
  }
  audio.volume = vol;
  playingAvatarId = id;
  audio.play().catch(() => {});
  // Cap at 3 seconds
  avatarTimer = setTimeout(() => {
    if (playingAvatarId === id) stopAvatarSound();
  }, 3000);
}

export function playOwlSound() { playAvatar("owl", 0.4); }
export function playFoxSound() { playAvatar("fox", 0.3); }
export function playCatSound() { playAvatar("cat", 0.35); }
export function playDogSound() { playAvatar("dog", 0.4); }
export function playUfoSound() { playAvatar("ufo", 0.35); }
export function playPandaSound() { playAvatar("panda", 0.3); }
export function playRoosterSound() { playAvatar("rooster", 0.3); }
export function playTurtleSound() { playAvatar("turtle", 0.3); }

export const avatarSounds: Record<string, () => void> = {
  owl: playOwlSound,
  fox: playFoxSound,
  cat: playCatSound,
  dog: playDogSound,
  ufo: playUfoSound,
  panda: playPandaSound,
  rooster: playRoosterSound,
  turtle: playTurtleSound,
};

// Warm up AudioContext for procedural sounds on first user interaction
export function initSounds() {
  try {
    if (typeof document === "undefined") return;
    const handler = () => {
      try { getCtx(); } catch { /* AudioContext may be blocked */ }
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
    document.addEventListener("click", handler);
    document.addEventListener("touchstart", handler);
  } catch {
    // Silent fallback — sound will be disabled
  }
}
