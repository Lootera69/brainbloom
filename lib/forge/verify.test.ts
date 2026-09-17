import { describe, expect, it } from "vitest";
import { verifyBatch, type BatchReport } from "./verify";
import seedData from "../../scripts/seed-data/data";

const goldMcq = {
  type: "multiple-choice",
  category: "logic",
  difficulty: "hard",
  title: "The Barber's Dilemma",
  question: "In a village, the barber shaves exactly those men who do not shave themselves. Who shaves the barber?",
  choices: ["The barber shaves himself", "Another villager shaves him", "Nobody — the rule is self-contradictory", "He is bald, so the question is void"],
  correctAnswer: "Nobody — the rule is self-contradictory",
  xpReward: 50,
  correctExplanation: "Exactly. Either way the rule breaks: if he shaves himself he violates it, and if he doesn't he must shave himself.",
  incorrectExplanation: "The answer is nobody — the rule is self-contradictory. If he shaves himself, he's shaving someone who shaves himself. If someone else shaves him, then he doesn't shave himself — so by the rule he must shave himself. Every 'practical' answer quietly breaks the rule.",
  lessonGroup: "Paradox Alley",
  lessonContent:
    "Russell's paradox arrives from harmless-looking self-reference: a set that contains all sets that don't contain themselves.\nThe village version dresses the same trap in everyday clothing — a rule that applies to itself.\nLogicians built type theory to fence off exactly this kind of loop.\nSpotting self-reference early is a core reasoning skill.\nShare this: try writing a sentence that describes itself and see where it bites.",
};

const goldTrueFalse = {
  type: "true-false",
  category: "science",
  difficulty: "easy",
  title: "Quantum Spookiness",
  question: "Quantum entanglement means measuring one particle instantly influences its entangled partner, and this cannot be used to send faster-than-light messages.",
  choices: ["True", "False"],
  correctAnswer: "True",
  xpReward: 10,
  correctExplanation: "True — proven by the 2022 Nobel experiments. The correlation is instant but each result is random.",
  incorrectExplanation: "It's true. Einstein doubted it, but experiments settled it. The catch: the results are random, so no message can ride on it faster than light.",
  lessonGroup: "Quantum Café",
  lessonContent:
    "Einstein's 'spooky action' nickname came from discomfort with what the mathematics predicted.\nEntanglement correlations have passed every Bell test since the 1970s.\nRandomness at each end is what blocks faster-than-light messaging.\nThe observer effect is a different phenomenon from entanglement — a common mix-up.\nShare this: ask someone why entanglement can't send messages and enjoy the pause.",
};

const goldRiddle = {
  type: "riddle",
  category: "riddles",
  difficulty: "easy",
  title: "The More You Take",
  question: "The more you take, the more you leave behind. What am I?",
  choices: [],
  correctAnswer: "Footsteps",
  acceptedAnswers: ["Footsteps", "Steps", "A footstep", "footsteps"],
  hintText: "Think about movement, not objects.\nIt's something you 'take' with your body.\nYou leave them behind you as you walk.",
  xpReward: 10,
  correctExplanation: "Yes! Every step you 'take' leaves a footprint behind — the double meaning of 'take' is the whole trick.",
  incorrectExplanation: "The answer is footsteps. The riddle plays on two meanings of 'take'. The more steps you take, the more you leave behind you.",
  lessonGroup: "Classic Riddles",
  lessonContent:
    "Wordplay riddles hide their trick in the double meanings of ordinary verbs.\nThe fair ones keep every needed clue inside the riddle itself.\nRiddles older than a thousand years survive in the Exeter Book — the habit of riddling runs deep in human culture.\nReading a riddle twice, slowly, is the standard technique.\nShare this: ask someone the oldest riddle you know and watch them reason it aloud.",
};

