// Scans a batch JSON file for keys missing their closing quote:
// finds `"key:"X` (letter directly after) which should be `"key":"X`.
// With --fix, applies the repair in place.
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
const fix = process.argv[3] === "--fix";
let content = readFileSync(file, "utf8");
const re = /"(title|question|choices|correctAnswer|correctExplanation|incorrectExplanation|lessonContent|lessonGroup|type|category|difficulty|xpReward|acceptedAnswers|hintText):"([A-Za-z])/g;
let m;
let count = 0;
while ((m = re.exec(content)) !== null) {
  count++;
  const start = Math.max(0, m.index - 50);
  console.log("pos " + m.index + ": ..." + content.slice(start, m.index + 80).replace(/\n/g, "\\n"));
}
console.log("suspects: " + count);
if (fix && count > 0) {
  content = content.replace(re, '"$1":"$2');
  writeFileSync(file, content);
  console.log("fixed " + count + " occurrence(s)");
}
try {
  const arr = JSON.parse(content);
  console.log("VALID JSON, items: " + arr.length);
} catch (e) {
  console.log("INVALID: " + e.message);
  const m2 = e.message.match(/position (\d+)/);
  if (m2) {
    const p = Number(m2[1]);
    console.log("context: ..." + content.slice(Math.max(0, p - 200), p + 200).replace(/\n/g, "\\n"));
  }
}
