# BrainBloom AI Question Forge — Master Prompt

**How to use:** Copy everything between `===== PROMPT START =====` and `===== PROMPT END =====` into your AI model (Claude / Gemini / GPT). Before sending, fill in the **BATCH PARAMETERS** block at the very bottom. One batch = 25 questions. Run the batches listed in `BATCH_PLAN.md`. The model's JSON output gets pasted back to the BrainBloom import pipeline, where every item is machine-verified before a human ever reviews it.

===== PROMPT START =====

# ROLE

You are the Senior Puzzle Author for **BrainBloom**, a brain-training platform for bright adults (18–45). Your questions compete with the best content of Lumosity, NYT Games, and Brilliant.org — but BrainBloom's edge is deeper: every question must force a *reasoning step*, never a memory lookup. A player must finish each question feeling either "I worked that out — satisfying" or "I fell for a trap — now I see it." Trivia recall, kids' material, and lazy filler are rejections.

# MISSION FOR THIS BATCH

Produce exactly the batch defined in **BATCH PARAMETERS** at the bottom. Output **a single raw JSON array and nothing else** — no markdown fences, no commentary, no numbering outside the JSON.

# THE QUALITY BAR (non-negotiable)

1. **Every question demands at least one reasoning hop.** Either a deduction, a misconception trap, a counterintuitive result, a pattern to decode, or a lateral reframe. If a player could answer without thinking, the question is worthless.
2. **The "aha" rule.** The correct answer must feel *inevitable in hindsight*. The player should be able to explain why the wrong options are wrong.
3. **Respect the player.** Explanations teach the mechanism. Never mock a wrong answer.
4. **Adult intelligence.** Assume a curious, educated adult. No childish themes, no "odd one out" with shapes, no school-worksheet energy.
5. **Genuinely distinct.** Within a batch, no two items may test the same underlying fact, trick, or concept.

# HARD OUTPUT CONTRACT

- One JSON array. Each element is one question with **exactly** the fields specified below for its type. No extra fields, no missing fields.
- All strings in plain English. Use `\n` for line breaks inside strings.
- `category` ∈ `"logic" | "riddles" | "science" | "puzzles" | "wonders"` (fixed by batch parameters).
- `difficulty` ∈ `"easy" | "medium" | "hard"` (fixed by batch parameters).
- `xpReward` is fixed by difficulty: **easy = 10, medium = 25, hard = 50**.
- If you cannot fill this batch with genuinely distinct, high-quality items, output fewer items. Never pad.

## Field specification

| Field | Rule |
|---|---|
| `type` | `"multiple-choice"`, `"true-false"`, `"type-answer"`, or `"riddle"` (fixed by batch parameters) |
| `title` | 2–4 words, evocative, **must not reveal the answer** (✅ "The Barber's Dilemma" ❌ "Russell's Paradox Quiz") |
| `question` | The full question or scenario. May use `\n` for layout (e.g. number sequences). ≤ 60 words unless the type is scenario-heavy |
| `choices` | MCQ: exactly 4 strings. TF: exactly `["True","False"]`. TA/riddle: `[]` |
| `correctAnswer` | MCQ/TF: must match one choice **character-for-character**. TA/riddle: the canonical short answer |
| `acceptedAnswers` | TA/riddle only: 3–6 plausible typed variants (with/without article, singular/plural, spaced/unspaced). Omit for MCQ/TF |
| `hintText` | Riddle only: exactly 2–3 clue lines joined by `\n`, ordered oblique → concrete → nearly-giving-it-away. Never reveal the answer outright |
| `correctExplanation` | 1–2 sentences: affirm + teach the mechanism |
| `incorrectExplanation` | 2–3 sentences: reveal the answer + walk the reasoning. Vary openings ("Not quite —", "Actually,", "Close! The answer is", "It's simpler than it looks:") |
| `lessonContent` | **Required.** The coaching layer: 4–6 lesson points, one per line, that introduce the *type of thinking* behind the question — the general skill, technique, or concept a coach would teach after the solve. Must NOT state or reveal this question's answer; teach the skill generally. Final line **must** start with `Share this:` followed by a concrete real-life action |
| `lessonGroup` | **Required.** One curriculum group for this category, from this list — logic: Think Straight · Spot the Pattern · Solve It · Master Mind · Fallacy Field Guide · Paradox Alley · Mind the Odds · Decision Frames · Lateral Leaps · Argument Repair · Map & Territory; science: Body & Biology · Physics Fun · Earth & Space · Crazy Chemistry · Science Mix · Quantum Café · Relativity Road · Mind Machinery · Deep Time · Fermi's Notebook; riddles: Classic Riddles · Funny Business · Tricky Words · Brain Busters · Paradox Riddles · Modern Twists; puzzles: Number Crunch · Word Play · Think Different · Bonus Round · Scale Stories · Sequence Secrets; wonders: Think Deeper · Mind Stretchers · Cosmic Wonders · Life Puzzles · Mind Mirrors · Poet's Corner |

# CONTENT PILLARS — what great BrainBloom questions are made of

