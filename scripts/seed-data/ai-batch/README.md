# BrainBloom Forge — AI batch pipeline

Turns AI-drafted questions (`MASTER_PROMPT.md` + `BATCH_PLAN.md`) into
machine-verified, human-reviewable draft puzzles. **No AI runs here** — this is
the deterministic receiving end. Nothing it produces ever reaches players
directly; validated output is imported as `draft` puzzles that still go through
the existing Studio review flow.

## The loop (one batch ≈ 10 minutes)

1. **Generate.** Copy `MASTER_PROMPT.md` into your AI model, fill the BATCH
   PARAMETERS block from `BATCH_PLAN.md` (one slice per batch), and send.
2. **Save.** Paste the model's raw JSON array — unedited, rejects included —
   into `output/batch-NNN.json` (001–200 per the plan).
3. **Verify.**
   ```bash
   npm run forge:verify -- output/batch-001.json
   # or: node scripts/seed-data/ai-batch/verify-batch.mjs output/batch-001.json
   # or everything at once: npm run forge:verify -- --all
   ```
4. **Read.** `output/reports/batch-001.report.md` lists every reject with its
   reason, every pass with its warnings and score. Passing items land in
   `output/validated/batch-001.validated.json` (only passers, import metadata
   attached).
5. **QC.** Follow the cadence in `BATCH_PLAN.md`:
   - first batch of each category → read all 25 items yourself,
   - every 10 batches → spot-check 10 random items,
   - **>20% reject rate → the CLI prints a STOP LINE warning. Stop, adjust the
     slice or the prompt. Never push through.**

## What the verifier checks

`lib/forge/verify.ts` (pure functions, fully unit-tested in
`lib/forge/verify.test.ts`):

| Class | Rules |
|---|---|
| Contract | exact field set per type, enums, `xpReward` = 10/25/50 by difficulty, MCQ = 4 choices, TF = exactly `["True","False"]`, TA/riddle = 3–6 accepted variants + 2–3 progressive riddle hint lines, **lesson required**: 4–6 points teaching the type of thinking, ending `Share this:` |
| Fairness | answer must match a choice **character-for-character**, options distinct after normalization, hint must not reveal the answer, title must not spoil the answer, lesson must not state the answer, one-question-per-fact inside a batch **and across batches** (`.registry.json`, re-runs of the same batch are safe) |
| Banned | shape odd-one-out, capital trivia, arithmetic drills, All/None-of-the-above, spelling tests |
| Quality (warnings, ≤3 allowed) | option-length outliers, lexical giveaways between stem and correct option, first-word pattern giveaways, over-long questions/hints, explanations that don't reveal the answer, missing `Share this:` line in lessonContent |

Score = 100 − 8×warnings; rejects fail outright. The retro-run test
(`legacy calibration guard`) keeps the verifier honest against all 68 existing
hand-written forge-type seeds — any future rule change that would false-reject
known-good content fails CI instead of silently shipping.

## Files

```
MASTER_PROMPT.md      copy-paste prompt for the AI model
BATCH_PLAN.md         the 200-batch road to 5,000 questions
verify-batch.mjs      the CLI (run it, don't edit it)
output/
  batch-NNN.json      ← you paste model output here
  reports/            ← human-readable verdicts appear here
  validated/          ← passing items, ready for future Studio import
  .registry.json      cross-batch duplicate memory (gitignored)
lib/forge/verify.ts   the rule engine (also the future Studio import path)
lib/forge/verify.test.ts  its test suite (71 assertions)
```

## Importing into the platform

Validated files carry `intendedImport: { createdBy: "ai-forge", reviewStatus:
"draft", published: false }`. The Firestore import step (Studio "Forge" tab)
is the next phase; until then validated JSON is the canonical hand-off format.
