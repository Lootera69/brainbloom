/**
 * BrainBloom Forge — deterministic question verifier.
 *
 * Grades every item of an AI-drafted batch (see
 * `scripts/seed-data/ai-batch/MASTER_PROMPT.md`) against the same quality bar a
 * human editor would apply. Pure functions, zero dependencies, no AI: the same
 * input always produces the same verdict. Designed so the Studio "Forge" UI can
 * later import it directly — every rule lives here, never in a component.
 *
 * Two severities:
 *  - `reject` — the item is broken or unfair (bad schema, answer not among the
 *    choices, a banned pattern, a duplicate). A single reject fails the item.
 *  - `warn`   — a quality signal (length outliers, lexical giveaways). Three or
 *    fewer warnings still pass; warnings feed the score used for ranking.
 *
 * `mode: "legacy"` relaxes contract rules the hand-written 2024 seed bank never
 * followed (xp mapping, hint shape, …) so the verifier can be retro-run over
 * existing puzzles as a calibration guard without false rejects.
 */

export type ForgeType = "multiple-choice" | "true-false" | "type-answer" | "riddle";
export type ForgeCategory = "logic" | "riddles" | "science" | "puzzles" | "wonders";
export type ForgeDifficulty = "easy" | "medium" | "hard";
export type Severity = "reject" | "warn";

export interface VerifyIssue {
  rule: string;
  severity: Severity;
  message: string;
}

export interface ItemReport {
  /** 0-based position inside the batch, as the model emitted it. */
  index: number;
  /** Stable id assigned by the pipeline: `<batchId>#<index>`. */
  id: string;
  title: string;
  type: string;
  passed: boolean;
  /** 100 − 8×warnings, 0 when rejected. Ranking aid, not a gate. */
  score: number;
  rejects: VerifyIssue[];
  warns: VerifyIssue[];
}

export interface ForgeRegistry {
  /** hash(normalized question) → owner ids ("batch-001#12"). */
  q: Record<string, string[]>;
  /** "category|hash(normalized answer)" → owner ids (non true-false only). */
  a: Record<string, string[]>;
  /** hash(normalized title) → owner ids. */
  t: Record<string, string[]>;
}

export interface BatchOptions {
  batchId?: string;
  registry?: ForgeRegistry;
  mode?: "strict" | "legacy";
}

export interface BatchReport {
  batchId: string;
  mode: "strict" | "legacy";
  total: number;
  passedCount: number;
  failedCount: number;
  items: ItemReport[];
  /** MCQ only: how many times each position (1-4) held the correct answer. */
  positionDistribution: Record<string, number>;
  /** Reject rule → occurrence count, for the report header. */
  rejectHistogram: Record<string, number>;
  /** Registry including this batch's items, ready to persist. */
  registry: ForgeRegistry;
}

import { isKnownLessonGroup } from "./curriculum.ts";

export const FORGE_TYPES: readonly ForgeType[] = [
  "multiple-choice",
  "true-false",
  "type-answer",
  "riddle",
] as const;

const CATEGORIES: readonly string[] = ["logic", "riddles", "science", "puzzles", "wonders"];
const DIFFICULTIES: readonly string[] = ["easy", "medium", "hard"];
const XP_BY_DIFFICULTY: Record<string, number> = { easy: 10, medium: 25, hard: 50 };

/** Fields every forge type requires. */
const COMMON_REQUIRED: readonly string[] = [
  "type",
  "category",
  "difficulty",
  "title",
  "question",
  "correctAnswer",
  "xpReward",
  "correctExplanation",
  "incorrectExplanation",
];

/** Fields allowed beyond the per-type required set. `lessonContent` is itself
 * mandated in strict mode — see the lesson block in `verifyItem` — but stays
 * here so it is a legal key for every forge type (and for legacy seeds).
 * `lessonGroup` places the question in the Learn-screen curriculum
 * (`curriculum.ts`) and is likewise required for strict batches. */
const OPTIONAL_FIELDS: readonly string[] = ["lessonContent", "lessonGroup"];

