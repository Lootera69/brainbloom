# Forge report — batch-000-demo

- Mode: strict
- Items: 9 → **3 passed**, **6 failed** (67% reject rate — ⚠️ ABOVE THE 20% STOP LINE)
- MCQ correct-position distribution → 1: 1   2: 1   3: 3
- Reject reasons: lesson-required ×6, lesson-group-required ×6, answer-exact ×1, banned-shapes ×1, dup-question ×1, dup-near ×1, unknown-field ×1, xp-map ×1, banned-above ×1, banned-arithmetic ×1

## Rejected

### #4 Giant of the System — REJECTED
- [answer-exact] correctAnswer must match a choice character-for-character — "jupiter" differs only by case/spacing from "Jupiter".
- [lesson-required] lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.
- [lesson-group-required] lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.

### #5 Pick the Shape — REJECTED
- [lesson-required] lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.
- [lesson-group-required] lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.
- [banned-shapes] Odd-one-out with basic shapes is kids' worksheet material — banned.

### #6 The Village Shaver — REJECTED
- [lesson-required] lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.
- [lesson-group-required] lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.
- [dup-question] Question duplicates item #1 of this batch.
- [dup-near] Question is a near-duplicate of item #1 of this batch.
- (option-spread) Option lengths vary 7–27 chars — one option stands out.

### #7 The Echo Riddle — REJECTED
- [unknown-field] Field "hintText" is not part of the multiple-choice contract.
- [lesson-required] lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.
- [lesson-group-required] lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.

### #8 Mixing Gases — REJECTED
- [xp-map] xpReward must be 25 for medium — got 10.
- [lesson-required] lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.
- [lesson-group-required] lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.
- [banned-above] "All of the above" — All/None-of-the-above options are banned.
- (exp-answer) incorrectExplanation never states the answer — the contract requires it to reveal the answer.
- (option-spread) Option lengths vary 16–43 chars — one option stands out.

### #9 Simple Multiplication — REJECTED
- [lesson-required] lessonContent is required — 4–6 lesson points teaching the type of thinking, ending with a 'Share this:' action.
- [lesson-group-required] lessonGroup is required — pick a curriculum group from lib/forge/curriculum.ts for this category.
- [banned-arithmetic] Pure arithmetic drill — banned.

## Passed with warnings

### #1 The Barber's Dilemma — score 92
- (exp-answer) incorrectExplanation never states the answer — the contract requires it to reveal the answer.

## Clean passes (2)

- #2 Quantum Spookiness — score 100
- #3 The More You Take — score 100
