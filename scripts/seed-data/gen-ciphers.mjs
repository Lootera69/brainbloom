// Generator + verifier + emitter for the weekly-cipher seed set.
//
// Every cipher is HARD. Each entry declares its plaintext + method params;
// this script ENCODES it, DECODES the result back and asserts it matches, so
// no wrong ciphertext can reach the seed data. On success it writes the typed
// seed file scripts/seed-data/ciphers.generated.ts (consumed by the Studio
// "Load Ciphers" tool). Run:  node scripts/seed-data/gen-ciphers.mjs
//
// This file is the single source of truth for cipher content. Edit here, then
// re-run to regenerate ciphers.generated.ts. Never hand-edit the generated file.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const A = "abcdefghijklmnopqrstuvwxyz";
const clean = (s) => s.toLowerCase();

// ---- primitive ciphers (encode + decode pairs) ---------------------------

function caesarEnc(t, k) {
  return t.replace(/[a-z]/g, (c) => A[(A.indexOf(c) + k) % 26]);
}
function caesarDec(t, k) {
  return t.replace(/[a-z]/g, (c) => A[(A.indexOf(c) - k + 26) % 26]);
}

function atbash(t) {
  return t.replace(/[a-z]/g, (c) => A[25 - A.indexOf(c)]);
}

function vigEnc(t, key) {
  let i = 0;
  return t.replace(/[a-z]/g, (c) => {
    const k = A.indexOf(key[i % key.length]);
    i++;
    return A[(A.indexOf(c) + k) % 26];
  });
}
function vigDec(t, key) {
  let i = 0;
  return t.replace(/[a-z]/g, (c) => {
    const k = A.indexOf(key[i % key.length]);
    i++;
    return A[(A.indexOf(c) - k + 26) % 26];
  });
}

function modInv(a, m) {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  throw new Error(`no inverse for a=${a}`);
}
function affineEnc(t, a, b) {
  return t.replace(/[a-z]/g, (c) => A[(a * A.indexOf(c) + b) % 26]);
}
function affineDec(t, a, b) {
  const ai = modInv(a, 26);
  return t.replace(/[a-z]/g, (c) => A[((ai * (A.indexOf(c) - b)) % 26 + 26 * 26) % 26]);
}

function toBase64(t) { return Buffer.from(t, "utf8").toString("base64"); }
function fromBase64(t) { return Buffer.from(t, "base64").toString("utf8"); }

function toBinary(t) {
  return t.split("").map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
}
function fromBinary(t) {
  return t.trim().split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join("");
}

function toHex(t) {
  return t.split("").map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
}
function fromHex(t) {
  return t.trim().split(/\s+/).map((h) => String.fromCharCode(parseInt(h, 16))).join("");
}

const MORSE = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....",
  i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.",
  q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-",
  y: "-.--", z: "--..",
};
const UNMORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
function toMorse(t) {
  return t.split(" ").map((w) => w.split("").map((c) => MORSE[c]).join(" ")).join(" / ");
}
function fromMorse(t) {
  return t.split(" / ").map((w) => w.trim().split(/\s+/).map((s) => UNMORSE[s]).join("")).join(" ");
}

// A1Z26: letters -> numbers, double-space between words.
function toA1Z26(t) {
  return t.split(" ").map((w) => w.split("").map((c) => A.indexOf(c) + 1).join(" ")).join("  ");
}
function fromA1Z26(t) {
  return t.split("  ").map((w) => w.trim().split(/\s+/).map((n) => A[+n - 1]).join("")).join(" ");
}

// Polybius 5x5, i/j share cell 24. Coordinates are (row,col), 1-indexed.
function polyGrid() {
  const letters = "abcdefghiklmnopqrstuvwxyz"; // no j
  const map = {}, rev = {};
  for (let i = 0; i < 25; i++) {
    const r = Math.floor(i / 5) + 1, c = (i % 5) + 1;
    map[letters[i]] = `${r}${c}`;
    rev[`${r}${c}`] = letters[i];
  }
  map["j"] = map["i"];
  return { map, rev };
}
function toPolybius(t) {
  const { map } = polyGrid();
  return t.replace(/ /g, "").split("").map((c) => map[c]).join(" ");
}
function fromPolybius(t) {
  const { rev } = polyGrid();
  return t.trim().split(/\s+/).map((p) => rev[p]).join("");
}

