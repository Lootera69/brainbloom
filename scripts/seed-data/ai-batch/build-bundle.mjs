// Forge bundle builder: validated forge items + verbatim legacy keepers
// → public/seed/forge-bundle.json (+ forge-manifest.json).
// Usage: node scripts/seed-data/ai-batch/build-bundle.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const batchDir = path.join(root, 'scripts', 'seed-data', 'ai-batch');
const validatedDir = path.join(batchDir, 'output', 'validated');
const dataTsPath = path.join(root, 'scripts', 'seed-data', 'data.ts');
const outDir = path.join(root, 'public', 'seed');

const KEEPER_TITLES = ['Truth Tellers', 'The Missing Dollar'];

// Must mirror lib/forge/curriculum.ts order (index+1 = group order).
const CURRICULUM = {
  logic: ['Think Straight', 'Spot the Pattern', 'Solve It', 'Master Mind', 'Fallacy Field Guide', 'Paradox Alley', 'Mind the Odds', 'Decision Frames', 'Lateral Leaps', 'Argument Repair', 'Map & Territory'],
  science: ['Body & Biology', 'Physics Fun', 'Earth & Space', 'Crazy Chemistry', 'Science Mix', 'Quantum Café', 'Relativity Road', 'Mind Machinery', 'Deep Time', "Fermi's Notebook"],
  riddles: ['Classic Riddles', 'Funny Business', 'Tricky Words', 'Brain Busters', 'Paradox Riddles', 'Modern Twists'],
  puzzles: ['Number Crunch', 'Word Play', 'Think Different', 'Bonus Round', 'Scale Stories', 'Sequence Secrets'],
  wonders: ['Think Deeper', 'Mind Stretchers', 'Cosmic Wonders', 'Life Puzzles', 'Mind Mirrors', "Poet's Corner"],
};

const normApos = (s) => String(s).replace(/[‘’‚‛]/g, "'");

const groupOrder = {};
const canonicalGroup = {};
for (const [cat, names] of Object.entries(CURRICULUM)) {
  names.forEach((n, i) => { groupOrder[cat + '|' + n] = i + 1; canonicalGroup[cat + '|' + normApos(n)] = n; });
}

const lessonGroups = [];
for (const [cat, names] of Object.entries(CURRICULUM)) {
  names.forEach((n, i) => lessonGroups.push({ category: cat, name: n, order: i + 1 }));
}
// Home for the user's hand-made Story keepers (recreated manually post-seed).
lessonGroups.push({ category: 'logic', name: 'Story Mode', order: CURRICULUM.logic.length + 1 });

// ---- 1. Forge items -------------------------------------------------------
const files = fs.readdirSync(validatedDir).filter(f => /^batch-\d+\.validated\.json$/.test(f)).sort();
const puzzles = [];
const orderCounters = {};
for (const f of files) {
  if (f.startsWith('batch-000')) continue; // demo, fails by design
  const v = JSON.parse(fs.readFileSync(path.join(validatedDir, f), 'utf8'));
  for (const q of (v.items || [])) {
    // Canonicalize group spelling (curly apostrophes → straight) so seeded
    // questions land in the seeded groups instead of stranding.
    if (q.lessonGroup) q.lessonGroup = canonicalGroup[q.category + '|' + normApos(q.lessonGroup)] || q.lessonGroup;
    const key = q.category + '|' + q.lessonGroup;
    orderCounters[key] = (orderCounters[key] || 0) + 1;
    puzzles.push({
      type: q.type,
      category: q.category,
      difficulty: q.difficulty,
      title: q.title,
      question: q.question,
      choices: q.choices ?? [],
      correctAnswer: q.correctAnswer ?? '',
      ...(q.acceptedAnswers ? { acceptedAnswers: q.acceptedAnswers } : {}),
      xpReward: q.xpReward,
      ...(q.correctExplanation ? { correctExplanation: q.correctExplanation } : {}),
      ...(q.incorrectExplanation ? { incorrectExplanation: q.incorrectExplanation } : {}),
      ...(q.hintText ? { hintText: q.hintText } : {}),
      ...(q.lessonContent ? { lessonContent: q.lessonContent } : {}),
      lessonGroup: q.lessonGroup,
      lessonGroupOrder: groupOrder[key],
      lessonOrder: orderCounters[key],
    });
  }
}

