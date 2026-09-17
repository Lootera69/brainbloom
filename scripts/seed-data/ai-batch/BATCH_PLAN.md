# BrainBloom AI Question Forge — Batch Plan (5,000 questions)

One batch = 25 questions = one run of `MASTER_PROMPT.md` with the BATCH PARAMETERS filled in.
200 batches total. Save each model output as `scripts/seed-data/ai-batch/output/batch-NNN.json`
(zero-padded, numbered in the order you run them). Every file is machine-verified on import;
bad items are rejected with reasons — do not hand-edit model output before saving.

## Difficulty rule

Per cell, difficulty batches are pre-counted below. Run them in an interleaved order
(e.g. E, M, M, H, E, M, M, H … following the counts) so quality fatigue never clusters
on one difficulty.

## The matrix

| # | Category | Type | Total | Batches | E / M / H batches |
|---|----------|------|-------|---------|--------------------|
| 1 | logic | multiple-choice | 600 | 24 | 6 / 11 / 7 |
| 2 | logic | true-false | 300 | 12 | 3 / 5 / 4 |
| 3 | logic | type-answer | 300 | 12 | 3 / 5 / 4 |
| 4 | science | multiple-choice | 600 | 24 | 6 / 11 / 7 |
| 5 | science | true-false | 300 | 12 | 3 / 5 / 4 |
| 6 | science | type-answer | 300 | 12 | 3 / 5 / 4 |
| 7 | puzzles | multiple-choice | 450 | 18 | 5 / 8 / 5 |
| 8 | puzzles | type-answer | 450 | 18 | 5 / 8 / 5 |
| 9 | riddles | riddle | 600 | 24 | 6 / 11 / 7 |
| 10 | wonders | multiple-choice | 500 | 20 | 5 / 9 / 6 |
| 11 | wonders | true-false | 300 | 12 | 3 / 5 / 4 |
| 12 | wonders | type-answer | 300 | 12 | 3 / 5 / 4 |
| | | **Total** | **5,000** | **200** | |

Not in this program (stays hand-made, per platform decisions): `cipher`, `wonder`, `story`,
`crossword`, `sudoku`.

## Topic slices

Each batch's TOPIC SLICE comes from its category's list, **in order, no reuse until the
list is exhausted** (then continue with fresh slices you invent — same depth bar).
This is what guarantees 200 batches never duplicate each other.

**logic (24 slices):** syllogisms & valid inference · named fallacies I (ad populum, ad hominem, straw man) · named fallacies II (affirming the consequent, false dilemma, slippery slope) · Zeno's paradoxes · Russell & self-reference · sorites & vagueness · Newcomb's problem & decision theory · prisoner's dilemma · Nash equilibrium intuitions · Monty Hall · birthday paradox · Simpson's & Berkson's paradox · base-rate neglect · sunk cost & escalation · lateral scenarios I · lateral scenarios II · hidden assumptions · conditional logic traps · set/Venn reasoning · analogical traps · Occam & inference to best explanation · map-vs-territory thinking errors · planning fallacy & forecasting · adversarial thinking

**science (24 slices):** quantum superposition · quantum entanglement · observer effect & measurement · quantum tunneling · decoherence & the classical world · time dilation · twin paradox · why nothing beats light speed · gravity as curvature · entropy (energy spreading, not "disorder") · second-law misconceptions · neuroplasticity · memory & sleep consolidation · dopamine: wanting vs liking · attention & inattentional blindness · famous replications & their failures · evolution's counterintuitive designs · evolutionary mismatch · Fermi estimation I · Fermi estimation II · orders of magnitude & scale · immunity misconceptions · genetics vs epigenetics · physics of everyday surprises

**puzzles (20 slices):** sequence aha I · sequence aha II · weighing puzzles I (find the odd ball) · weighing puzzles II · measuring & pouring · river-crossing variants · logic-grid micro-scenarios · scheduling conflicts · double-meaning word play · letter & word properties · divisibility & number tricks · clock & calendar puzzles · age puzzles · probability micro-traps · expectation & gambling traps · spatial reasoning in words · matchstick-style arithmetic · patterns with red herrings · light cryptarithms · funny estimation puzzles

**riddles (16 slices, reuse once for 24 batches at different difficulties):** paradox riddles · self-referential riddles · double-meaning riddles · letter/word property riddles · light & shadow riddles · time riddles · sound & silence riddles · everyday-object reframes · nature reframes · abstract-concept riddles · layered "what am I" · lateral mini-mysteries · riddles about thinking itself · knowledge & secrets · lesser-known classics (public domain, >100 years old) · original modern constructions

**wonders (20 slices):** Kahneman's two systems · cognitive biases I (anchoring, availability, framing) · cognitive biases II (confirmation, halo, Dunning-Kruger) · Milgram & obedience · Festinger & cognitive dissonance · Kierkegaard's leap · Nietzsche: eternal recurrence & amor fati · Stoic dichotomy of control · Buddhist impermanence & attachment · Rumi's reframes · Dickinson's "slant" truth · Camus & the absurd · Sartre & bad faith · Frankl's meaning · Csikszentmihalyi's flow · hedonic treadmill · paradox of choice · Chesterton's fence · identity persistence · attention as reality construction

## Quality-control cadence (human, mandatory)

1. **First batch of each category:** you read all 25 items personally before running the rest.
2. **Every 10 batches:** spot-check 10 random items. Reject rate > 20% → stop, tell the pipeline, adjust the slice or the prompt — never "push through".
3. **Never** edit a model item into acceptability by hand — reject it; the lesson feeds the next training round of the engine.

## What happens to the files

`output/batch-NNN.json` → import pipeline (verifier) → passers become `draft` puzzles in
Studio tagged `createdBy: ai-forge` → your existing review flow (draft → approved) →
published to players. Nothing reaches players without a human Approve.