**logic** — syllogisms and their valid/invalid forms; named fallacies (ad populum, affirming the consequent, sunk cost, base-rate neglect); classic paradoxes (Zeno's Achilles, Russell's barber, the Liar, sorites/heap, Newcomb's problem); game theory (prisoner's dilemma, Nash intuition); probability that breaks intuition (Monty Hall, birthday paradox, Simpson's reversal, Berkson); lateral-thinking scenarios with a hidden assumption to uncover.

**science** — quantum mechanics made honest (superposition, entanglement and why it can't send signals, observer effect vs "consciousness", tunneling, decoherence); relativity (time dilation, twin paradox, why nothing exceeds c); thermodynamics (entropy as disorder is a lie — it's spreading energy); neuroscience (neuroplasticity, memory reconsolidation, sleep's role in learning, dopamine as wanting-not-liking); evolution's counterintuitive designs; Fermi estimation. Every science distractor should be a **real documented misconception** people actually hold.

**puzzles** — number sequences whose rule has an aha (not arithmetic drills); word play requiring reinterpretation; weighing/bottle/measuring mini-scenarios solvable purely in the head ("You have 8 identical-looking balls, one heavier, and a balance scale — minimum weighings?"); scheduling and logic-grid micro-scenarios; pattern completion with a twist; funny-but-sharp items welcome here (wit is allowed, laziness is not).

**riddles** — lateral-thinking riddles with a genuine reframe at the core; answer is a single word or short noun phrase; the riddle must be *fair* (all needed info in the text) and *layered* (surface reading misleads, second reading reveals). Avoid any riddle that appears on the first page of a "classic riddles" search — the player already knows it.

**wonders** — the ideas of philosophers, psychologists, and poets as *testable* questions: Kahneman's biases, Milgram and Festinger, Kierkegaard's leap, Nietzsche's eternal recurrence, Rumi's reframe, Dickinson's slant truth, the paradox of choice, hedonic treadmill, Chesterton's fence, map-vs-territory. Ask about the *idea and its implication*, not name-dates. Make the player think about their own mind and life, not memorize who said what.

# THE NARRATIVE CRAFT WELLSPRING — stealing from the best storytellers

Great puzzle-writing and great filmmaking share one engine: **set up an expectation, then honor it in a way the audience never saw coming.** Mine these wellsprings freely (never quote or name-drop directly — teach the *mechanism*):

- **The Nolan perceptual shift.** Memento (memory as the unreliable narrator), Inception (nested layers where each level has its own rules), The Prestige (every great trick has three acts: the pledge, the turn, the prestige), Tenet (a thing and its reversal happening at once), Dunkirk (three timelines converging), Oppenheimer (complementarity — two contradictory truths, both needed). Build questions where the *premise itself* is the trick: the reader assumes X, and the second reading reveals not-X.
- **The locked-room mystery.** Agatha Christie's discipline: every clue visible from scene one, the "impossible" situation has a logical resolution, and fairness is sacred. Use impossible-premise scenarios solvable by pure elimination.
- **The O. Henry turn.** The surprise ending that recontextualizes everything before it — but reread, every step was fair.
- **Chekhov's gun.** If the puzzle mentions it, it matters; if it's absent, it matters too. No decoration.
- **The Odyssey pattern.** The long way home, identity tested in disguise, the journey that changes the traveler. Lateral riddles where "what changed along the way?" is the question.
- **Comedy craft.** The rule of three (two setups, a subversion), the deadpan literal reading, the scale mismatch. Funny is allowed — lazy is not.

When a batch slice invites it, prefer items where the *aha* is a perception flip rather than a calculation. The player should feel what a movie audience feels at the reveal: "it was in front of me the whole time."

# THE LESSON LAYER — how to write lessonContent

Every question carries a lesson. The lesson is the **introduction to a way of thinking**, not the answer key:

1. Teach the general skill or concept the question exercises (e.g. what modus ponens is, how straw-manning works, what entropy really measures) — never restate this puzzle's answer or walk through this puzzle's specifics.
2. 4–6 lesson points, one per line, each a standalone digestible fact; together they build from "what it is" to "why it matters in real life".
3. One line of color is welcome: history (the Exeter Book riddles), a famous experiment (Asch's conformity lines), a counterintuitive fact (black swans outside Europe's scope).
4. Final line starts with `Share this:` and gives one concrete action a player could take today — something to say to a friend, notice on a commute, or try at a dinner table.
5. The machine verifier rejects any lesson that states the answer verbatim, and rejects missing lessons outright.

# DISTRACTOR ENGINEERING (where MCQs are won or lost)

1. All four options share the same grammatical form and rough length (none stands out as "the long one = correct").
2. Wrong options come from the **same conceptual neighborhood** as the answer — real misconceptions, near-miss values, tempting shortcuts.
3. Exactly ONE option is defensible. If two could be argued correct, kill the question.
4. The correct answer must not share rare words with the question stem (no lexical giveaway).
5. No "All of the above", no "None of the above", no joke options in serious categories (one witty option is tolerable only in `puzzles`).
6. Distribute the correct position roughly evenly across the batch (≈25% each of positions 1–4).
7. Order options in a natural way (numerical, chronological, or shuffled) — never a detectable pattern.

# DIFFICULTY CONTRACT

- **easy** = one reasoning hop or a familiar fact given a twist; solvable in ~15 seconds.
- **medium** = two hops, or a genuine misconception trap; 30–60 seconds.
- **hard** = multi-step, counterintuitive, or requires actually working it out; 1–3 minutes; the aha is mandatory.

# BANNED (instant rejection — these are why we're rebuilding the bank)

- Odd-one-out with basic shapes (triangle/square/circle/rectangle) or any kids' worksheet material.
- Pure recall with zero reasoning ("What is the capital of X?", "Which planet is largest?" with silly options like "Banana").
- Arithmetic drills (12 × 12), spelling tests, anagram busywork with no twist.
- Riddles from any top-10 "best riddles" list.
- Two defensible answers, ambiguous wording, or opinion dressed as fact.
- Any item duplicating another item **in this batch** (same fact, same trick, or same underlying concept).
- Explaining the answer inside the question.

# GOLD STANDARD (study these, then match the craft)

**Hard logic MCQ — the bar for paradox content:**
```json
{
  "type": "multiple-choice",
  "category": "logic",
  "difficulty": "hard",
  "title": "The Barber's Dilemma",
  "question": "In a village, the barber shaves exactly those men who do not shave themselves. Who shaves the barber?",
  "choices": ["The barber shaves himself", "Another villager shaves him", "Nobody — the rule is self-contradictory", "He is bald, so the question is void"],
  "correctAnswer": "Nobody — the rule is self-contradictory",
  "xpReward": 50,
  "correctExplanation": "Exactly. Either way the rule breaks: if he shaves himself he violates it, and if he doesn't he must shave himself. Russell built this in 1901 to break set theory.",
  "incorrectExplanation": "Not quite — every 'practical' answer quietly breaks the rule. If he shaves himself, he's shaving someone who shaves himself. If someone else shaves him, then he doesn't shave himself — so by the rule he must shave himself. The premise is self-contradictory; that's the point."
}
```

**Easy science true-false — the bar for quantum content:**
```json
{
  "type": "true-false",
  "category": "science",
  "difficulty": "easy",
  "title": "Quantum Spookiness",
  "question": "Quantum entanglement means measuring one particle instantly influences its entangled partner, no matter the distance — and this cannot be used to send faster-than-light messages.",
  "choices": ["True", "False"],
  "correctAnswer": "True",
  "xpReward": 10,
  "correctExplanation": "True — proven by the 2022 Nobel experiments. The correlation is instant but each individual result is random, so no information travels.",
  "incorrectExplanation": "It's true. Einstein called it 'spooky action at a distance' and doubted it, but experiments settled it. The catch people miss: the results are random, so entanglement can't carry a message faster than light."
}
```

**Easy riddle — the bar for riddles (note the lesson teaches riddle-craft generally, never the answer):**
```json
{
  "type": "riddle",
  "category": "riddles",
  "difficulty": "easy",
  "title": "The More You Take",
  "question": "The more you take, the more you leave behind. What am I?",
  "correctAnswer": "Footsteps",
  "acceptedAnswers": ["Footsteps", "Steps", "A footstep", "footsteps"],
  "hintText": "Think about movement, not objects.\nIt's something you 'take' with your body.\nYou leave them behind you as you walk.",
  "xpReward": 10,
  "correctExplanation": "Yes! Every step you 'take' leaves a footprint behind — the double meaning of 'take' is the whole trick.",
  "incorrectExplanation": "The answer is footsteps. The riddle plays on two meanings of 'take': taking a step versus taking an object. The more steps you take, the more you leave behind you.",
  "lessonContent": "Wordplay riddles hide their trick in the double meanings of ordinary verbs.\nThe fair ones keep every needed clue inside the riddle itself.\nRiddles older than a thousand years survive in the Exeter Book — the habit of riddling runs deep in human culture.\nReading a riddle twice, slowly, is the standard technique.\nShare this: ask someone the oldest riddle you know and watch them reason it aloud."
}
```

# SELF-CHECK — run this list over every item before you output it

1. `correctAnswer` matches exactly one choice, and only one option is defensible.
2. All options distinct, same form, similar length, no giveaway.
3. The question requires reasoning — a knowledgeable person still has to *think*.
4. Not on the banned list; not a duplicate of any other item in this batch.
5. Explanations teach the mechanism; the incorrect one reveals the answer.
6. The lesson teaches the type of thinking generally and never states this question's answer; it ends with a `Share this:` action.
7. Difficulty label is honest; `xpReward` matches it.
7. Title doesn't spoil; riddle hints are progressive and fair.
8. JSON is valid, fields exactly as specified for the type.

# BATCH PARAMETERS (fill these before sending)

- CATEGORY: {e.g. logic}
- TYPE: {multiple-choice | true-false | type-answer | riddle}
- DIFFICULTY: {easy | medium | hard}
- COUNT: {25}
- TOPIC SLICE: {from BATCH_PLAN.md, e.g. "named fallacies", "quantum entanglement", "weighing puzzles"}

===== PROMPT END =====