const goldTypeAnswer = {
  type: "type-answer",
  category: "puzzles",
  difficulty: "medium",
  title: "The Viral Sequence",
  question: "What's the next number in this famous sequence?\n1, 11, 21, 1211, 111221, ?",
  choices: [],
  correctAnswer: "312211",
  acceptedAnswers: ["312211", "312,211", "312 211"],
  xpReward: 25,
  correctExplanation: "Each term describes the previous one — 'three 1s, two 2s, one 1' → 312211.",
  incorrectExplanation: "The answer is 312211. Read 111221 aloud as 'three 1s, two 2s, one 1' and write that down: 31 22 11.",
  lessonGroup: "Sequence Secrets",
  lessonContent:
    "Look-and-say sequences read the previous term aloud and write down what you heard.\nThey were popularised by recreational mathematicians and made a famous interview puzzle.\nTheir growth is governed by a constant Conway analysed — roughly 1.3 per step.\nDescribing a pattern out loud often reveals its rule faster than staring at it.\nShare this: read 1122 aloud as 'one 1, one 2' and invent the next term with a friend.",
};

function verifyOne(item: Record<string, unknown>, extra: Record<string, unknown> = {}): BatchReport {
  return verifyBatch([{ ...item, ...extra }], { batchId: "t" });
}

function expectRejected(report: BatchReport, rule: string): void {
  const item = report.items[0];
  expect(item.passed).toBe(false);
  expect(item.rejects.some((r) => r.rule === rule)).toBe(true);
}

describe("forge verifier — gold items pass", () => {
  it("accepts a gold multiple-choice item", () => {
    const report = verifyOne(goldMcq);
    expect(report.items[0].passed).toBe(true);
    expect(report.items[0].rejects).toHaveLength(0);
  });

  it("accepts a gold true-false item", () => {
    const report = verifyOne(goldTrueFalse);
    expect(report.items[0].passed).toBe(true);
  });

  it("accepts a gold riddle with progressive hints", () => {
    const report = verifyOne(goldRiddle);
    expect(report.items[0].passed).toBe(true);
  });

  it("accepts a gold type-answer item", () => {
    const report = verifyOne(goldTypeAnswer);
    expect(report.items[0].passed).toBe(true);
  });
});

describe("forge verifier — schema and contract rejections", () => {
  it("rejects an unknown field", () => {
    expectRejected(verifyOne(goldMcq, { mood: "playful" }), "unknown-field");
  });

  it("rejects a missing required field", () => {
    const { incorrectExplanation: _drop, ...rest } = goldMcq;
    expectRejected(verifyOne(rest), "missing-field");
  });

  it("rejects an invalid category", () => {
    expectRejected(verifyOne(goldMcq, { category: "general" }), "bad-enum");
  });

  it("rejects an invalid difficulty", () => {
    expectRejected(verifyOne(goldMcq, { difficulty: "expert" }), "bad-enum");
  });

  it("rejects a wrong type", () => {
    expectRejected(verifyOne(goldMcq, { type: "wonder" }), "bad-enum");
  });

  it("rejects xpReward that does not match the difficulty map", () => {
    expectRejected(verifyOne(goldMcq, { xpReward: 15 }), "xp-map");
    expectRejected(verifyOne(goldTrueFalse, { xpReward: 25 }), "xp-map");
  });

  it("rejects MCQs without exactly 4 choices", () => {
    expectRejected(
      verifyOne(goldMcq, { choices: goldMcq.choices.slice(0, 3) }),
      "choices-contract",
    );
  });

  it("rejects true-false choices that are not exactly True/False", () => {
    expectRejected(
      verifyOne(goldTrueFalse, { choices: ["Yes", "No"], correctAnswer: "Yes" }),
      "choices-contract",
    );
  });

  it("rejects duplicate options after normalization", () => {
    expectRejected(
      verifyOne(goldMcq, {
        choices: ["The barber shaves himself", "the barber shaves himself ", "Nobody", "A"],
        correctAnswer: "Nobody",
      }),
      "choices-distinct",
    );
  });

  it("rejects an answer that differs from a choice only by case or spacing", () => {
    expectRejected(verifyOne(goldMcq, { correctAnswer: "nobody — the rule is self-contradictory" }), "answer-exact");
  });

  it("rejects an answer that matches no choice at all", () => {
    expectRejected(verifyOne(goldMcq, { correctAnswer: "The barber" }), "answer-exact");
  });

  it("rejects non-empty choices on type-answer", () => {
    expectRejected(
      verifyOne(goldTypeAnswer, { choices: ["312211", "312212"] }),
      "choices-contract",
    );
  });

  it("rejects acceptedAnswers outside 3–6 entries", () => {
    expectRejected(
      verifyOne(goldTypeAnswer, { acceptedAnswers: ["312,211"] }),
      "accepted-count",
    );
    expectRejected(
      verifyOne(goldTypeAnswer, {
        acceptedAnswers: ["a", "b", "c", "d", "e", "f", "g"],
      }),
      "accepted-count",
    );
  });

  it("rejects acceptedAnswers with no real variants", () => {
    expectRejected(
      verifyOne(goldTypeAnswer, { acceptedAnswers: ["312211", "312211 ", " 312211"] }),
      "accepted-distinct",
    );
  });

  it("rejects a riddle hint that is not 2–3 lines", () => {
    expectRejected(
      verifyOne(goldRiddle, { hintText: "Think about walking." }),
      "riddle-hint",
    );
  });

  it("rejects a riddle hint that reveals the answer", () => {
    expectRejected(
      verifyOne(goldRiddle, {
        hintText: "Think about walking.\nYou leave footsteps behind you.",
      }),
      "hint-reveals",
    );
  });

  it("rejects a title that spoils the answer", () => {
    expectRejected(verifyOne(goldRiddle, { title: "Footsteps Everywhere" }), "title-spoils");
  });

  it("rejects a one-word title", () => {
    expectRejected(verifyOne(goldMcq, { title: "Barber" }), "title-words");
  });

  it("rejects an empty question", () => {
    expectRejected(verifyOne(goldMcq, { question: "   " }), "question-empty");
  });

  it("rejects a question over 120 words", () => {
    const long = `${"word ".repeat(121).trim()}?`;
    expectRejected(verifyOne(goldMcq, { question: long }), "question-len");
  });

  it("rejects a non-array batch input", () => {
    const report = verifyBatch({ items: "nope" });
    expect(report.failedCount).toBe(0);
    expect(report.rejectHistogram["not-an-array"]).toBe(1);
  });
});

