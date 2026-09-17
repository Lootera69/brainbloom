// Forge spot-checker: print N random validated items across a batch range.
// Usage: node scripts/seed-data/ai-batch/spotcheck.mjs <first> <last> <count> [seed]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [first, last, count, seedArg] = process.argv.slice(2).map(Number);
let seed = seedArg || 20260915;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "output",
  "validated"
);
const pool = [];
for (let i = first; i <= last; i++) {
  const id = "batch-" + String(i).padStart(3, "0");
  const v = JSON.parse(readFileSync(join(outDir, id + ".validated.json"), "utf8"));
  v.items.forEach((item, idx) => pool.push({ id, idx, item }));
}
for (let k = 0; k < count && pool.length; k++) {
  const j = Math.floor(rand() * pool.length);
  const { id, idx, item } = pool.splice(j, 1)[0];
  console.log("=== " + id + "#" + idx + " [" + item.category + "/" + item.type + "/" + item.difficulty + "] " + item.title + " ===");
  console.log("Q: " + item.question);
  if ((item.choices ?? []).length) console.log("Choices: " + item.choices.join(" | "));
  console.log("A: " + item.correctAnswer);
  if (item.acceptedAnswers) console.log("Accepted: " + item.acceptedAnswers.join(", "));
  if (item.hintText) console.log("Hint: " + item.hintText.replaceAll("\n", " / "));
  console.log("Correct: " + item.correctExplanation);
  console.log("Incorrect: " + item.incorrectExplanation);
  console.log("Lesson: " + item.lessonContent.replaceAll("\n", " / "));
  console.log("Group: " + item.lessonGroup);
  console.log("");
}
