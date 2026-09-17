#!/usr/bin/env node
/**
 * BrainBloom Forge — batch verifier CLI.
 *
 * Usage:
 *   node scripts/seed-data/ai-batch/verify-batch.mjs output/batch-001.json
 *   node scripts/seed-data/ai-batch/verify-batch.mjs --all
 *   npm run forge:verify -- output/batch-001.json
 *
 * For each input file (a raw JSON array as produced by the AI per
 * MASTER_PROMPT.md) this will:
 *   1. verify every item with lib/forge/verify.ts (strict mode),
 *   2. write a human-readable report to output/reports/<id>.report.md,
 *   3. write passing items (only) to output/validated/<id>.validated.json,
 *   4. update output/.registry.json so future batches are checked for
 *      cross-batch duplicates (re-running the same batch replaces its own
 *      registry entries — editing and re-verifying a batch is safe).
 *
 * Exit codes: 0 = verified (even with rejects — they are data), 2 = usage /
 * file / parse errors.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyBatch, rejectRateCrossedLine } from "../../../lib/forge/verify.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "output");
const reportsDir = join(outDir, "reports");
const validatedDir = join(outDir, "validated");
const registryPath = join(outDir, ".registry.json");

function die(message) {
  console.error(`forge: ${message}`);
  process.exit(2);
}

function loadRegistry() {
  if (!existsSync(registryPath)) return { q: {}, a: {}, t: {} };
  try {
    return JSON.parse(readFileSync(registryPath, "utf8"));
  } catch (e) {
    die(`registry is corrupt (${registryPath}): ${e.message}`);
  }
}

function saveRegistry(registry) {
  writeFileSync(registryPath, JSON.stringify(registry), "utf8");
}

function resolveBatchPaths(args) {
  if (args.includes("--all")) {
    if (!existsSync(outDir)) return [];
    return readdirSync(outDir)
      .filter((f) => f.endsWith(".json") && f.startsWith("batch-"))
      .map((f) => join(outDir, f))
      .sort();
  }
  const resolved = [];
  for (const arg of args.filter((a) => !a.startsWith("--"))) {
    // Relative paths resolve against the cwd first, then against the
    // pipeline's own output/ dir, so the CLI works from the repo root and
    // from the ai-batch folder alike.
    const local = arg.replace(/^(output[\\/])/, "");
    const candidates = [resolve(arg), join(outDir, local)];
    const found = candidates.find((c) => existsSync(c));
    if (found === undefined) die(`file not found: ${arg} (tried ${candidates.join(", ")})`);
    resolved.push(found);
  }
  return resolved;
}

function loadItems(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    die(`${basename(path)} is not valid JSON: ${e.message}`);
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  die(`${basename(path)} must be a JSON array of question objects`);
}

function renderReport(report) {
  const lines = [];
  const pct = report.total > 0 ? Math.round((report.failedCount / report.total) * 100) : 0;
  lines.push(`# Forge report — ${report.batchId}`);
  lines.push("");
  lines.push(`- Mode: ${report.mode}`);
  lines.push(`- Items: ${report.total} → **${report.passedCount} passed**, **${report.failedCount} failed** (${pct}% reject rate${rejectRateCrossedLine(report) ? " — ⚠️ ABOVE THE 20% STOP LINE" : ""})`);
  if (Object.keys(report.positionDistribution).length > 0) {
    const dist = Object.entries(report.positionDistribution)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([pos, n]) => `${pos}: ${n}`)
      .join("   ");
    lines.push(`- MCQ correct-position distribution → ${dist}`);
  }
  if (Object.keys(report.rejectHistogram).length > 0) {
    const hist = Object.entries(report.rejectHistogram)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, n]) => `${rule} ×${n}`)
      .join(", ");
    lines.push(`- Reject reasons: ${hist}`);
  }
  lines.push("");

  const failed = report.items.filter((i) => i.rejects.length > 0);
  if (failed.length > 0) {
    lines.push("## Rejected");
    lines.push("");
    for (const item of failed) {
      lines.push(`### #${item.index + 1} ${item.title || "(no title)"} — REJECTED`);
      for (const issue of item.rejects) lines.push(`- [${issue.rule}] ${issue.message}`);
      for (const issue of item.warns) lines.push(`- (${issue.rule}) ${issue.message}`);
      lines.push("");
    }
  }

  const warned = report.items.filter((i) => i.passed && i.warns.length > 0);
  if (warned.length > 0) {
    lines.push("## Passed with warnings");
    lines.push("");
    for (const item of warned) {
      lines.push(`### #${item.index + 1} ${item.title} — score ${item.score}`);
      for (const issue of item.warns) lines.push(`- (${issue.rule}) ${issue.message}`);
      lines.push("");
    }
  }

  const clean = report.items.filter((i) => i.passed && i.warns.length === 0);
  if (clean.length > 0) {
    lines.push(`## Clean passes (${clean.length})`);
    lines.push("");
    for (const item of clean) lines.push(`- #${item.index + 1} ${item.title} — score 100`);
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("usage: node verify-batch.mjs <output/batch-NNN.json | --all>");
    process.exit(2);
  }

  const paths = resolveBatchPaths(args);
  if (paths.length === 0) {
    console.log("forge: no batch files found in output/ yet — see README.md");
    return;
  }

  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(validatedDir, { recursive: true });
  let registry = loadRegistry();

  let totalPassed = 0;
  let totalFailed = 0;
  for (const path of paths) {
    const id = basename(path).replace(/\.json$/, "");
    const items = loadItems(path);
    const report = verifyBatch(items, { batchId: id, registry });
    registry = report.registry;
    saveRegistry(registry);

    writeFileSync(join(reportsDir, `${id}.report.md`), renderReport(report), "utf8");

    const passers = items
      .map((item, index) => ({ item, report: report.items[index] }))
      .filter((entry) => entry.report !== undefined && entry.report.passed)
      .map((entry) => ({
        ...entry.item,
        forgeId: entry.report.id,
        forgeScore: entry.report.score,
      }));
    writeFileSync(
      join(validatedDir, `${id}.validated.json`),
      JSON.stringify(
        {
          version: 1,
          batchId: id,
          generatedAt: new Date().toISOString(),
          source: "ai-batch",
          intendedImport: { createdBy: "ai-forge", reviewStatus: "draft", published: false },
          items: passers,
        },
        null,
        2,
      ),
      "utf8",
    );

    totalPassed += report.passedCount;
    totalFailed += report.failedCount;
    const flag = rejectRateCrossedLine(report) ? "  ⚠️ STOP LINE (>20% rejects) — adjust the slice/prompt before continuing" : "";
    console.log(
      `${id}: ${report.passedCount}/${report.total} passed, ${report.failedCount} rejected${flag}`,
    );
    for (const item of report.items) {
      if (item.rejects.length === 0) continue;
      const reasons = item.rejects.map((r) => r.rule).join(", ");
      console.log(`   ✗ #${item.index + 1} ${item.title || "(no title)"} → ${reasons}`);
    }
    console.log(`   report → ${join("output", "reports", `${id}.report.md`)}`);
    console.log(`   validated (${passers.length}) → ${join("output", "validated", `${id}.validated.json`)}`);
  }

  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} rejected across ${paths.length} batch(es).`);
}

main();