// Rail fence with N rails.
function railEnc(t, n) {
  t = t.replace(/ /g, "");
  const rows = Array.from({ length: n }, () => []);
  let r = 0, dir = 1;
  for (const c of t) {
    rows[r].push(c);
    if (r === 0) dir = 1; else if (r === n - 1) dir = -1;
    r += dir;
  }
  return rows.map((row) => row.join("")).join("");
}
function railDec(t, n) {
  const len = t.length;
  const pattern = [];
  let r = 0, dir = 1;
  for (let i = 0; i < len; i++) {
    pattern.push(r);
    if (r === 0) dir = 1; else if (r === n - 1) dir = -1;
    r += dir;
  }
  const counts = Array(n).fill(0);
  for (const p of pattern) counts[p]++;
  const rows = [];
  let idx = 0;
  for (let i = 0; i < n; i++) { rows.push(t.slice(idx, idx + counts[i]).split("")); idx += counts[i]; }
  const ptr = Array(n).fill(0);
  let out = "";
  for (const p of pattern) out += rows[p][ptr[p]++];
  return out;
}

// Columnar transposition with a keyword. Read columns in keyword-alphabetical order.
function colEnc(t, key) {
  t = t.replace(/ /g, "");
  const cols = key.length;
  const rows = Math.ceil(t.length / cols);
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => t[r * cols + c] ?? "x"));
  const order = [...key].map((ch, i) => [ch, i]).sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]).map((x) => x[1]);
  let out = "";
  for (const c of order) for (let r = 0; r < rows; r++) out += grid[r][c];
  return out;
}
function colDec(t, key) {
  const cols = key.length;
  const rows = Math.ceil(t.length / cols);
  const order = [...key].map((ch, i) => [ch, i]).sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]).map((x) => x[1]);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(""));
  let idx = 0;
  for (const c of order) for (let r = 0; r < rows; r++) grid[r][c] = t[idx++];
  let out = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out += grid[r][c];
  return out;
}

// Bacon cipher (24-letter variant, i=j, u=v), 5-bit a/b groups.
function baconMaps() {
  const order = "abcdefghiklmnopqrstuwxyz"; // i/j and u/v merged
  const map = {}, rev = {};
  order.split("").forEach((ch, i) => {
    const code = i.toString(2).padStart(5, "0").replace(/0/g, "a").replace(/1/g, "b");
    map[ch] = code; rev[code] = ch;
  });
  map["j"] = map["i"]; map["v"] = map["u"];
  return { map, rev };
}
function toBacon(t) {
  const { map } = baconMaps();
  return t.replace(/ /g, "").split("").map((c) => map[c]).join(" ");
}
function fromBacon(t) {
  const { rev } = baconMaps();
  return t.trim().split(/\s+/).map((g) => rev[g]).join("");
}

// ---- the cipher set -------------------------------------------------------
// `plain` is what gets encoded and shown-once-decoded. For riddle ciphers the
// decoded plain IS the riddle; `answer` (correctAnswer) is the riddle's
// solution. `id` is a stable slug so the loader can upsert without duplicating.
// xpReward 130-160, all category "puzzles", difficulty "hard".