describe("forge verifier — banned content", () => {
  it("rejects odd-one-out with shapes", () => {
    expectRejected(
      verifyOne(goldMcq, {
        title: "Pick the Shape",
        question: "Which is the odd one out?",
        choices: ["Triangle", "Square", "Circle", "Rectangle"],
        correctAnswer: "Circle",
      }),
      "banned-shapes",
    );
  });

  it("rejects capital-city trivia", () => {
    expectRejected(
      verifyOne(goldMcq, {
        title: "Capitals",
        question: "What is the capital of France?",
        choices: ["Paris", "Lyon", "Marseille", "Nice"],
        correctAnswer: "Paris",
      }),
      "banned-capital",
    );
  });

  it("rejects pure arithmetic drills", () => {
    expectRejected(
      verifyOne(goldTypeAnswer, { title: "Quick Math", question: "What is 12 × 12?" }),
      "banned-arithmetic",
    );
  });

  it("rejects all/none-of-the-above options", () => {
    expectRejected(
      verifyOne(goldMcq, {
        choices: ["Entropy always decreases", "Entropy measures energy spreading", "All of the above", "Entropy is temperature"],
        correctAnswer: "Entropy measures energy spreading",
      }),
      "banned-above",
    );
  });

  it("rejects spelling tests outside riddles", () => {
    expectRejected(
      verifyOne(goldMcq, {
        title: "Spelling Check",
        question: "Which word is spelled correctly?",
        choices: ["Accommodate", "Acommodate", "Accomodate", "Acomodate"],
        correctAnswer: "Accommodate",
      }),
      "banned-spelling",
    );
  });
});