// ---- 2. Verbatim legacy keepers -------------------------------------------
// Extracts the exact object literals from data.ts (brace-matched, strings
// respected) so bytes/wording stay identical to what's live today.
function extractEntry(src, title) {
  const ti = src.indexOf('title: "' + title + '"');
  if (ti < 0) throw new Error('keeper not found in data.ts: ' + title);
  const start = src.lastIndexOf('\n    {', ti) + 1;
  let depth = 0, i = start, quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  return new Function('return (' + src.slice(start, i + 1) + ')')();
}

const dataTs = fs.readFileSync(dataTsPath, 'utf8');
for (const t of KEEPER_TITLES) puzzles.push(extractEntry(dataTs, t));

// ---- 3. Self-validation ----------------------------------------------------
const errors = [];
const TYPES = ['multiple-choice', 'true-false', 'type-answer', 'riddle'];
const DIFFS = { easy: 10, medium: 25, hard: 50 };
const seen = new Set();
puzzles.forEach((p, i) => {
  const tag = '#' + i + ' ' + p.title;
  if (!TYPES.includes(p.type)) errors.push(tag + ': bad type ' + p.type);
  if (!DIFFS[p.difficulty]) errors.push(tag + ': bad difficulty ' + p.difficulty);
  else if (p.xpReward !== DIFFS[p.difficulty] && p.xpReward !== 0) {
    // Legacy keepers carry their live xp verbatim (even if off-contract).
    if (!KEEPER_TITLES.includes(p.title)) errors.push(tag + ': xp ' + p.xpReward + ' vs ' + p.difficulty);
    else console.log('keeper note: ' + tag + ' keeps live xpReward=' + p.xpReward);
  }
  if (!p.title || !p.question) errors.push(tag + ': missing title/question');
  if (p.type === 'multiple-choice' && (!Array.isArray(p.choices) || p.choices.length !== 4)) errors.push(tag + ': MCQ needs 4 choices');
  if (p.type === 'multiple-choice' && !p.choices.includes(p.correctAnswer)) errors.push(tag + ': answer not in choices');
  if (!groupOrder[p.category + '|' + p.lessonGroup]) errors.push(tag + ': unknown group ' + p.category + '/' + p.lessonGroup);
  const dk = p.category + '|' + p.title.toLowerCase();
  if (seen.has(dk)) errors.push(tag + ': duplicate title in category');
  seen.add(dk);
});
if (errors.length) {
  console.error('BUNDLE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}

// ---- 4. Write ---------------------------------------------------------------
fs.mkdirSync(outDir, { recursive: true });
const bundle = {
  version: 1,
  generatedAt: new Date().toISOString(),
  counts: { puzzles: puzzles.length, lessonGroups: lessonGroups.length },
  lessonGroups,
  puzzles,
};
fs.writeFileSync(path.join(outDir, 'forge-bundle.json'), JSON.stringify(bundle));
fs.writeFileSync(path.join(outDir, 'forge-manifest.json'), JSON.stringify({
  version: 1,
  generatedAt: bundle.generatedAt,
  counts: bundle.counts,
  categories: [...new Set(puzzles.map(p => p.category))],
}));
const kb = (fs.statSync(path.join(outDir, 'forge-bundle.json')).size / 1024).toFixed(0);
console.log('bundle OK: ' + puzzles.length + ' puzzles, ' + lessonGroups.length + ' groups, ' + kb + ' KB');
console.log('keepers: ' + KEEPER_TITLES.join(', '));