const ciphers = [
  // ===== Original 13 (hardened wording, verified ciphertext) ==============
  {
    id: "cipher-first-transmission",
    title: "First Transmission",
    cipherType: "Morse Code",
    plain: "stay in the shadows",
    answer: "stay in the shadows",
    acceptedAnswers: ["stay in the shadows", "stayintheshadows"],
    xpReward: 130,
    enc: (p) => toMorse(p),
    dec: (c) => fromMorse(c),
    hint: "The oldest electric dialect confesses in nothing but the brief and the sustained; honour the caesura between them.",
    correctExplanation: "This is International Morse Code. A single space separates letters and ' / ' separates words. Decoded, the message reads 'stay in the shadows'.",
    incorrectExplanation: "Read the dots and dashes as Morse. Single spaces break letters; the ' / ' marks break words. Map each group back to its letter using a Morse table.",
  },
  {
    id: "cipher-zig-zag-fence",
    title: "The Zig-Zag Fence",
    cipherType: "Rail Fence (3 rails)",
    plain: "the walls have ears",
    answer: "the walls have ears",
    acceptedAnswers: ["the walls have ears", "thewallshaveears"],
    xpReward: 130,
    enc: (p) => railEnc(p, 3),
    dec: (c) => railDec(c, 3),
    hint: "Nothing was disguised, only made to descend and ascend across a palisade of three tiers before being harvested tier by tier.",
    correctExplanation: "This is a Rail Fence transposition on 3 rails. The plaintext zig-zags down and up across 3 lines, then each line is read out in order. Reconstruct the zig-zag path to recover 'the walls have ears'.",
    incorrectExplanation: "No letters were substituted, only reordered. This is a Rail Fence cipher on 3 rails: the plaintext zig-zags down and up across 3 lines, then each line is read out. Rebuild the zig-zag to undo it.",
  },
  {
    id: "cipher-locksmiths-riddle",
    title: "The Locksmith's Riddle",
    cipherType: "A1Z26 + Riddle",
    plain: "what has keys but opens no locks",
    answer: "a piano",
    acceptedAnswers: ["a piano", "piano"],
    xpReward: 140,
    enc: (p) => toA1Z26(p),
    dec: (c) => fromA1Z26(c),
    hint: "Each ordinal is merely its letter's rank in the alphabet; the sentence you recover is itself an enigma, and the true answer lies one riddle deeper.",
    correctExplanation: "Map each number to a letter (1=A ... 26=Z, double spaces mark word breaks): the message decodes to 'what has keys but opens no locks'. The answer to that riddle is a piano, whose keys make music, not entry.",
    incorrectExplanation: "First convert the numbers to letters (1=A ... 26=Z, double spaces = new word). That reveals a riddle: 'what has keys but opens no locks'. The final answer is not the decoded sentence, it is the solution to the riddle.",
  },
  {
    id: "cipher-keyword-of-the-gods",
    title: "Keyword of the Gods",
    cipherType: "Vigenere",
    plain: "only the worthy may pass",
    answer: "only the worthy may pass",
    acceptedAnswers: ["only the worthy may pass"],
    xpReward: 150,
    enc: (p) => vigEnc(p, "osiris").toUpperCase(),
    dec: (c) => vigDec(clean(c), "osiris"),
    hint: "A repeating watchword drives this many-alphabet drift. Seek the green-skinned arbiter of the Duat who weighs hearts against a feather; his six letters are your key.",
    correctExplanation: "The god is OSIRIS (6 letters). Using OSIRIS as a Vigenere keyword and shifting each ciphertext letter backward by the keyword letter's alphabet position, the message decodes to 'only the worthy may pass'.",
    incorrectExplanation: "This is a Vigenere cipher. Identify the six-letter keyword (the Egyptian god of the afterlife is OSIRIS), align it repeatedly under the ciphertext, and shift each letter backward by the keyword letter's position (A=0, B=1 ... Z=25).",
  },
  {
    id: "cipher-chamber-grid",
    title: "The Chamber Grid",
    cipherType: "Polybius Square",
    plain: "secrets keep",
    answer: "secrets keep",
    acceptedAnswers: ["secrets keep", "secretskeep"],
    xpReward: 150,
    enc: (p) => toPolybius(p),
    dec: (c) => fromPolybius(c),
    hint: "Every pair is a latitude and longitude upon a five-by-five lattice bearing the alphabet in sequence, where the twins I and J are forced to cohabit one cell.",
    correctExplanation: "This is a Polybius square: fill a 5x5 grid A-Z left-to-right (I/J share a cell), then read each digit pair as (row, column). The coordinates decode to 'secrets keep'.",
    incorrectExplanation: "Each two-digit number is a coordinate. Build a 5x5 grid with the alphabet in order (combine I/J), read the first digit as the row and the second as the column, and look up each letter.",
  },
  {
    id: "cipher-two-locks-one-door",
    title: "Two Locks, One Door",
    cipherType: "Base64 + Caesar",
    plain: "follow the north star",
    answer: "follow the north star",
    acceptedAnswers: ["follow the north star"],
    xpReward: 150,
    enc: (p) => toBase64(caesarEnc(p, 7)),
    dec: (c) => caesarDec(fromBase64(c), 7),
    hint: "The outer husk is the six-bit armour machines don to ferry bytes unscathed; peel it and a Roman general's uniform displacement still bars the way.",
    correctExplanation: "Layer one is Base64. Decoding it yields text that is still shifted by a Caesar cipher of +7. Shift each letter back by 7 to get 'follow the north star'.",
    incorrectExplanation: "The mixed-case block is the giveaway for Base64, so decode that first. The result is still gibberish because a Caesar shift of 7 sits underneath. Undo the shift to finish.",
  },
  {
    id: "cipher-ones-and-zeroes",
    title: "Ones and Zeroes",
    cipherType: "Binary + Atbash",
    plain: "the phoenix rises at dusk",
    answer: "the phoenix rises at dusk",
    acceptedAnswers: ["the phoenix rises at dusk"],
    xpReward: 160,
    enc: (p) => toBinary(atbash(p)),
    dec: (c) => atbash(fromBinary(c)),
    hint: "Gather the base-two glyphs into octets and read them as machine characters; what emerges is still ensnared by the ancient Hebrew looking-glass that folds A onto Z.",
    correctExplanation: "Each 8-bit group is an ASCII character. Converting the binary gives text still encrypted with Atbash (A to Z, B to Y, C to X ...). Applying Atbash reveals 'the phoenix rises at dusk'.",
    incorrectExplanation: "Read each group of 8 bits as a byte and convert to ASCII text first. The result is still encrypted with Atbash, the alphabet reversed onto itself. Mirror each letter to finish.",
  },
  {
    id: "cipher-cartographers-cipher",
    title: "The Cartographer's Cipher",
    cipherType: "Hexadecimal + Riddle",
    plain: "the more you take the more you leave behind",
    answer: "footsteps",
    acceptedAnswers: ["footsteps", "foot steps"],
    xpReward: 150,
    enc: (p) => toHex(p),
    dec: (c) => fromHex(c),
    hint: "Read the base-sixteen couplets as the tint-and-character code every screen obeys; the sentence unveiled is a paradox, and its resolution is what you seek.",
    correctExplanation: "Each hex pair is an ASCII code (20 is a space). Decoded, it reads 'the more you take the more you leave behind'. The answer to that riddle is footsteps.",
    incorrectExplanation: "Convert each two-digit hexadecimal number to its ASCII character (20 is a space). That spells a riddle: 'the more you take the more you leave behind'. The final answer is the riddle's solution, not the decoded line.",
  },
  {
    id: "cipher-seamstress-paradox",
    title: "The Seamstress's Paradox",
    cipherType: "Hexadecimal + Riddle",
    plain: "what has an eye but cannot see",
    answer: "a needle",
    acceptedAnswers: ["a needle", "needle"],
    xpReward: 150,
    enc: (p) => toHex(p),
    dec: (c) => fromHex(c),
    hint: "Interpret each base-sixteen duet as the glyph-code every display obeys; the aphorism it exhumes is a paradox, and its resolution, not the sentence, is your quarry.",
    correctExplanation: "Each hex pair is an ASCII code (20 is a space). Decoded it reads 'what has an eye but cannot see'. The answer to that riddle is a needle, whose eye holds thread, not sight.",
    incorrectExplanation: "Convert each two-digit hexadecimal number to its ASCII character (20 is a space). That spells the riddle 'what has an eye but cannot see'. The final answer is the riddle's solution, not the decoded line.",
  },
  {
    id: "cipher-absorbent-enigma",
    title: "The Absorbent Enigma",
    cipherType: "A1Z26 + Riddle",
    plain: "what gets wetter the more it dries",
    answer: "a towel",
    acceptedAnswers: ["a towel", "towel"],
    xpReward: 150,
    enc: (p) => toA1Z26(p),
    dec: (c) => fromA1Z26(c),
    hint: "Every integer is nothing but its letter's station in the alphabet; the twin gaps sever the words. What surfaces is a contradiction whose solution you must name.",
    correctExplanation: "Map each number to a letter (double spaces mark word breaks): the message decodes to 'what gets wetter the more it dries'. The answer is a towel, which soaks up water while drying you.",
    incorrectExplanation: "First convert the numbers to letters (1=A ... 26=Z, double spaces mark word breaks). That reveals a riddle: 'what gets wetter the more it dries'. The final answer is the riddle's solution, not the decoded line.",
  },
  {
    id: "cipher-tolling-signal",
    title: "The Tolling Signal",
    cipherType: "Morse + Riddle",
    plain: "what has hands but cannot clap",
    answer: "a clock",
    acceptedAnswers: ["a clock", "clock"],
    xpReward: 150,
    enc: (p) => toMorse(p),
    dec: (c) => fromMorse(c),
    hint: "The staccato dialect of the wire yields a conundrum once you honour its brief-and-sustained pulses and the slashes cleaving word from word; the answer lies past the sentence.",
    correctExplanation: "Read the Morse (' / ' marks word breaks) to get the riddle 'what has hands but cannot clap'. The answer is a clock.",
    incorrectExplanation: "Decode the Morse first, single spaces break letters and ' / ' breaks words, to get the riddle 'what has hands but cannot clap'. The final answer is the riddle's solution: a clock.",
  },
  {
    id: "cipher-vessels-riddle",
    title: "The Vessel's Riddle",
    cipherType: "Polybius Square + Riddle",
    plain: "what has a neck but no head",
    answer: "a bottle",
    acceptedAnswers: ["a bottle", "bottle"],
    xpReward: 150,
    enc: (p) => toPolybius(p),
    dec: (c) => fromPolybius(c),
    hint: "Each numeral pair is a coordinate on a five-by-five lattice bearing the alphabet in order, the twins I and J sharing one cell; the recovered line is a riddle whose answer you must supply.",
    correctExplanation: "Build a 5x5 Polybius grid (A-Z in order, I/J share a cell); each pair is (row, column). It decodes to 'what has a neck but no head'. The answer is a bottle.",
    incorrectExplanation: "Each two-digit number is a coordinate on a 5x5 grid filled with the alphabet in order (I/J combined): first digit is the row, second the column. That spells 'what has a neck but no head'. The final answer is the riddle's solution: a bottle.",
  },
  {
    id: "cipher-mirrored-alphabet",
    title: "The Mirrored Alphabet",
    cipherType: "Atbash",
    plain: "guard the gate at midnight",
    answer: "guard the gate at midnight",
    acceptedAnswers: ["guard the gate at midnight"],
    xpReward: 140,
    enc: (p) => atbash(p),
    dec: (c) => atbash(c),
    hint: "No letter kept its seat; each was reflected across the alphabet's axis, so the first becomes the last and the fifth from the front the fifth from the rear (A to Z, B to Y).",
    correctExplanation: "This is Atbash, the alphabet reversed onto itself (A to Z, B to Y, C to X ...). Mirroring each letter reveals 'guard the gate at midnight'.",
    incorrectExplanation: "No letters were shifted by a fixed amount; the whole alphabet is mirrored (A to Z, B to Y, C to X ...). Replace each letter with its mirror-image partner to recover the message.",
  },

  // ===== 12 new ciphers ===================================================
  {
    id: "cipher-serpent-fence",
    title: "The Serpent Fence",
    cipherType: "Rail Fence (4 rails)",
    plain: "cross the river at dawn",
    answer: "cross the river at dawn",
    acceptedAnswers: ["cross the river at dawn", "crosstheriveratdawn"],
    xpReward: 140,
    enc: (p) => railEnc(p, 4),
    dec: (c) => railDec(c, 4),
    hint: "A serpent taller than the last coils across four tiers, not three. Trace its scaled descent and rise before you gather each row.",
    correctExplanation: "This is a Rail Fence transposition on 4 rails. The plaintext zig-zags across 4 lines, then each line is read in order. Rebuild the four-rail zig-zag to recover 'cross the river at dawn'.",
    incorrectExplanation: "No letters changed, only their order. This is a Rail Fence cipher, but on 4 rails rather than 3. Map the ciphertext back onto a four-line zig-zag to undo it.",
  },
  {
    id: "cipher-ledger-of-bacon",
    title: "The Ledger of Bacon",
    cipherType: "Baconian",
    plain: "hidden in plain sight",
    answer: "hidden in plain sight",
    acceptedAnswers: ["hidden in plain sight", "hiddeninplainsight"],
    xpReward: 150,
    enc: (p) => toBacon(p),
    dec: (c) => fromBacon(c),
    hint: "A philosopher-statesman hid letters inside a binary of two typefaces. Each character is five marks of only two kinds; read a and b as nought and one.",
    correctExplanation: "This is the Baconian cipher: every letter is a group of five a/b marks (a 24-letter alphabet where I/J and U/V share a code). Decoding each five-mark group spells 'hidden in plain sight'.",
    incorrectExplanation: "Each letter is encoded as five symbols of two kinds (a and b). Split the stream into groups of five, treat a=0 and b=1, and map each 5-bit group to its letter using Bacon's 24-letter alphabet.",
  },
  {
    id: "cipher-apothecarys-formula",
    title: "The Apothecary's Formula",
    cipherType: "Affine (a=5, b=8)",
    plain: "trust no one here",
    answer: "trust no one here",
    acceptedAnswers: ["trust no one here"],
    xpReward: 150,
    enc: (p) => affineEnc(p, 5, 8).toUpperCase(),
    dec: (c) => affineDec(clean(c), 5, 8),
    hint: "Each letter was passed through a formula: multiply its position, then add a fixed dose. The multiplier is five and the additive is eight. To undo it you must divide, which on a ring of twenty-six means multiplying by an inverse.",
    correctExplanation: "This is an Affine cipher with a=5, b=8. Encoding maps each letter position x to (5x + 8) mod 26. To reverse it, multiply by the modular inverse of 5 (which is 21) after subtracting 8. The message decodes to 'trust no one here'.",
    incorrectExplanation: "This is an Affine cipher: each letter position x became (a*x + b) mod 26 with a=5 and b=8. Decrypt with x = ainv * (y - b) mod 26, where ainv is the modular inverse of 5 mod 26 (that is 21).",
  },
  {
    id: "cipher-wardens-columns",
    title: "The Warden's Columns",
    cipherType: "Columnar Transposition (key ZEBRA)",
    plain: "beware the ides of march",
    answer: "beware the ides of march",
    acceptedAnswers: ["beware the ides of march", "bewaretheidesofmarch"],
    xpReward: 150,
    enc: (p) => colEnc(p, "zebra").toUpperCase(),
    dec: (c) => colDec(clean(c), "zebra"),
    hint: "Write the message in rows beneath a five-letter keyword, then read the columns not left to right but in the alphabetical order of that word. The keyword is a striped beast of the plains.",
    correctExplanation: "This is a Columnar Transposition with the keyword ZEBRA. The plaintext is written in rows of five, then columns are read in the alphabetical order of the keyword letters (A, B, E, R, Z). Reversing that reordering recovers 'beware the ides of march'.",
    incorrectExplanation: "No letters were substituted. Write the ciphertext back into columns, ordering them by the alphabetical rank of the keyword ZEBRA (A=1, B=2, E=3, R=4, Z=5), then read across the rows.",
  },
  {
    id: "cipher-eye-of-horus",
    title: "The Eye of Horus",
    cipherType: "Vigenere",
    plain: "the eye sees all things",
    answer: "the eye sees all things",
    acceptedAnswers: ["the eye sees all things"],
    xpReward: 150,
    enc: (p) => vigEnc(p, "horus").toUpperCase(),
    dec: (c) => vigDec(clean(c), "horus"),
    hint: "A repeating watchword drives this drift of many alphabets. The falcon-headed sky god whose wounded eye became a symbol of protection lends his five letters as the key.",
    correctExplanation: "The keyword is HORUS (5 letters). Aligning it repeatedly under the ciphertext and shifting each letter backward by the keyword letter's position decodes the message to 'the eye sees all things'.",
    incorrectExplanation: "This is a Vigenere cipher. The five-letter keyword is the falcon-headed Egyptian god HORUS. Repeat it under the ciphertext and shift each letter backward by the keyword letter's alphabet position.",
  },
  {
    id: "cipher-mirror-vault",
    title: "The Mirror Vault",
    cipherType: "Base64 + Atbash",
    plain: "knowledge is power",
    answer: "knowledge is power",
    acceptedAnswers: ["knowledge is power"],
    xpReward: 150,
    enc: (p) => toBase64(atbash(p)),
    dec: (c) => atbash(fromBase64(c)),
    hint: "The outer shell is the six-bit armour machines wear to carry bytes intact. Peel it, and behind lies the ancient looking-glass alphabet that folds A onto Z.",
    correctExplanation: "Layer one is Base64. Decoding it yields text still under Atbash (A to Z, B to Y ...). Mirroring the alphabet reveals 'knowledge is power'.",
    incorrectExplanation: "Decode the Base64 first. The result is still enciphered with Atbash, the alphabet reversed onto itself. Mirror each letter to finish.",
  },
  {
    id: "cipher-silent-dispatch",
    title: "The Silent Dispatch",
    cipherType: "Morse Code (reversed words)",
    plain: "retreat before dawn breaks",
    answer: "retreat before dawn breaks",
    acceptedAnswers: ["retreat before dawn breaks"],
    xpReward: 160,
    enc: (p) => toMorse(p.split(" ").reverse().join(" ")),
    dec: (c) => fromMorse(c).split(" ").reverse().join(" "),
    hint: "First the wire speaks in brief and sustained pulses; but a cunning sender also marched the words out backwards. Decode the dots and dashes, then read the words in reverse to set them right.",
    correctExplanation: "Decode the Morse (' / ' separates words) to get the words, then reverse their order: the message becomes 'retreat before dawn breaks'.",
    incorrectExplanation: "Two steps: decode the Morse first (single space between letters, ' / ' between words), then reverse the order of the recovered words to restore the true message.",
  },
  {
    id: "cipher-astronomers-riddle",
    title: "The Astronomer's Riddle",
    cipherType: "Hexadecimal + Riddle",
    plain: "i have cities but no houses forests but no trees",
    answer: "a map",
    acceptedAnswers: ["a map", "map"],
    xpReward: 150,
    enc: (p) => toHex(p),
    dec: (c) => fromHex(c),
    hint: "Read the base-sixteen couplets as the character code every screen obeys. The sentence you recover is a riddle, and only its answer will open the way.",
    correctExplanation: "Each hex pair is an ASCII code (20 is a space). Decoded it reads 'i have cities but no houses forests but no trees'. The answer to that riddle is a map.",
    incorrectExplanation: "Convert each two-digit hexadecimal number to its ASCII character (20 is a space). That reveals a riddle. The final answer is the riddle's solution, a map, not the decoded sentence.",
  },
  {
    id: "cipher-sentinels-word",
    title: "The Sentinel's Word",
    cipherType: "Vigenere",
    plain: "the vault opens at noon",
    answer: "the vault opens at noon",
    acceptedAnswers: ["the vault opens at noon"],
    xpReward: 150,
    enc: (p) => vigEnc(p, "shadow").toUpperCase(),
    dec: (c) => vigDec(clean(c), "shadow"),
    hint: "A repeating watchword steers this many-alphabet drift. The key is the very thing a sentinel keeps to at dusk and the name this whole game wears: what a wall casts when the light is behind it.",
    correctExplanation: "The keyword is SHADOW (6 letters). Aligning it repeatedly under the ciphertext and shifting each letter backward by the keyword letter's position decodes to 'the vault opens at noon'.",
    incorrectExplanation: "This is a Vigenere cipher with the six-letter keyword SHADOW. Repeat it beneath the ciphertext and shift each letter backward by the keyword letter's alphabet position (A=0 ... Z=25).",
  },
  {
    id: "cipher-machines-whisper",
    title: "The Machine's Whisper",
    cipherType: "Binary",
    plain: "trust the code",
    answer: "trust the code",
    acceptedAnswers: ["trust the code"],
    xpReward: 130,
    enc: (p) => toBinary(p),
    dec: (c) => fromBinary(c),
    hint: "The machine speaks only in nought and one. Gather its glyphs into groups of eight and read each octet as the character it names.",
    correctExplanation: "Each group of 8 bits is one ASCII character. Converting every octet to its character spells 'trust the code' (the space is the byte 00100000).",
    incorrectExplanation: "Split the digits into groups of 8. Read each group as a binary number, then map that number to its ASCII character. The group 00100000 is a space.",
  },
  {
    id: "cipher-gardeners-riddle",
    title: "The Gardener's Riddle",
    cipherType: "A1Z26 + Riddle",
    plain: "what has roots nobody sees and is taller than trees",
    answer: "a mountain",
    acceptedAnswers: ["a mountain", "mountain"],
    xpReward: 150,
    enc: (p) => toA1Z26(p),
    dec: (c) => fromA1Z26(c),
    hint: "Every integer is only its letter's rank in the alphabet; the twin gaps sever the words. What surfaces is an old riddle, and its answer is what you must name.",
    correctExplanation: "Map each number to a letter (double spaces mark word breaks): the message decodes to 'what has roots nobody sees and is taller than trees'. The answer to that old riddle is a mountain.",
    incorrectExplanation: "Convert the numbers to letters (1=A ... 26=Z, double spaces mark word breaks). That reveals a riddle. The final answer is the riddle's solution, a mountain, not the decoded line.",
  },
  {
    id: "cipher-twin-seal",
    title: "The Twin Seal",
    cipherType: "Caesar + Atbash",
    plain: "the serpent sleeps",
    answer: "the serpent sleeps",
    acceptedAnswers: ["the serpent sleeps"],
    xpReward: 160,
    enc: (p) => atbash(caesarEnc(p, 3)),
    dec: (c) => caesarDec(atbash(c), 3),
    hint: "Two seals guard this door. The message was first slid three places along the alphabet, then reflected across its mirror. Undo the mirror first, for it is its own inverse, then slide three places back.",
    correctExplanation: "Two layers: a Caesar shift of +3 followed by Atbash. Atbash is its own inverse, so mirror the alphabet first, then shift each letter back by 3 to recover 'the serpent sleeps'.",
    incorrectExplanation: "This has two stages. Apply Atbash first (the alphabet mirrored onto itself), then undo a Caesar shift of 3 by moving each letter back three places. Order matters: mirror, then shift.",
  },
];

