// Print full JSON of items whose titles match given fragments.
import { readFileSync } from "node:fs";

const [file, ...frags] = process.argv.slice(2);
const arr = JSON.parse(readFileSync(file, "utf8"));
arr.forEach((q) => {
  if (frags.some((f) => q.title.includes(f))) console.log(JSON.stringify(q));
});
