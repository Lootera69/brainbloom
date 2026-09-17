// Print last N chars of a file. Usage: tailchars.mjs <file> [n]
import { readFileSync } from "node:fs";

const [file, nArg] = process.argv.slice(2);
const content = readFileSync(file, "utf8");
console.log(JSON.stringify(content.slice(-(Number(nArg) || 300))));