const SHAPE_WORDS: readonly string[] = [
  "triangle",
  "square",
  "circle",
  "rectangle",
  "pentagon",
  "hexagon",
  "oval",
  "rhombus",
];

// ─────────────────────────── text helpers ───────────────────────────

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alphanumeric word tokens. */
function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

function wordCount(value: string): number {
  return tokenize(value).length;
}

/** Rough sentence count: non-empty fragments split on . ! ? */
function sentenceCount(value: string): number {
  return value
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

/** Jaccard similarity of two word sets, 0…1. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

/** djb2 hash of a string, hex — registry keys stay small. */
function hashText(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─────────────────────────── the verifier ───────────────────────────

interface ItemContext {
  issues: VerifyIssue[];
  mode: "strict" | "legacy";
}

function reject(ctx: ItemContext, rule: string, message: string): void {
  if (ctx.mode === "legacy" && rule.startsWith("banned-")) {
    // Editorial bans target new AI content; legacy seeds get a soft flag so the
    // retro-run can surface the "rubbish list" without failing the guard.
    ctx.issues.push({ rule: "legacy-banned", severity: "warn", message: `${rule}: ${message}` });
    return;
  }
  if (ctx.mode === "legacy" && (rule === "title-spoils" || rule === "hint-reveals" || rule === "question-len")) {
    // Contract rules the hand-written bank never followed — calibration only.
    ctx.issues.push({ rule: `legacy-${rule}`, severity: "warn", message });
    return;
  }
  ctx.issues.push({ rule, severity: "reject", message });
}

function warn(ctx: ItemContext, rule: string, message: string): void {
  ctx.issues.push({ rule, severity: "warn", message });
}

function readString(item: Record<string, unknown>, key: string): string | null {
  const v = item[key];
  return typeof v === "string" ? v : null;
}

/**
 * Verifies one raw item. `seen` carries what earlier items in this batch
 * already used, `registryOwners` maps a registry hash to its previous owners.
 */
/** Purely numeric answers ("11", "3.14") — colliding does not imply same fact. */
function isNumericAnswer(normalized: string): boolean {
  return /^\d+(\.\d+)?$/.test(normalized);
}

function verifyItem(
  raw: unknown,
  index: number,
  batchId: string,
  options: Required<Pick<BatchOptions, "mode">> & {
    seen: {
      questions: Map<string, number>;
      questionSets: Array<{ words: Set<string>; index: number }>;
      answers: Map<string, number>;
      titles: Map<string, number>;
    };
    registry: ForgeRegistry;
  },
): ItemReport {
  const ctx: ItemContext = { issues: [], mode: options.mode };
  const id = `${batchId}#${index}`;
  const empty: ItemReport = {
    index,
    id,
    title: "",
    type: "",
    passed: false,
    score: 0,
    rejects: [],
    warns: [],
  };

  if (!isRecord(raw)) {
    reject(ctx, "schema", "Item is not a JSON object.");
    return finalize(empty, ctx);
  }
  const item = raw;

  // ── type enum (everything else depends on it) ──
  const type = readString(item, "type");
  if (type === null || !(FORGE_TYPES as readonly string[]).includes(type)) {
    reject(
      ctx,
      "bad-enum",
      `type must be one of ${FORGE_TYPES.join(" | ")} — got ${JSON.stringify(type)}.`,
    );
    return finalize({ ...empty, title: readString(item, "title") ?? "" }, ctx);
  }

  // ── unknown fields (AI contract; legacy seeds legally carry extra fields) ──
  const required = new Set<string>(COMMON_REQUIRED);
  if (type === "multiple-choice" || type === "true-false") required.add("choices");
  if (type === "type-answer" || type === "riddle") required.add("acceptedAnswers");
  if (type === "riddle") required.add("hintText");
  // The MASTER_PROMPT contract has type-answer/riddle carry an explicit empty
  // `choices` array — legal, just never non-empty (checked separately).
  const optional = new Set<string>(OPTIONAL_FIELDS);
  if (type === "type-answer" || type === "riddle") optional.add("choices");
  const allowed = new Set<string>([...required, ...optional]);
  if (options.mode === "strict") {
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) {
        reject(ctx, "unknown-field", `Field "${key}" is not part of the ${type} contract.`);
      }
    }
  }

  // ── missing / mistyped required fields ──
  for (const key of required) {
    const value = item[key];
    if (value === undefined || value === null) {
      const issue = `Required field "${key}" is missing.`;
      // Legacy seeds predate the explanation contract — flag, don't fail.
      if (options.mode === "legacy" && (key === "correctExplanation" || key === "incorrectExplanation")) {
        warn(ctx, "missing-field", issue);
      } else {
        reject(ctx, "missing-field", issue);
      }
      continue;
    }
    if (key === "xpReward") {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        reject(ctx, "wrong-type", "xpReward must be an integer number.");
      }
    } else if (key === "choices" || key === "acceptedAnswers") {
      if (!Array.isArray(value) || value.some((c) => typeof c !== "string")) {
        reject(ctx, "wrong-type", `"${key}" must be an array of strings.`);
      }
    } else if (typeof value !== "string") {
      reject(ctx, "wrong-type", `Field "${key}" must be a string.`);
    } else if (key !== "question" && key !== "hintText" && key !== "lessonContent" && value.trim().length === 0) {
      reject(ctx, "missing-field", `Field "${key}" is empty.`);
    }
  }

  const title = readString(item, "title") ?? "";
  const question = readString(item, "question") ?? "";
  const correctAnswer = readString(item, "correctAnswer") ?? "";
  const category = readString(item, "category") ?? "";
  const difficulty = readString(item, "difficulty") ?? "";
  const xpReward = typeof item.xpReward === "number" ? item.xpReward : NaN;
  const correctExplanation = readString(item, "correctExplanation") ?? "";
  const incorrectExplanation = readString(item, "incorrectExplanation") ?? "";

  // ── enums + xp contract ──
  if (!CATEGORIES.includes(category)) {
    reject(ctx, "bad-enum", `category must be one of ${CATEGORIES.join(" | ")} — got ${JSON.stringify(category)}.`);
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    reject(ctx, "bad-enum", `difficulty must be easy | medium | hard — got ${JSON.stringify(difficulty)}.`);
  }
  if (options.mode === "strict" && DIFFICULTIES.includes(difficulty) && xpReward !== XP_BY_DIFFICULTY[difficulty]) {
    reject(
      ctx,
      "xp-map",
      `xpReward must be ${XP_BY_DIFFICULTY[difficulty]} for ${difficulty} — got ${xpReward}.`,
    );
  }

  // ── choices ──
  const rawChoices = item.choices;
  const choices: string[] = Array.isArray(rawChoices)
    ? rawChoices.filter((c): c is string => typeof c === "string")
    : [];

  if (type === "multiple-choice" || type === "true-false") {
    if (type === "true-false") {
      if (choices.length !== 2 || choices[0] !== "True" || choices[1] !== "False") {
        reject(ctx, "choices-contract", `true-false choices must be exactly ["True","False"] — got ${JSON.stringify(choices)}.`);
      }
      if (correctAnswer !== "True" && correctAnswer !== "False") {
        reject(ctx, "answer-exact", `true-false correctAnswer must be "True" or "False" — got ${JSON.stringify(correctAnswer)}.`);
      }
    } else if (choices.length !== 4) {
      reject(ctx, "choices-contract", `multiple-choice needs exactly 4 choices — got ${choices.length}.`);
    }
    if (choices.length > 1) {
      const seenNormalized = new Map<string, number>();
      choices.forEach((c, i) => {
        const key = normalizeText(c);
        if (key.length > 0) {
          const first = seenNormalized.get(key);
          if (first !== undefined) {
            reject(ctx, "choices-distinct", `Choice ${i + 1} duplicates choice ${first + 1} ("${c}").`);
          } else {
            seenNormalized.set(key, i);
          }
        }
      });
    }
    if (!choices.includes(correctAnswer)) {
      const near = choices.find((c) => normalizeText(c) === normalizeText(correctAnswer));
      reject(
        ctx,
        "answer-exact",
        near
          ? `correctAnswer must match a choice character-for-character — "${correctAnswer}" differs only by case/spacing from "${near}".`
          : `correctAnswer "${correctAnswer}" does not exactly match any choice.`,
      );
    }
  } else {
    // type-answer / riddle: choices must be absent or empty. Legacy seeds
    // sometimes carry a stray (empty or ignored) choices array — tolerated.
    if (options.mode === "strict" && choices.length > 0) {
      reject(ctx, "choices-contract", `${type} must carry no choices (empty array) — got ${choices.length}.`);
    }
  }

  // ── acceptedAnswers (type-answer / riddle) ──
  if (type === "type-answer" || type === "riddle") {
    const acceptedRaw = item.acceptedAnswers;
    const accepted: string[] = Array.isArray(acceptedRaw)
      ? acceptedRaw.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      : [];
    const distinct = new Set(accepted.map(normalizeText));
    if (accepted.length < 3 || accepted.length > 6) {
      const issue = `acceptedAnswers needs 3–6 entries — got ${accepted.length}.`;
      if (options.mode === "legacy") warn(ctx, "accepted-count", issue);
      else reject(ctx, "accepted-count", issue);
    }
    if (distinct.size < 2) {
      const issue = "acceptedAnswers variants are all the same after normalization — add real typed variants (article, plural, spacing).";
      if (options.mode === "legacy") warn(ctx, "accepted-distinct", issue);
      else reject(ctx, "accepted-distinct", issue);
    }
    if (!accepted.includes(correctAnswer)) {
      warn(ctx, "accepted-canonical", "acceptedAnswers should include the canonical correctAnswer verbatim.");
    }
  }

  // ── riddle hint ──
  if (type === "riddle") {
    const hintText = readString(item, "hintText") ?? "";
    const lines = hintText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2 || lines.length > 3) {
      const issue = `riddle hintText needs 2–3 non-empty lines — got ${lines.length}.`;
      if (options.mode === "legacy") warn(ctx, "riddle-hint", issue);
      else reject(ctx, "riddle-hint", issue);
    }
    for (const line of lines) {
      if (line.length > 120) warn(ctx, "hint-line-len", `Hint line exceeds 120 characters (${line.length}).`);
    }
    if (correctAnswer.length > 0 && normalizeText(hintText).includes(normalizeText(correctAnswer))) {
      reject(ctx, "hint-reveals", "hintText contains the answer — hints must never reveal it outright.");
    }
  }

  // ── title ──
  const titleWords = wordCount(title);
  if (options.mode === "strict") {
    if (titleWords < 2 || titleWords > 6) {
      reject(ctx, "title-words", `title should be 2–4 words — got ${titleWords} ("${title}").`);
    } else if (titleWords >= 5) {
      warn(ctx, "title-words", `title is ${titleWords} words — the contract asks for 2–4.`);
    }
  }
  if (type !== "true-false" && correctAnswer.length > 0 && titleWords > 0) {
    // Word-boundary match, answers of 3+ normalized chars: a bare "O" would
    // false-positive inside "c-o-mplete".
    const normalizedAnswer = normalizeText(correctAnswer);
    if (
      normalizedAnswer.length >= 3 &&
      ` ${normalizeText(title)} `.includes(` ${normalizedAnswer} `)
    ) {
      reject(ctx, "title-spoils", `title gives away the answer ("${correctAnswer}").`);
    }
  }

  // ── question ──
  if (question.trim().length === 0) {
    reject(ctx, "question-empty", "question is empty.");
  } else {
    const words = wordCount(question);
    if (words > 120) {
      reject(ctx, "question-len", `question is ${words} words — the hard ceiling is 120.`);
    } else if (options.mode === "strict" && words > 60) {
      warn(ctx, "question-len", `question is ${words} words — the contract asks for ≤ 60.`);
    }
    if (options.mode === "strict" && type !== "true-false" && !question.trim().endsWith("?")) {
      warn(ctx, "no-question-mark", "question does not end with '?' — statements are fine only for true-false.");
    }
  }

  // ── explanations ──
  const correctSentences = sentenceCount(correctExplanation);
  if (correctSentences < 1) warn(ctx, "correct-exp", "correctExplanation should be 1–2 sentences.");
  else if (correctSentences > 3) warn(ctx, "correct-exp", `correctExplanation is ${correctSentences} sentences — keep it to 1–2.`);
  const incorrectSentences = sentenceCount(incorrectExplanation);
  if (incorrectSentences < 2) warn(ctx, "incorrect-exp", "incorrectExplanation should be 2–3 sentences that teach the mechanism.");
  else if (incorrectSentences > 4) warn(ctx, "incorrect-exp", `incorrectExplanation is ${incorrectSentences} sentences — keep it to 2–3.`);
  if (type !== "true-false" && correctAnswer.length > 0) {
    const variants: string[] = [correctAnswer];
    const acceptedRaw = item.acceptedAnswers;
    if (Array.isArray(acceptedRaw)) {
      for (const a of acceptedRaw) if (typeof a === "string") variants.push(a);
    }
    const haystack = normalizeText(incorrectExplanation);
    if (!variants.some((v) => normalizeText(v).length > 0 && haystack.includes(normalizeText(v)))) {
      warn(ctx, "exp-answer", "incorrectExplanation never states the answer — the contract requires it to reveal the answer.");
    }
  }

  // ── lessonContent: the coaching layer ──
  // The lesson introduces the *type of thinking* behind the question — the
  // general skill, technique or concept a coach would teach afterwards. It must
  // never state this question's answer: a solution sheet is not a lesson.
  // Strict (AI) batches carry one by mandate; legacy seeds predate it, so
  // absence and leaks there are calibration warnings, not failures.
  const lessonContent = readString(item, "lessonContent");
  const hasLesson = lessonContent !== null && lessonContent.trim().length > 0;
  if (!hasLesson) {
    const issue =
      "lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.";
    if (options.mode === "legacy") warn(ctx, "lesson-required", issue);
    else reject(ctx, "lesson-required", issue);
  }
  if (hasLesson) {
    const lines = lessonContent.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 4 || lines.length > 6) {
      warn(ctx, "lesson-shape", `lessonContent should be 4–6 lines — got ${lines.length}.`);
    }
    if (lines.length > 0 && !lines[lines.length - 1].startsWith("Share this:")) {
      warn(ctx, "lesson-shape", "lessonContent must end with a line starting 'Share this:'.");
    }
    const normalizedAnswer = normalizeText(correctAnswer);
    const answerExempt =
      type === "true-false" ||
      normalizedAnswer.length < 3 ||
      isNumericAnswer(normalizedAnswer) ||
      // Type-answer with a short physics-style answer ("fall", "white",
      // "stay the same") may legitimately meet that word inside a general
      // lesson — you cannot teach Archimedes without "falling". Longer
      // type-answer phrases (lateral-scenario answers) and every riddle
      // answer remain protected: there the answer is the puzzle's secret.
      (type === "type-answer" && tokenize(normalizedAnswer).length <= 3);
    if (
      !answerExempt &&
      ` ${normalizeText(lessonContent)} `.includes(` ${normalizedAnswer} `)
    ) {
      const issue = `lessonContent states the answer ("${correctAnswer}") — lessons teach the type of thinking, never this question's answer.`;
      if (options.mode === "legacy") warn(ctx, "lesson-reveals", issue);
      else reject(ctx, "lesson-reveals", issue);
    }
  }

  // ── lessonGroup: the Learn-screen curriculum placement ──
  // Strict (AI) batches declare their group; the group must exist in the
  // curriculum map for that category. Legacy seeds get calibration warnings.
  const lessonGroup = readString(item, "lessonGroup");
  const hasGroup = lessonGroup !== null && lessonGroup.trim().length > 0;
  if (!hasGroup) {
    const issue = "lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.";
    if (options.mode === "legacy") warn(ctx, "lesson-group-required", issue);
    else reject(ctx, "lesson-group-required", issue);
  } else if (CATEGORIES.includes(category) && !isKnownLessonGroup(category, lessonGroup)) {
    const issue = `lessonGroup "${lessonGroup}" is not a ${category || "this"} curriculum group — see lib/forge/curriculum.ts.`;
    if (options.mode === "legacy") warn(ctx, "lesson-group-unknown", issue);
    else reject(ctx, "lesson-group-unknown", issue);
  }

  // ── banned content ──
  const questionLower = question.toLowerCase();
  if (/odd one out/.test(questionLower) || (/odd (one|word)/.test(questionLower) && choices.every((c) => SHAPE_WORDS.includes(normalizeText(c))))) {
    reject(ctx, "banned-shapes", "Odd-one-out with basic shapes is kids' worksheet material — banned.");
  }
  if (/capital of/.test(questionLower)) {
    reject(ctx, "banned-capital", "Capital-city recall is pure trivia — banned.");
  }
  if (/^\s*(what is|what's|calculate|compute)?\s*\d{1,3}\s*[+\-×x*÷/]\s*\d{1,3}\s*(=|\?)?\s*$/i.test(question.trim())) {
    reject(ctx, "banned-arithmetic", "Pure arithmetic drill — banned.");
  }
  for (const c of choices) {
    if (/^(all|none) of the above$/i.test(c.trim())) {
      reject(ctx, "banned-above", `"${c}" — All/None-of-the-above options are banned.`);
    }
  }
  if (type !== "riddle" && /\bspell(ed|ing)\b/i.test(question)) {
    reject(ctx, "banned-spelling", "Spelling tests are banned outside riddles.");
  }

  // ── distractor quality (warnings) ──
  if ((type === "multiple-choice") && choices.length === 4 && choices.includes(correctAnswer)) {
    const lengths = choices.map((c) => c.length);
    const maxLen = Math.max(...lengths);
    const minLen = Math.min(...lengths);
    if (minLen > 0 && maxLen / minLen > 2.5) {
      warn(ctx, "option-spread", `Option lengths vary ${minLen}–${maxLen} chars — one option stands out.`);
    }
    const others = choices.filter((c) => c !== correctAnswer).map((c) => c.length).sort((a, b) => a - b);
    if (others.length === 3) {
      const median = others[1];
      const own = correctAnswer.length;
      if (median > 0 && (own / median > 1.8 || own / median < 0.55)) {
        warn(ctx, "correct-outlier", "The correct option is the odd one out by length — players spot that.");
      }
    }
    // Lexical giveaway: a ≥5-char word in the stem that appears in the correct
    // option but in none of the wrong ones.
    const stemWords = new Set(tokenize(question).filter((w) => w.length >= 5));
    const correctWords = new Set(tokenize(correctAnswer));
    const wrongWords = new Set(choices.filter((c) => c !== correctAnswer).flatMap(tokenize));
    const giveaways = [...correctWords].filter((w) => stemWords.has(w) && !wrongWords.has(w));
    if (giveaways.length > 0) {
      warn(ctx, "lexical-giveaway", `Question and correct option share exclusive word(s): ${giveaways.join(", ")}.`);
    }
    // First-word uniformity: all wrong options start alike, correct differs.
    const firstWord = (s: string) => (tokenize(s)[0] ?? "");
    const wrongFirsts = choices.filter((c) => c !== correctAnswer).map(firstWord);
    if (
      wrongFirsts.length === 3 &&
      wrongFirsts[0] !== "" &&
      wrongFirsts.every((w) => w === wrongFirsts[0]) &&
      firstWord(correctAnswer) !== wrongFirsts[0]
    ) {
      warn(ctx, "first-word", `Wrong options all start with "${wrongFirsts[0]}" but the correct one does not — a pattern giveaway.`);
    }
  }

  // ── duplicates inside this batch (later copy takes the reject) ──
  const qKey = normalizeText(question);
  if (qKey.length > 0) {
    const earlier = options.seen.questions.get(qKey);
    if (earlier !== undefined) {
      reject(ctx, "dup-question", `Question duplicates item #${earlier + 1} of this batch.`);
    }
    const words = new Set(tokenize(question));
    for (const prior of options.seen.questionSets) {
      if (jaccard(words, prior.words) >= 0.6) {
        reject(ctx, "dup-near", `Question is a near-duplicate of item #${prior.index + 1} of this batch.`);
        break;
      }
    }
  }
  if (type !== "true-false" && correctAnswer.length > 0) {
    const normalizedAnswer = normalizeText(correctAnswer);
    if (!isNumericAnswer(normalizedAnswer)) {
      const aKey = `${category}|${normalizedAnswer}`;
      const earlierAnswer = options.seen.answers.get(aKey);
      if (earlierAnswer !== undefined) {
        reject(ctx, "dup-answer", `Same answer "${correctAnswer}" in ${category} already used by item #${earlierAnswer + 1} — same underlying fact.`);
      }
    }
  }
  const tKey = normalizeText(title);
  if (tKey.length > 0) {
    const earlierTitle = options.seen.titles.get(tKey);
    if (earlierTitle !== undefined) {
      reject(ctx, "dup-title", `Title duplicates item #${earlierTitle + 1} of this batch.`);
    }
  }

  // ── duplicates in previous batches (registry) ──
  if (qKey.length > 0) {
    const owners = options.registry.q[hashText(qKey)]?.filter((o) => !o.startsWith(`${batchId}#`));
    if (owners !== undefined && owners.length > 0) {
      reject(ctx, "registry-dup", `Question already generated by ${owners.join(", ")}.`);
    }
  }
  if (type !== "true-false" && correctAnswer.length > 0 && !isNumericAnswer(normalizeText(correctAnswer))) {
    const owners = options.registry.a[`${category}|${hashText(normalizeText(correctAnswer))}`]?.filter(
      (o) => !o.startsWith(`${batchId}#`),
    );
    if (owners !== undefined && owners.length > 0) {
      reject(ctx, "registry-dup", `Answer "${correctAnswer}" in ${category} already generated by ${owners.join(", ")}.`);
    }
  }
  if (tKey.length > 0) {
    const owners = options.registry.t[hashText(tKey)]?.filter((o) => !o.startsWith(`${batchId}#`));
    if (owners !== undefined && owners.length > 0) {
      reject(ctx, "registry-dup", `Title already generated by ${owners.join(", ")}.`);
    }
  }

  return finalize({ index, id, title, type, passed: false, score: 0, rejects: [], warns: [] }, ctx);
}

