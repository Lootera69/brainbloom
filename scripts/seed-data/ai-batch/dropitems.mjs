// Drops batch items by exact title match. Usage: dropitems.mjs <file> <title...>
import { readFileSync, writeFileSync } from "node:fs";

const [file, ...titles] = process.argv.slice(2);
const arr = JSON.parse(readFileSync(file, "utf8"));
const kept = arr.filter((q) => !titles.includes(q.title));
console.log("before: " + arr.length + " after: " + kept.length);
console.log("kept titles: " + kept.map((q) => q.title).join(" | "));
writeFileSync(file, JSON.stringify(kept));