describe("forge verifier — duplicates", () => {
  it("rejects an exact duplicate question later in the batch", () => {
    const report = verifyBatch([goldMcq, { ...goldMcq, title: "A Different Title" }], { batchId: "t" });
    expect(report.items[0].passed).toBe(true);
    expect(report.items[1].rejects.some((r) => r.rule === "dup-question")).toBe(true);
  });

  it("rejects a near-duplicate question (Jaccard ≥ 0.6)", () => {
    const near = {
      ...goldMcq,
      title: "The Village Shaver",
      question: "In a village, the barber shaves exactly those men who do not shave themselves. So who shaves this barber?",
    };
    const report = verifyBatch([goldMcq, near], { batchId: "t" });
    expect(report.items[1].rejects.some((r) => r.rule === "dup-near")).toBe(true);
  });

  it("rejects the same answer twice in one category (same underlying fact)", () => {
    const report = verifyBatch(
      [
        goldMcq,
        {
          ...goldMcq,
          title: "Another Angle",
          question: "The barber rule in Russell's village is famous for what property?",
          choices: ["Nobody — the rule is self-contradictory", "It is decidable", "It proves God exists", "It has no answer anyone accepts"],
          correctAnswer: "Nobody — the rule is self-contradictory",
        },
      ],
      { batchId: "t" },
    );
    expect(report.items[1].rejects.some((r) => r.rule === "dup-answer")).toBe(true);
  });

  it("rejects a duplicate against the cross-batch registry", () => {
    const first = verifyBatch([goldMcq], { batchId: "batch-001" });
    const second = verifyBatch(
      [{ ...goldMcq, title: "Shaving Logic", choices: [...goldMcq.choices], question: `${goldMcq.question}` }],
      { batchId: "batch-002", registry: first.registry },
    );
    expect(second.items[0].rejects.some((r) => r.rule === "registry-dup")).toBe(true);
  });

  it("does not flag a batch against its own previous registry entries when re-run", () => {
    const first = verifyBatch([goldMcq], { batchId: "batch-001" });
    const rerun = verifyBatch([goldMcq], { batchId: "batch-001", registry: first.registry });
    expect(rerun.items[0].rejects.some((r) => r.rule === "registry-dup")).toBe(false);
  });

  it("exempts true-false from answer-duplicate checks", () => {
    const report = verifyBatch(
      [goldTrueFalse, { ...goldTrueFalse, title: "Another Truth", question: "Light speed is the universe's speed limit, and nothing with mass can reach it." }],
      { batchId: "t" },
    );
    expect(report.items[1].rejects.some((r) => r.rule === "dup-answer")).toBe(false);
  });
});

describe("forge verifier — quality warnings and scoring", () => {
  it("warns when the correct option is a length outlier", () => {
    const report = verifyOne(goldMcq, {
      choices: ["Go home", "Wait here", "Nobody — the rule is self-contradictory and cannot hold in any village ever built", "Ask again"],
      correctAnswer: "Nobody — the rule is self-contradictory and cannot hold in any village ever built",
    });
    expect(report.items[0].warns.some((w) => w.rule === "correct-outlier")).toBe(true);
  });

  it("warns on a lexical giveaway between stem and correct option", () => {
    const report = verifyOne(goldMcq, {
      title: "Kitchen Logic",
      question: "Which option mentions a fridge explicitly?",
      choices: ["A cold fridge", "An oven", "A toaster", "A kettle"],
      correctAnswer: "A cold fridge",
      correctExplanation: "Yes — the fridge is the only cold option.",
      incorrectExplanation: "The answer is a cold fridge. 'Fridge' appears in the question and in this option alone, which is exactly the kind of giveaway that lets players answer without thinking.",
    });
    expect(report.items[0].warns.some((w) => w.rule === "lexical-giveaway")).toBe(true);
  });

  it("warns when the incorrect explanation never states the answer", () => {
    const report = verifyOne(goldMcq, {
      incorrectExplanation: "Think again about who the rule covers. Consider each case one by one. The contradiction appears quickly.",
    });
    expect(report.items[0].warns.some((w) => w.rule === "exp-answer")).toBe(true);
  });

  it("fails an item that trips more than three warnings", () => {
    const longQuestion = `${"You are walking through a village of logicians while thinking about shaving rules and barbers and contradictions ".repeat(4).trim()}?`;
    const report = verifyOne(goldRiddle, {
      title: "Five Word Title Right Here",
      question: longQuestion,
      hintText: "Think about movement, not objects.\nIt's something you 'take' with your body.\nYou leave them behind you as you walk when you move about through the world and time passes and the journey continues onward forever.",
      incorrectExplanation: "Think about the wording once more. Consider the double meaning. The reveal follows the same path every time.",
    });
    expect(report.items[0].passed).toBe(false);
    expect(report.items[0].rejects).toHaveLength(0);
    expect(report.items[0].score).toBe(68);
  });

  it("scores clean items 100 and deducts 8 per warning", () => {
    expect(verifyOne(goldMcq).items[0].score).toBe(100);
    const report = verifyOne(goldMcq, {
      incorrectExplanation: "Think again about who the rule covers. Consider each case one by one. The contradiction appears quickly.",
    });
    expect(report.items[0].score).toBe(92);
  });

  it("tracks the MCQ correct-position distribution", () => {
    const report = verifyBatch([goldMcq, goldMcq, goldMcq], { batchId: "t" });
    expect(report.positionDistribution["3"]).toBe(3);
  });
});

