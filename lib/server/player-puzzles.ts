import { z } from "zod";
import type { PlayerAnswer } from "@/lib/player-contract";

const text = z.string().max(50000);
const slide = z.object({ content: text, imageUrl: z.string().max(2000).optional() });
export const scoringPuzzleSchema = z.object({
  type: z.enum(["multiple-choice", "true-false", "type-answer", "riddle", "crossword", "sudoku", "cipher", "wonder", "story"]),
  title: z.string().max(500), category: z.string().max(100),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  question: text.default(""), choices: z.array(z.string().max(2000)).max(20).nullish(),
  correctAnswer: z.string().max(5000).default(""),
  acceptedAnswers: z.array(z.string().max(5000)).max(100).nullish(),
  xpReward: z.number().int().min(0).max(1000), published: z.literal(true),
  imageUrl: z.string().max(2000).nullish(), lessonImageUrl: z.string().max(2000).nullish(),
  lessonContent: text.nullish(), lessonOrder: z.number().nullish(),
  lessonGroup: z.string().max(200).nullish(), lessonGroupOrder: z.number().nullish(),
  hintText: text.nullish(), sharePrompt: text.nullish(),
  correctExplanation: text.nullish(), incorrectExplanation: text.nullish(),
  crosswordData: z.object({
    size: z.number().int().min(1).max(25),
    grid: z.array(z.array(z.string().max(4).nullable()).max(25)).max(25),
    clues: z.array(z.object({ number: z.number().int(), clue: z.string().max(2000), answer: z.string().min(1).max(25),
      startRow: z.number().int().min(0).max(24), startCol: z.number().int().min(0).max(24), direction: z.enum(["across", "down"]) })).max(100),
  }).nullish(),
  sudokuData: z.object({ puzzle: z.array(z.number().int().min(0).max(9)).length(81),
    solution: z.array(z.number().int().min(1).max(9)).length(81) }).nullish(),
  cipherData: z.object({ encodedMessage: text, cipherType: z.string().max(100), hint: text.nullish() }).nullish(),
  storyData: z.object({ questionSlides: z.array(slide).max(50), answerSlides: z.array(slide).max(50) }).nullish(),
});

export type ScoringPuzzle = z.infer<typeof scoringPuzzleSchema> & { id: string };

export function readScoringPuzzle(id: string, raw: unknown): ScoringPuzzle | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const data = raw as Record<string, unknown>;
    const crossword = data.crosswordData as Record<string, unknown> | null;
    if (crossword && typeof crossword === 'object' && !Array.isArray(crossword.grid)
      && crossword.grid && typeof crossword.grid === 'object'
      && Number.isInteger(crossword.size) && (crossword.size as number) > 0 && (crossword.size as number) <= 25
      && Object.keys(crossword.grid).length === crossword.size) {
      raw = { ...data, crosswordData: { ...crossword,
        grid: Array.from({ length: crossword.size as number }, (_, row) => (crossword.grid as Record<string, unknown>)[String(row)]),
      } };
    }
  }
  const parsed = scoringPuzzleSchema.safeParse(raw);
  if (!parsed.success) return null;
  const puzzle: ScoringPuzzle = { id, ...JSON.parse(JSON.stringify(parsed.data)) };
  if (puzzle.type === "true-false" && !puzzle.choices?.length) puzzle.choices = ["True", "False"];
  if (["multiple-choice", "true-false"].includes(puzzle.type) && (!puzzle.choices || puzzle.choices.length < 2
    || !puzzle.choices.some((choice) => normalized(choice) === normalized(puzzle.correctAnswer)))) return null;
  if (["type-answer", "riddle", "cipher"].includes(puzzle.type) && !puzzle.correctAnswer.trim()) return null;
  if (puzzle.type === "crossword") {
    const crossword = puzzle.crosswordData;
    if (!crossword || !crossword.clues.length || crossword.grid.length !== crossword.size
      || crossword.grid.some((row) => row.length !== crossword.size)
      || !crossword.grid.some((row) => row.some((cell) => cell !== null && cell.trim().length > 0))) return null;
    for (const clue of crossword.clues) for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.startRow + (clue.direction === "down" ? i : 0);
      const c = clue.startCol + (clue.direction === "across" ? i : 0);
      const cell = crossword.grid[r]?.[c];
      if (typeof cell !== "string" || normalized(cell) !== normalized(clue.answer[i])) return null;
    }
  }
  if (puzzle.type === "sudoku" && (!puzzle.sudokuData || !gradeAnswer(puzzle, puzzle.sudokuData.solution))) return null;
  return puzzle;
}

