// Concat batch part-files into a target. Usage: concat.mjs <target> <source...>
import { readFileSync, writeFileSync } from "node:fs";

const [target, ...sources] = process.argv.slice(2);
let merged = [];
for (const s of sources) {
  const arr = JSON.parse(readFileSync(s, "utf8"));
  console.log(s + ": " + arr.length);
  merged = merged.concat(arr);
}
console.log("merged: " + merged.length);
writeFileSync(target, JSON.stringify(merged));
