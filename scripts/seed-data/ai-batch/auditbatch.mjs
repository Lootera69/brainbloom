// Audit: print title, question head, lesson line count + last line, explanation sentence counts.
import { readFileSync } from "node:fs";

const file = process.argv[2];
const arr = JSON.parse(readFileSync(file, "utf8"));
const sents = (s) => s.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean).length;
arr.forEach((q, i) => {
  const lines = q.lessonContent.split("\n").map((l) => l.trim()).filter(Boolean);
  console.log(
    "#" + (i + 1) + " " + q.title + " | Q:" + q.question.slice(0, 60) +
    " | L:" + lines.length + " last=" + JSON.stringify(lines[lines.length - 1].slice(0, 60)) +
    " | cExp:" + sents(q.correctExplanation) + " iExp:" + sents(q.incorrectExplanation)
  );
});
