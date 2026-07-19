// One-off generator for the weekly-cipher seed set.
//
// Every cipher is HARD. Each entry declares its plaintext + method params;
// this script ENCODES it, then DECODES the result back and asserts it matches,
// so no wrong ciphertext can reach data.ts. Run:  node scripts/seed-data/gen-ciphers.mjs
// Copy the printed `encodedMessage` values into scripts/seed-data/data.ts.

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

function egcd(a, b) { return b ? egcd(b, a % b) : a; }
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
// decoded plain IS the riddle; `answer` is the riddle's solution.

const ciphers = [
  {
    title: "Keyword of the Gods",
    type: "Vigenère",
    plain: "only the worthy may pass",
    answer: "only the worthy may pass",
    enc: (p) => vigEnc(p, "osiris").toUpperCase(),
    dec: (c) => vigDec(clean(c), "osiris"),
  },
  {
    title: "Two Locks, One Door",
    type: "Base64 + Caesar",
    plain: "follow the north star",
    answer: "follow the north star",
    enc: (p) => toBase64(caesarEnc(p, 7)),
    dec: (c) => caesarDec(fromBase64(c), 7),
  },
  {
    title: "Ones and Zeroes",
    type: "Binary + Atbash",
    plain: "the phoenix rises at dusk",
    answer: "the phoenix rises at dusk",
    enc: (p) => toBinary(atbash(p)),
    dec: (c) => atbash(fromBinary(c)),
  },
  {
    title: "The Chamber Grid",
    type: "Polybius Square",
    plain: "secrets keep",
    answer: "secrets keep",
    enc: (p) => toPolybius(p),
    dec: (c) => fromPolybius(c),
  },
  {
    title: "The Cartographer's Cipher",
    type: "Hexadecimal + Riddle",
    plain: "the more you take the more you leave behind",
    answer: "footsteps",
    enc: (p) => toHex(p),
    dec: (c) => fromHex(c),
  },
  {
    title: "The Locksmith's Riddle",
    type: "A1Z26 + Riddle",
    plain: "what has keys but opens no locks",
    answer: "a piano",
    enc: (p) => toA1Z26(p),
    dec: (c) => fromA1Z26(c),
  },
  {
    title: "The Serpent Fence",
    type: "Rail Fence (4 rails)",
    plain: "the walls have ears",
    answer: "the walls have ears",
    enc: (p) => railEnc(p, 4),
    dec: (c) => railDec(c, 4),
  },
  {
    title: "The Ledger of Bacon",
    type: "Baconian",
    plain: "hidden in plain sight",
    answer: "hidden in plain sight",
    enc: (p) => toBacon(p),
    dec: (c) => fromBacon(c),
  },
  {
    title: "The Apothecary's Formula",
    type: "Affine (a=5, b=8)",
    plain: "trust no one here",
    answer: "trust no one here",
    enc: (p) => affineEnc(p, 5, 8).toUpperCase(),
    dec: (c) => affineDec(clean(c), 5, 8),
  },
  {
    // "bewaretheidesofmarch" = 20 letters, key ZEBRA = 5 cols → 4 full rows,
    // no padding, so the round-trip is exact.
    title: "The Warden's Columns",
    type: "Columnar Transposition (key ZEBRA)",
    plain: "beware the ides of march",
    answer: "beware the ides of march",
    enc: (p) => colEnc(p, "zebra").toUpperCase(),
    dec: (c) => colDec(clean(c), "zebra"),
  },
  {
    title: "The Eye of Horus",
    type: "Vigenère",
    plain: "the eye sees all things",
    answer: "the eye sees all things",
    enc: (p) => vigEnc(p, "horus").toUpperCase(),
    dec: (c) => vigDec(clean(c), "horus"),
  },
  {
    title: "The Mirror Vault",
    type: "Base64 + Atbash",
    plain: "knowledge is power",
    answer: "knowledge is power",
    enc: (p) => toBase64(atbash(p)),
    dec: (c) => atbash(fromBase64(c)),
  },
  {
    title: "The Silent Dispatch",
    type: "Morse (reversed words)",
    plain: "retreat before dawn breaks",
    answer: "retreat before dawn breaks",
    // words reversed in order, then Morse. Decode Morse, then reverse word order back.
    enc: (p) => toMorse(p.split(" ").reverse().join(" ")),
    dec: (c) => fromMorse(c).split(" ").reverse().join(" "),
  },
  {
    title: "The Astronomer's Riddle",
    type: "Hexadecimal + Riddle",
    plain: "i have cities but no houses forests but no trees",
    answer: "a map",
    enc: (p) => toHex(p),
    dec: (c) => fromHex(c),
  },
];

let ok = true;
for (const c of ciphers) {
  const encoded = c.enc(clean(c.plain));
  const decoded = c.dec(encoded);
  // Some ciphers (rail/polybius/bacon/columnar) drop spaces; compare letters only.
  const norm = (s) => s.replace(/\s+/g, "");
  const pass = norm(decoded) === norm(clean(c.plain));
  if (!pass) ok = false;
  console.log("─".repeat(70));
  console.log(`title:   ${c.title}`);
  console.log(`type:    ${c.type}`);
  console.log(`answer:  ${c.answer}`);
  console.log(`encoded: ${encoded}`);
  console.log(`decoded: ${decoded}  ${pass ? "✓ ROUND-TRIP OK" : "✗ MISMATCH"}`);
}
console.log("─".repeat(70));
console.log(ok ? "ALL CIPHERS VERIFIED ✓" : "SOME CIPHERS FAILED ✗");
process.exit(ok ? 0 : 1);