// ---- verify + emit --------------------------------------------------------

const norm = (s) => s.replace(/\s+/g, "");
let ok = true;
const ids = new Set();

for (const c of ciphers) {
  if (ids.has(c.id)) { console.log(`DUPLICATE id: ${c.id}`); ok = false; }
  ids.add(c.id);
  const encoded = c.enc(clean(c.plain));
  const decoded = c.dec(encoded);
  const pass = norm(decoded) === norm(clean(c.plain));
  if (!pass) ok = false;
  c._encoded = encoded; // stash for emit
  console.log("-".repeat(70));
  console.log(`id:      ${c.id}`);
  console.log(`title:   ${c.title}`);
  console.log(`type:    ${c.cipherType}`);
  console.log(`answer:  ${c.answer}`);
  console.log(`encoded: ${encoded}`);
  console.log(`decoded: ${decoded}  ${pass ? "ROUND-TRIP OK" : "MISMATCH"}`);
}
console.log("-".repeat(70));
console.log(ok ? `ALL ${ciphers.length} CIPHERS VERIFIED` : "SOME CIPHERS FAILED");

if (!ok) process.exit(1);

// Build the typed seed array (SeedPuzzleInput + stable id).
const seeds = ciphers.map((c) => ({
  id: c.id,
  type: "cipher",
  category: "puzzles",
  difficulty: "hard",
  title: c.title,
  question: "",
  correctAnswer: c.answer,
  acceptedAnswers: c.acceptedAnswers,
  xpReward: c.xpReward,
  cipherData: {
    encodedMessage: c._encoded,
    cipherType: c.cipherType,
    hint: c.hint,
  },
  correctExplanation: c.correctExplanation,
  incorrectExplanation: c.incorrectExplanation,
}));

const header = `// AUTO-GENERATED by scripts/seed-data/gen-ciphers.mjs. DO NOT EDIT BY HAND.
//
// Every encodedMessage below was encoded and round-trip decoded back to its
// plaintext at generation time, so no ciphertext here can be wrong. To change
// cipher content, edit gen-ciphers.mjs and re-run it.
//
// Consumed by the Studio "Load Ciphers" tool (app/studio/ciphers/page.tsx),
// which upserts each entry into Firestore by its stable \`id\` (additive: it
// never wipes the puzzle bank).

import type { SeedPuzzleInput } from "./importer";

export interface CipherSeedInput extends SeedPuzzleInput {
  id: string;
}

export const cipherSeeds: CipherSeedInput[] = ${JSON.stringify(seeds, null, 2)};

export default cipherSeeds;
`;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "ciphers.generated.ts");
writeFileSync(outPath, header, "utf8");
console.log(`\nWrote ${seeds.length} ciphers to ${outPath}`);
