import { z } from "zod";
import type { PuzzleFormData } from "@/types/puzzle";
import type { WorkshopImportMetadata, WorkshopSourceNotice } from "@/types/workshop";

const text = z.string().min(1).max(40000);
const crossword = z.object({
  size: z.number().int().min(5).max(15),
  grid: z.array(z.array(z.string().regex(/^[A-Z]$/).nullable())),
  clues: z.array(z.object({
    number: z.number().int().positive(), clue: text,
    answer: z.string().regex(/^[A-Z]+$/),
    startRow: z.number().int().nonnegative(), startCol: z.number().int().nonnegative(),
    direction: z.enum(["across", "down"]),
  })).min(1),
}).superRefine((data, ctx) => {
  if (data.grid.length !== data.size || data.grid.some(row => row.length !== data.size)) {
    ctx.addIssue({ code: "custom", message: "Crossword dimensions do not match the board." });
    return;
  }
  const covered = new Set<string>();
  for (const clue of data.clues) {
    [...clue.answer].forEach((letter, offset) => {
      const row = clue.startRow + (clue.direction === "down" ? offset : 0);
      const col = clue.startCol + (clue.direction === "across" ? offset : 0);
      if (data.grid[row]?.[col] !== letter) ctx.addIssue({ code: "custom", message: "A crossword entry does not match its cells." });
      covered.add(`${row},${col}`);
    });
  }
  data.grid.forEach((row, r) => row.forEach((letter, c) => {
    if (letter !== null && !covered.has(`${r},${c}`)) ctx.addIssue({ code: "custom", message: "A letter has no crossword clue." });
  }));
});

const itemSchema = z.object({
  type: z.enum(["multiple-choice", "true-false", "type-answer", "riddle", "crossword", "wonder"]),
  category: z.enum(["logic", "riddles", "science", "puzzles", "wonders"]),
  difficulty: z.enum(["easy", "medium", "hard"]), title: text, question: text,
  choices: z.array(text), correctAnswer: text, acceptedAnswers: z.array(text).optional(),
  correctExplanation: text, incorrectExplanation: text, lessonContent: text, lessonGroup: text,
  xpReward: z.number().int(), hintText: text.optional(), sharePrompt: text.optional(),
  crosswordData: crossword.optional(),
}).strict().superRefine((item, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  const reward = item.type === "wonder" ? 0 : { easy: 10, medium: 25, hard: 50 }[item.difficulty];
  if (item.xpReward !== reward) fail("The reward does not match the puzzle format and level.");
  if (["multiple-choice", "true-false"].includes(item.type)) {
    if (!item.choices.includes(item.correctAnswer)) fail("The answer is missing from the choices.");
    if (item.choices.length !== (item.type === "true-false" ? 2 : 4) || new Set(item.choices).size !== item.choices.length) fail("Answer choices must be distinct and complete.");
    if (item.type === "true-false" && item.choices.join("|") !== "True|False") fail("True/False choices are invalid.");
  } else if (item.choices.length) fail("This format does not use answer choices.");
  if (["type-answer", "riddle"].includes(item.type) && !item.acceptedAnswers?.includes(item.correctAnswer)) fail("Typed answers must include the canonical answer.");
  if (item.type === "riddle" && !item.hintText) fail("The riddle needs hints.");
  if (item.type === "crossword" && !item.crosswordData) fail("The crossword board is missing.");
  if (item.type === "wonder" && !item.sharePrompt) fail("The Wonder reflection prompt is missing.");
});

export type WorkshopDraft = { item: PuzzleFormData; hash: string; method: string; scope: string; metadata: WorkshopImportMetadata };

const sourceSchema = z.object({
  name: text, sha256: z.string().regex(/^[a-f0-9]{64}$/), license: text,
  attribution: text.optional(), version: text.optional(), url: text.optional(),
  license_url: text.optional(), transformations: text.optional(),
});

function sourceNotices(dictionary: unknown): WorkshopSourceNotice[] {
  if (dictionary === undefined) return [];
  const context = z.object({ source: sourceSchema, sources: z.array(sourceSchema).min(1).max(6).optional() }).parse(dictionary);
  return (context.sources ?? [context.source]).map(source => ({
    name: source.name, sha256: source.sha256, license: source.license,
    ...(source.attribution ? { attribution: source.attribution } : {}),
    ...(source.version ? { version: source.version } : {}),
    ...(source.url ? { url: source.url } : {}),
    ...(source.license_url ? { licenseUrl: source.license_url } : {}),
    ...(source.transformations ? { transformations: source.transformations } : {}),
  }));
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(k => `${JSON.stringify(k)}:${canonical(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function parseWorkshopBundle(raw: unknown): Promise<WorkshopDraft[]> {
  const replayBundleJson = JSON.stringify(raw);
  if (!replayBundleJson || new TextEncoder().encode(replayBundleJson).length > 4_000_000) throw new Error("Choose a workshop export smaller than 4 MB.");
  const envelope = z.object({
    version: z.number().int().min(1).max(8), generator: text,
    intendedImport: z.object({ published: z.literal(false), reviewStatus: z.literal("draft"), createdBy: z.literal("symbolic-generator") }).strict(),
    items: z.array(z.unknown()).min(1).max(20),
    proofs: z.array(z.object({ item_sha256: z.string().regex(/^[a-f0-9]{64}$/), method: text, scope: text })),
    dictionary: z.unknown().optional(), request: z.record(z.string(), z.unknown()).optional(),
  }).parse(raw);
  const generators = ["", "brainbloom-symbolic-v1", "brainbloom-symbolic-v2", "brainbloom-dictionary-v3", "brainbloom-reasoning-v4", "brainbloom-topics-v5", "brainbloom-logic-grid-v6", "brainbloom-autopilot-v7", "brainbloom-activities-v8"];
  if (envelope.generator !== generators[envelope.version]) throw new Error("Unrecognised workshop version.");
  if (envelope.items.length !== envelope.proofs.length) throw new Error("Draft and proof counts differ.");
  const sources = sourceNotices(envelope.dictionary);
  const bundleBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(raw)));
  const bundleSha256 = [...new Uint8Array(bundleBytes)].map(b => b.toString(16).padStart(2, "0")).join("");
  const seen = new Set<string>();
  return Promise.all(envelope.items.map(async (rawItem, i) => {
    const item = itemSchema.parse(rawItem);
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(rawItem)));
    const hash = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== envelope.proofs[i].item_sha256) throw new Error(`Draft ${i + 1} has changed since its engine check.`);
    if (seen.has(hash)) throw new Error("The bundle contains a duplicate draft.");
    seen.add(hash);
    const { method, scope } = envelope.proofs[i];
    const metadata: WorkshopImportMetadata = {
      version: envelope.version, generator: envelope.generator, itemIndex: i,
      itemSha256: hash, bundleSha256, method, scope, sources, replayBundleJson,
      replayContextAvailable: !!envelope.request && ([1, 2, 6].includes(envelope.version) || !!envelope.dictionary),
    };
    return { item: { ...item, reviewStatus: "draft", workshopImport: metadata }, hash, method, scope, metadata };
  }));
}
