// Print index + title + correct-answer position (1-based) for MCQ batch.
import { readFileSync } from "node:fs";

const file = process.argv[2];
const arr = JSON.parse(readFileSync(file, "utf8"));
arr.forEach((q, i) => {
  console.log("#" + (i + 1) + " pos" + (q.choices.findIndex((c) => c === q.correctAnswer) + 1) + " " + q.title);
});
