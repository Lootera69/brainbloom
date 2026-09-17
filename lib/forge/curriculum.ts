/**
 * BrainBloom Forge — the curriculum map.
 *
 * Every forge question carries a `lessonGroup`: the Learn-screen curriculum
 * group it trains. The generator (see `MASTER_PROMPT.md`) must pick from this
 * map; the verifier rejects unknown groups, so a typo can never strand a
 * question outside the curriculum.
 *
 * Groups marked [seed] exist in the hand-written seed bank
 * (`scripts/seed-data/data.ts`) and are kept so future AI questions can extend
 * those very groups. `lessonOrder` inside a group is assigned at Studio import
 * time (next free slot per group) — batches only decide *which* group.
 */

export const LESSON_GROUP_CURRICULUM: Record<string, readonly string[]> = {
  logic: [
    // [seed] valid inference forms: modus ponens/tollens, syllogisms, sorites
    "Think Straight",
    // [seed] sequences and pattern-spotting
    "Spot the Pattern",
    // [seed] classic logic puzzles
    "Solve It",
    // [seed] advanced reasoning
    "Master Mind",
    // named fallacies: ad populum, ad hominem, straw man, affirming the
    // consequent, false dilemma, slippery slope …
    "Fallacy Field Guide",
    // Zeno, Russell, sorites/heap, the Liar, Newcomb's problem
    "Paradox Alley",
    // Monty Hall, birthday paradox, Simpson's reversal, base-rate neglect
    "Mind the Odds",
    // prisoner's dilemma, Nash intuition, backward induction
    "Decision Frames",
    // lateral scenarios, hidden assumptions, impossible premises
    "Lateral Leaps",
    // conditional traps, illicit conversion, Venn reasoning, Occam
    "Argument Repair",
    // map-vs-territory, planning fallacy, adversarial thinking
    "Map & Territory",
  ],
  science: [
    // [seed]
    "Body & Biology",
    // [seed]
    "Physics Fun",
    // [seed]
    "Earth & Space",
    // [seed]
    "Crazy Chemistry",
    // [seed]
    "Science Mix",
    // superposition, entanglement, observer effect, tunneling, decoherence
    "Quantum Café",
    // time dilation, twin paradox, why nothing beats light speed, curvature
    "Relativity Road",
    // neuroplasticity, memory, dopamine, attention, sleep
    "Mind Machinery",
    // evolution's counterintuitive designs, deep time, mismatch
    "Deep Time",
    // Fermi estimation, orders of magnitude, scale
    "Fermi's Notebook",
  ],
  riddles: [
    // [seed]
    "Classic Riddles",
    // [seed]
    "Funny Business",
    // [seed] double-meaning and wordplay riddles
    "Tricky Words",
    // [seed]
    "Brain Busters",
    // riddles whose answer contradicts its own surface reading
    "Paradox Riddles",
    // original constructions, modern settings
    "Modern Twists",
  ],
  puzzles: [
    // [seed]
    "Number Crunch",
    // [seed]
    "Word Play",
    // [seed]
    "Think Different",
    // [seed]
    "Bonus Round",
    // weighing, measuring, pouring puzzles
    "Scale Stories",
    // sequence aha rules, pattern completion with twists
    "Sequence Secrets",
  ],
  wonders: [
    // [seed]
    "Think Deeper",
    // [seed]
    "Mind Stretchers",
    // [seed]
    "Cosmic Wonders",
    // [seed]
    "Life Puzzles",
    // psychology: Kahneman, Milgram, Festinger, biases
    "Mind Mirrors",
    // philosophers and poets: Kierkegaard, Nietzsche, Rumi, Dickinson
    "Poet's Corner",
  ],
};

/** Collapses the apostrophe family (U+0027, U+2018/2019, U+02BC) to the plain
 * ASCII quote — a curly "Poet’s Corner" must match a straight "Poet's Corner",
 * because AI output mixes the two freely. */
function normalizeApostrophes(value: string): string {
  return value.replace(/[\u2018\u2019\u02BC]/g, "'");
}

/** True when [group] is a valid curriculum group for [category]. */
export function isKnownLessonGroup(category: string, group: string): boolean {
  const groups = LESSON_GROUP_CURRICULUM[normalizeApostrophes(category)];
  if (groups === undefined) return false;
  const candidate = normalizeApostrophes(group);
  return groups.some((g) => normalizeApostrophes(g) === candidate);
}