function finalize(report: ItemReport, ctx: ItemContext): ItemReport {
  const rejects = ctx.issues.filter((i) => i.severity === "reject");
  const warns = ctx.issues.filter((i) => i.severity === "warn");
  const passed = rejects.length === 0 && warns.length <= 3;
  const score = rejects.length > 0 ? 0 : Math.max(0, 100 - 8 * warns.length);
  return { ...report, passed, score, rejects, warns };
}

/**
 * Verifies a whole batch. `items` is the raw JSON the model produced.
 * The returned `registry` includes every item of this batch (passed or not) so
 * a regenerated question in a later batch is still caught as a duplicate.
 */
export function verifyBatch(
  items: unknown,
  options: BatchOptions = {},
): BatchReport {
  const batchId = options.batchId ?? "batch";
  const mode = options.mode ?? "strict";
  const registry: ForgeRegistry = options.registry
    ? cloneRegistry(options.registry)
    : { q: {}, a: {}, t: {} };

  if (!Array.isArray(items)) {
    return {
      batchId,
      mode,
      total: 0,
      passedCount: 0,
      failedCount: 0,
      items: [],
      positionDistribution: {},
      rejectHistogram: { "not-an-array": 1 },
      registry,
    };
  }

  const seen = {
    questions: new Map<string, number>(),
    questionSets: new Array<{ words: Set<string>; index: number }>(),
    answers: new Map<string, number>(),
    titles: new Map<string, number>(),
  };

  const reports: ItemReport[] = [];
  const positionDistribution: Record<string, number> = {};
  const rejectHistogram: Record<string, number> = {};

  items.forEach((raw, index) => {
    const report = verifyItem(raw, index, batchId, { mode, seen, registry });
    reports.push(report);

    // Record what this item used for duplicate checks on later items.
    if (isRecord(raw)) {
      const question = typeof raw.question === "string" ? raw.question : "";
      const qKey = normalizeText(question);
      if (qKey.length > 0) {
        seen.questions.set(qKey, index);
        seen.questionSets.push({ words: new Set(tokenize(question)), index });
      }
      const title = typeof raw.title === "string" ? raw.title : "";
      const tKey = normalizeText(title);
      if (tKey.length > 0) seen.titles.set(tKey, index);
      const category = typeof raw.category === "string" ? raw.category : "";
      const answer = typeof raw.correctAnswer === "string" ? raw.correctAnswer : "";
      if (raw.type !== "true-false" && answer.length > 0 && !isNumericAnswer(normalizeText(answer))) {
        seen.answers.set(`${category}|${normalizeText(answer)}`, index);
      }
      // MCQ position tracking.
      if (raw.type === "multiple-choice" && Array.isArray(raw.choices) && typeof raw.correctAnswer === "string") {
        const pos = raw.choices.indexOf(raw.correctAnswer);
        if (pos >= 0) {
          const label = String(pos + 1);
          positionDistribution[label] = (positionDistribution[label] ?? 0) + 1;
        }
      }
    }
  });

  // Registry additions: every item, passed or failed.
  items.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    const owner = `${batchId}#${index}`;
    const question = typeof raw.question === "string" ? raw.question : "";
    const qKey = normalizeText(question);
    if (qKey.length > 0) addToRegistry(registry.q, hashText(qKey), owner);
    const title = typeof raw.title === "string" ? raw.title : "";
    const tKey = normalizeText(title);
    if (tKey.length > 0) addToRegistry(registry.t, hashText(tKey), owner);
    const category = typeof raw.category === "string" ? raw.category : "";
    const answer = typeof raw.correctAnswer === "string" ? raw.correctAnswer : "";
    if (raw.type !== "true-false" && answer.length > 0 && !isNumericAnswer(normalizeText(answer))) {
      addToRegistry(registry.a, `${category}|${hashText(normalizeText(answer))}`, owner);
    }
  });

  for (const report of reports) {
    for (const issue of report.rejects) {
      rejectHistogram[issue.rule] = (rejectHistogram[issue.rule] ?? 0) + 1;
    }
  }

  const passedCount = reports.filter((r) => r.passed).length;
  return {
    batchId,
    mode,
    total: reports.length,
    passedCount,
    failedCount: reports.length - passedCount,
    items: reports,
    positionDistribution,
    rejectHistogram,
    registry,
  };
}

function addToRegistry(map: Record<string, string[]>, key: string, owner: string): void {
  const existing = map[key];
  if (existing === undefined) map[key] = [owner];
  else if (!existing.includes(owner)) existing.push(owner);
}

function cloneRegistry(registry: ForgeRegistry): ForgeRegistry {
  return {
    q: Object.fromEntries(Object.entries(registry.q).map(([k, v]) => [k, [...v]])),
    a: Object.fromEntries(Object.entries(registry.a).map(([k, v]) => [k, [...v]])),
    t: Object.fromEntries(Object.entries(registry.t).map(([k, v]) => [k, [...v]])),
  };
}

/** True when the batch's reject rate crosses the QC stop-the-line (20%). */
export function rejectRateCrossedLine(report: BatchReport): boolean {
  return report.total > 0 && report.failedCount / report.total > 0.2;
}