export function publicPuzzle(puzzle: ScoringPuzzle): Record<string, unknown> {
  const fields = ["id", "type", "title", "category", "difficulty", "question", "choices", "xpReward", "published", "imageUrl",
    "lessonImageUrl", "lessonContent", "lessonOrder", "lessonGroup", "lessonGroupOrder", "hintText", "sharePrompt", "cipherData"];
  const visible = Object.fromEntries(Object.entries(puzzle).filter(([key]) => fields.includes(key)));
  if (puzzle.type === 'cipher') {
    delete visible.hintText;
    delete visible.lessonContent;
    visible.question = '';
    visible.cipherData = puzzle.cipherData ? {
      encodedMessage: puzzle.cipherData.encodedMessage,
      cipherType: puzzle.cipherData.cipherType,
    } : null;
  }
  const { crosswordData, sudokuData, storyData } = puzzle;
  return {
    ...visible,
    ...(crosswordData ? { crosswordData: {
      size: crosswordData.size, grid: crosswordData.grid.map((row) => row.map((cell) => cell === null ? null : "")),
      clues: crosswordData.clues.map(({ answer, ...clue }) => ({ ...clue, length: answer.length })),
    } } : {}),
    ...(sudokuData ? { sudokuData: { puzzle: sudokuData.puzzle } } : {}),
    ...(storyData && puzzle.type === 'story' ? { storyData } : {}),
    ...(puzzle.type === 'wonder' ? { correctExplanation: puzzle.correctExplanation ?? null } : {}),
  };
}

export function cipherPhase(now: number): 'active' | 'hint' | 'closed' {
  const day = new Date(now).getUTCDay();
  return day === 6 ? 'closed' : day === 5 ? 'hint' : 'active';
}

export function publicWeeklyCipher(puzzle: ScoringPuzzle, now: number, solved = false): Record<string, unknown> {
  const phase = cipherPhase(now);
  return {
    ...publicPuzzle(puzzle),
    ...(phase !== 'active' || solved ? {
      question: puzzle.question, hintText: puzzle.hintText ?? null,
      cipherData: puzzle.cipherData ?? null,
    } : {}),
    ...(phase === 'closed' || solved ? {
      correctAnswer: puzzle.correctAnswer,
      correctExplanation: puzzle.correctExplanation ?? null,
      lessonContent: puzzle.lessonContent ?? null,
    } : {}),
  };
}

export function puzzleSolution(puzzle: ScoringPuzzle): Record<string, unknown> {
  return JSON.parse(JSON.stringify({
    correctAnswer: puzzle.correctAnswer, acceptedAnswers: puzzle.acceptedAnswers,
    correctExplanation: puzzle.correctExplanation, incorrectExplanation: puzzle.incorrectExplanation,
    crosswordData: puzzle.crosswordData, sudokuData: puzzle.sudokuData, storyData: puzzle.storyData,
  }));
}

const normalized = (input: string) => input.trim().normalize("NFKC").toLowerCase();

export function crosswordFeedback(puzzle: ScoringPuzzle, answer: PlayerAnswer): Record<string, boolean> | undefined {
  if (puzzle.type !== "crossword" || !puzzle.crosswordData || typeof answer === "string" || Array.isArray(answer)) return undefined;
  return Object.fromEntries(puzzle.crosswordData.grid.flatMap((row, r) => row.flatMap((cell, c) => cell === null ? [] :
    [[`${r},${c}`, typeof answer[`${r},${c}`] === "string" && normalized(answer[`${r},${c}`]) === normalized(cell)]])));
}

export function closeAnswer(puzzle: ScoringPuzzle, answer: PlayerAnswer): boolean {
  if (!["type-answer", "cipher"].includes(puzzle.type) || typeof answer !== "string") return false;
  const input = normalized(answer);
  if (!input.length || input.length > 100) return false;
  return [puzzle.correctAnswer, ...(puzzle.acceptedAnswers ?? [])].some((value) => {
    const target = normalized(value);
    if (target.length > 100 || Math.abs(input.length - target.length) > 2) return false;
    let previous = Array.from({ length: target.length + 1 }, (_, i) => i);
    for (let r = 1; r <= input.length; r++) {
      const next = [r];
      for (let c = 1; c <= target.length; c++) next[c] = Math.min(next[c - 1] + 1, previous[c] + 1, previous[c - 1] + Number(input[r - 1] !== target[c - 1]));
      if (Math.min(...next) > 2) return false;
      previous = next;
    }
    return previous[target.length] <= 2;
  });
}