describe("forge verifier — lesson contract", () => {
  it("rejects a strict item without lessonGroup", () => {
    const { lessonGroup: _drop, ...rest } = goldMcq;
    expectRejected(verifyOne(rest), "lesson-group-required");
  });

  it("rejects a lessonGroup that is not in the category's curriculum", () => {
    expectRejected(verifyOne(goldMcq, { lessonGroup: "Quantum Café" }), "lesson-group-unknown");
    expectRejected(verifyOne(goldRiddle, { lessonGroup: "Think Straight" }), "lesson-group-unknown");
  });

  it("accepts a lessonGroup from the category's curriculum", () => {
    const report = verifyOne(goldMcq, { lessonGroup: "Think Straight" });
    expect(report.items[0].rejects).toHaveLength(0);
  });

  it("legacy mode downgrades lessonGroup problems to warnings", () => {
    const missing = verifyBatch([{ ...goldMcq, lessonGroup: undefined }], { batchId: "t", mode: "legacy" });
    expect(missing.items[0].rejects).toHaveLength(0);
    expect(missing.items[0].warns.some((w) => w.rule === "lesson-group-required")).toBe(true);

    const unknown = verifyBatch([{ ...goldMcq, lessonGroup: "Nonsense Group" }], { batchId: "t", mode: "legacy" });
    expect(unknown.items[0].rejects).toHaveLength(0);
    expect(unknown.items[0].warns.some((w) => w.rule === "lesson-group-unknown")).toBe(true);
  });

  it("exempts short type-answer physics words from the lesson-reveals check", () => {
    const report = verifyOne({
      type: "type-answer",
      category: "science",
      difficulty: "easy",
      title: "The Sun's True Colour",
      question: "Seen from space, without air to scatter it, what colour is the Sun?",
      choices: [],
      correctAnswer: "White",
      acceptedAnswers: ["White", "white", "Pure white", "It is white", "Whitish"],
      xpReward: 10,
      lessonGroup: "Physics Fun",
      correctExplanation: "Right — the Sun is white; Earth's air paints it yellow.",
      incorrectExplanation: "The answer is white. From orbit the Sun is a white star; our atmosphere scatters blue away on its long path, leaving the yellow cast we know. Astronauts see the truth without the filter.",
      lessonContent:
        "Star colours encode temperature — white sits mid-table between cool red and hot blue.\nScattering thickens near the horizon, which is why sunsets run red.\nThe noon Sun looks whiter than the evening one for the same reason.\nAstronauts get the unfiltered view and report it plainly.\nShare this: squint at the noon sky and note how close to white the disc looks.",
    });
    expect(report.items[0].warns.some((w) => w.rule === "lesson-reveals")).toBe(false);
    expect(report.items[0].rejects).toHaveLength(0);
  });

  it("keeps long type-answer phrases fully protected from lesson reveals", () => {
    expectRejected(
      verifyOne({
        type: "type-answer",
        category: "logic",
        difficulty: "medium",
        title: "The Operating Room",
        question:
          "A father and his son are in a car crash. The father dies instantly. The son is rushed to hospital, and the surgeon gasps: 'I can't operate on this boy — he's my son.' How is that possible?",
        choices: [],
        correctAnswer: "The surgeon is his mother",
        acceptedAnswers: [
          "The surgeon is his mother",
          "The surgeon is the boy's mother",
          "His mother",
          "The mother",
          "The surgeon is a woman",
        ],
        xpReward: 25,
        lessonGroup: "Lateral Leaps",
        correctExplanation: "Exactly — the surgeon is the boy's mother. The riddle hides a stereotype in plain sight.",
        incorrectExplanation:
          "The answer is: the surgeon is his mother. Nothing in the story says surgeons are men — the assumption was smuggled in by your own expectations. Reread it and the gasp evaporates.",
        lessonContent:
          "Job titles quietly absorb stereotypes — the assumption rides in with the role.\nPsychologists call it schema-driven reading: we fill gaps with cultural defaults.\nHere the surgeon is his mother, and rereading shows it plainly.\nNaming your default aloud before answering is the core lateral drill.\nShare this: retell this classic to someone tonight and watch how long the stereotype holds.",
      }),
      "lesson-reveals",
    );
  });

  it("rejects a strict item without lessonContent", () => {
    const { lessonContent: _drop, ...rest } = goldMcq;
    expectRejected(verifyOne(rest), "lesson-required");
  });

  it("rejects a lesson that states this question's answer", () => {
    expectRejected(
      verifyOne(goldMcq, {
        lessonContent:
          "Modus ponens is the fire-starter of logic.\nIf a rule's trigger fires, its consequence must fire.\nIn this village the conclusion is nobody — the rule is self-contradictory, so no one fits.\nConditional rules apply without exceptions.\nShare this: next time a policy says if X then Y, trace it aloud.",
      }),
      "lesson-reveals",
    );
  });

  it("flags a malformed lesson shape as warnings, not rejects", () => {
    const report = verifyOne(goldMcq, {
      lessonContent:
        "Modus ponens affirms the antecedent.\nThe consequence must follow once the trigger holds.\nShare this: trace one if-then rule today.",
    });
    expect(report.items[0].passed).toBe(true);
    expect(report.items[0].warns.some((w) => w.rule === "lesson-shape")).toBe(true);
    expect(report.items[0].score).toBeLessThan(100);
  });

  it("exempts true-false answers from the lesson-reveals check", () => {
    const report = verifyOne(goldTrueFalse, {
      lessonContent:
        "It is true that entanglement correlations are experimentally settled science.\nBell tests since the 1970s have closed the loopholes one by one.\nThe randomness at each end blocks any messaging use.\nHeadlines overstate what the effect permits.\nShare this: ask someone what entanglement cannot do.",
    });
    expect(report.items[0].rejects).toHaveLength(0);
    expect(report.items[0].warns.some((w) => w.rule === "lesson-reveals")).toBe(false);
  });

  it("exempts short numeric answers from the lesson-reveals check", () => {
    const report = verifyOne(goldTypeAnswer, {
      lessonContent:
        "Sequences reward reading aloud before calculating.\nThe look-and-say family turns description into the next term.\nConway studied the growth constant of this exact family.\nMany interview classics hide one verbal twist.\nShare this: describe 21 aloud and write what you heard.",
    });
    expect(report.items[0].warns.some((w) => w.rule === "lesson-reveals")).toBe(false);
  });

  it("legacy mode downgrades lesson-required and lesson-reveals to warnings", () => {
    const missing = verifyBatch(
      [{ ...goldMcq, lessonContent: undefined }],
      { batchId: "t", mode: "legacy" },
    );
    expect(missing.items[0].rejects).toHaveLength(0);
    expect(missing.items[0].warns.some((w) => w.rule === "lesson-required")).toBe(true);

    const leaking = verifyBatch(
      [
        {
          ...goldMcq,
          lessonContent:
            "Modus ponens basics.\nRules fire unconditionally.\nHere the conclusion is nobody — the rule is self-contradictory.\nConditional rules have no exceptions.\nShare this: trace one if-then rule today.",
        },
      ],
      { batchId: "t", mode: "legacy" },
    );
    expect(leaking.items[0].rejects).toHaveLength(0);
    expect(leaking.items[0].warns.some((w) => w.rule === "lesson-reveals")).toBe(true);
  });
});

describe("forge verifier — legacy calibration guard", () => {
  it("retro-runs the existing seed bank with zero structural rejects", () => {
    const forgeTypes = new Set(["multiple-choice", "true-false", "type-answer", "riddle"]);
    const legacyItems = seedData.puzzles
      .filter((p) => forgeTypes.has(p.type))
      .map((p) => ({ ...p, choices: p.choices ?? [] }));
    const report = verifyBatch(legacyItems, { batchId: "legacy-seeds", mode: "legacy" });
    const failed = report.items.filter((i) => i.rejects.length > 0);
    if (failed.length > 0) {
      const detail = failed
        .map((f) => `#${f.index + 1} ${f.title}: ${f.rejects.map((r) => `${r.rule} (${r.message})`).join("; ")}`)
        .join("\n");
      throw new Error(`Verifier produced false rejects on the legacy seed bank:\n${detail}`);
    }
    expect(report.total).toBeGreaterThan(60);
  });
});
