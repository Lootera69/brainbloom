// Print JSON-escaped slice of file around a marker. Usage: bytesaround.mjs <file> <marker>
import { readFileSync } from "node:fs";

const [file, marker] = process.argv.slice(2);
const content = readFileSync(file, "utf8");
const i = content.indexOf(marker);
if (i < 0) {
  console.log("MARKER NOT FOUND: " + marker);
} else {
  console.log(JSON.stringify(content.slice(Math.max(0, i - 120), i + 220)));
}