export function gradeAnswer(puzzle: ScoringPuzzle, answer: PlayerAnswer): boolean {
  if (puzzle.type === "wonder" || puzzle.type === "story") return answer === "read";
  if (puzzle.type === "sudoku") {
    const source = puzzle.sudokuData;
    if (!source || !Array.isArray(answer) || answer.length !== 81) return false;
    if (!answer.every((n, i) => Number.isInteger(n) && n >= 1 && n <= 9 && (!source.puzzle[i] || n === source.puzzle[i]))) return false;
    const units: number[][] = [];
    for (let i = 0; i < 9; i++) {
      units.push(answer.slice(i * 9, i * 9 + 9), Array.from({ length: 9 }, (_, j) => answer[j * 9 + i]));
      units.push(Array.from({ length: 9 }, (_, j) => answer[(Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + (i % 3) * 3 + j % 3]));
    }
    return units.every((unit) => new Set(unit).size === 9);
  }
  if (puzzle.type === "crossword") {
    if (!puzzle.crosswordData || typeof answer === "string" || Array.isArray(answer)) return false;
    return puzzle.crosswordData.grid.every((row, r) => row.every((cell, c) => cell === null ||
      (typeof answer[`${r},${c}`] === "string" && normalized(answer[`${r},${c}`]) === normalized(cell))));
  }
  if (typeof answer !== "string" || normalized(answer).length === 0) return false;
  if (puzzle.type === "multiple-choice" || puzzle.type === "true-false") {
    return puzzle.choices?.includes(answer) === true && normalized(answer) === normalized(puzzle.correctAnswer);
  }
  return [puzzle.correctAnswer, ...(puzzle.acceptedAnswers ?? [])].some((value) => normalized(value) === normalized(answer));
}

export const scoredType = (type: string) => !["cipher", "wonder", "story"].includes(type);
export const dailyEligible = (puzzle: ScoringPuzzle) => scoredType(puzzle.type) && !["sudoku", "crossword"].includes(puzzle.type);

export function pickPuzzles<T>(pool: T[], day: number, count: number): T[] {
  if (pool.length <= count) return [...pool];
  const stride = day % (pool.length - 1) + 1;
  const chosen: T[] = [];
  const seen = new Set<number>();
  let index = day % pool.length;
  while (chosen.length < count) {
    const slot = index % pool.length;
    if (seen.has(slot)) index++;
    else { seen.add(slot); chosen.push(pool[slot]); }
    index += stride;
  }
  return chosen;
}

export function selectDailySet(puzzles: ScoringPuzzle[], now: number, pin: Record<string, unknown> | undefined, categories: string[] = []): string[] {
  const pool = puzzles.filter(dailyEligible).sort((a, b) => a.id.localeCompare(b.id));
  const day = Math.floor(now / 86400000);
  const wanted = [...new Set(categories)].filter((category) => pool.some((p) => p.category === category)).sort();
  if (wanted.length) {
    const rotate = day % wanted.length;
    const order = [...wanted.slice(rotate), ...wanted.slice(0, rotate)];
    const chosen = order.flatMap((category, i) => pickPuzzles(pool.filter((p) => p.category === category), day,
      Math.floor(3 / wanted.length) + (i < 3 % wanted.length ? 1 : 0)));
    const remaining = pool.filter((p) => wanted.includes(p.category) && !chosen.some((value) => value.id === p.id));
    return [...chosen, ...pickPuzzles(remaining, day, 3 - chosen.length)].map((p) => p.id);
  }
  const pinned = pin?.date === new Date(now).toISOString().slice(0, 10) ? pool.find((p) => p.id === pin.puzzleId) : undefined;
  return (pinned ? [pinned, ...pickPuzzles(pool.filter((p) => p.id !== pinned.id), day, 2)] : pickPuzzles(pool, day, 3)).map((p) => p.id);
}

export function cipherWeek(now: number): string {
  const date = new Date(now); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

export function selectCipher(puzzles: ScoringPuzzle[], now: number, pin: Record<string, unknown> | undefined): string | null {
  const pool = puzzles.filter((p) => p.type === "cipher").sort((a, b) => a.id.localeCompare(b.id));
  const pinned = pin?.weekStart === cipherWeek(now) ? pool.find((p) => p.id === pin.puzzleId) : undefined;
  return pinned?.id ?? pool[Math.floor(Date.parse(`${cipherWeek(now)}T00:00:00Z`) / 604800000) % pool.length]?.id ?? null;
}
