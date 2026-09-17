// Forge batch pre-screener: registry title/answer collisions + choice sanity.
// Usage: node scripts/seed-data/ai-batch/prescreen.mjs <batchId> <category> <type>
// Compares against output/.registry.json, ignoring same-batch owners.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const norm = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const hash = (s) => {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) >>> 0;
  return x.toString(16);
};
const isNumeric = (s) => /^\d+(\.\d+)?$/.test(s);

const [batchId, category, type] = process.argv.slice(2);
const outDir = join(dirname(fileURLToPath(import.meta.url)), "output");
const reg = JSON.parse(readFileSync(join(outDir, ".registry.json"), "utf8"));
const b = JSON.parse(readFileSync(join(outDir, batchId + ".json"), "utf8"));

let bad = 0;
const pos = { 1: 0, 2: 0, 3: 0, 4: 0 };
let tCount = 0,
  fCount = 0;
b.forEach((q, i) => {
  const n = i + 1;
  const probs = [];
  const owners = reg.t[hash(norm(q.title))] ?? [];
  if (owners.length && !owners.every((o) => o.startsWith(batchId + "#")))
    probs.push("TITLE-DUP:" + owners.join(","));
  if (q.question) {
    const qowners = reg.q[hash(norm(q.question))] ?? [];
    if (qowners.length && !qowners.every((o) => o.startsWith(batchId + "#")))
      probs.push("Q-DUP:" + qowners.join(","));
  }
  if (type !== "true-false" && q.correctAnswer.length > 0 && !isNumeric(norm(q.correctAnswer))) {
    const ak = category + "|" + hash(norm(q.correctAnswer));
    const aowners = reg.a[ak] ?? [];
    if (aowners.length && !aowners.every((o) => o.startsWith(batchId + "#")))
      probs.push("ANS-DUP:" + aowners.join(","));
  }
  if (type === "multiple-choice") {
    const ci = q.choices.findIndex((c) => c === q.correctAnswer);
    if (ci >= 0) pos[ci + 1]++;
    else probs.push("ANSWER-NOT-IN-CHOICES");
  }
  if (type === "true-false") {
    if (q.correctAnswer === "True") tCount++;
    else fCount++;
    if (JSON.stringify(q.choices) !== '["True","False"]') probs.push("CHOICES");
  }
  if (type === "type-answer" || type === "riddle") {
    const seen = new Set();
    (q.acceptedAnswers ?? []).forEach((a) => {
      const k = norm(a);
      if (seen.has(k)) probs.push("ACC-DUP:" + a);
      seen.add(k);
    });
    if (!(q.acceptedAnswers ?? []).some((a) => norm(a) === norm(q.correctAnswer)))
      probs.push("ACC-MISSING-CANONICAL");
  }
  if (probs.length) {
    bad++;
    console.log("#" + n, q.title, "||", probs.join(" ; "));
  }
});
console.log("items:", b.length, "flagged:", bad);
if (type === "multiple-choice") console.log("positions:", JSON.stringify(pos));
if (type === "true-false") console.log("True:", tCount, "False:", fCount);
