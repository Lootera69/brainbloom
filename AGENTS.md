# BrainBloom Strategy

## Architecture
- **Player App** → `(dashboard)` route group — consumer-facing mobile-first PWA
- **Puzzle Studio** → `(studio)` route group — internal platform to create, edit, test, publish puzzles
- **Auth** → Guest-first (localStorage via Zustand persist), optional Google sign-in (Firebase Auth)
- **Data** → Firestore (free tier: 1GB, 50K reads/day) with localStorage fallback for dev

## Tech Stack
- Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui, Framer Motion, Zustand
- Firebase (Auth + Firestore) — only when env vars are configured
- No paid services — everything on free tier

## Data Model
Puzzles stored in Firestore collection `puzzles` or local fallback (`brainbloom-puzzles` key):
```
{
  id: string,
  type: "multiple-choice" | "true-false" | "crossword" | "type-answer" | "sudoku" | "riddle",
  category: string,
  difficulty: "easy" | "medium" | "hard",
  title: string,
  question: string,
  choices?: string[],
  correctAnswer: string,
  acceptedAnswers?: string[],         // alternate correct answers for type-answer
  imageUrl?: string,                   // uploaded via imgbb
  lessonImageUrl?: string,             // separate image for lesson view
  xpReward: number,
  published: boolean,
  createdAt: number,
  updatedAt: number,
  crosswordData?: CrosswordData,       // for type: "crossword"
  sudokuData?: SudokuData,             // for type: "sudoku" — { puzzle: number[], solution: number[] }
  reviewStatus: "draft" | "pending" | "approved" | "rejected" | "needs-discussion",
  reviewedBy?: string,
  reviewNote?: string,
  correctExplanation?: string,          // shown on correct answer
  incorrectExplanation?: string,        // shown on wrong answer
  completedBy?: number,                // incremented via Firestore increment(1)
  lessonContent?: string,               // numbered facts, one per line, shown before quiz
  lessonOrder?: number,                 // position in Learning Path
  lessonGroup?: string,                 // lesson group name
  lessonGroupOrder?: number,            // lesson group display order
  hintText?: string,                    // progressive hints for riddles (one per line)
}
```

## Studio Access
- Invite code system via Firestore `settings/studio` doc (array of `{ code, password, role }[]`)
- Roles: `admin` (alpha-2026) and `contributor` (beta-2026, gamma-2026)
- Session role stored in `sessionStorage` under `"studio-role"`
- Legacy localStorage codes auto-migrated with role preservation via `DEFAULT_CODES` lookup
- **Admin codes cannot be deleted** from settings page (delete button disabled)

## Review Workflow
- `draft → pending → approved/rejected/needs-discussion → admin publishes`
- Contributors create as `draft`, submit for approval → `pending`
- Admin approves/rejects/needs-discussion with optional note
- `reviewedBy` only written on actual admin review actions (not on contributor submission)
- Publish only allowed on approved puzzles; unpublish always available for live puzzles
- Studio dashboard has filter tabs: All / Pending / Approved / Rejected with pending count badge
- Single badge per puzzle: "Live" when published, review status otherwise
- Review note + "Reviewed by" hidden when live

## Image Upload
- imgbb API (free, unlimited) via `services/imgbb.ts`
- Base64 upload via `FileReader`, returns `display_url`
- `NEXT_PUBLIC_IMGBB_API_KEY` env var required

## Heart System
- Hearts = 5 max, refill at 1 per 5 hours
- `nextHeartAt` timestamp in Zustand store
- `processHeartRefill()` called from AppLayout (30s interval) and Learn page (1s interval for countdown)
- **Heart deducted only on wrong answer check** (not on start or retry) — for all puzzle types
- Hearts=0 shows "No Hearts Left" card with timer; hearts<5 shows "Next heart in" banner
- `onWrongAttempt` callback fires from QuizPlay, CrosswordPlay, TypeAnswerPlay

## Type Answer Puzzles
- `"type-answer"` PuzzleType with `acceptedAnswers?: string[]`
- `checkAnswer()` in `lib/utils.tsx`: case-insensitive, checks `acceptedAnswers[]`, falls back to Levenshtein distance ≤ 2 for "close" feedback
- Result screen shows "Also accepted: ..." when `acceptedAnswers` present
- Comma-separated input in Studio form: `value.split(",").map(s => s.trim()).filter(Boolean)`

## Crossword Puzzles
- Grid builder with clue panel, auto-numbering
- Player: keyboard input with auto-advance, arrow key navigation
- `handleCheck` validates against clue answers (not grid cells)
- Non-clue cells blocked/greyed, grid stays visible after check, Try Again button
- Cells are `string` (letter), `null` (blocked in grid), or `""` (open but no letter)

## UI / UX
- Mobile-first, all components responsive (320px+), dark mode supported
- Glassmorphism via `GlassCard`, design tokens (no hardcoded colors), Tailwind v4
- Framer Motion: spring animations, AnimatePresence for transitions
- Focus mode: Zustand `ui-store` hides Sidebar/BottomNav during puzzle play
- Toast positioning: explicit `position: "top-center"` on all custom toasts
- Category filter uses `flex-wrap` (no horizontal scroll)

## Cross-Device Sync
- Firestore `users/{uid}` document stores all user fields
- Debounced Zustand subscriber (3s) calls `saveUserData`
- Guest-first: no forced login, Zustand persist to localStorage
- Merge strategy: `getPuzzles` compares `updatedAt` — newer version wins for same ID
- Dual-write: Firestore + localStorage; merged reads

## XP & Difficulty
- Difficulty picklist no longer auto-sets XP
- XP has separate `<input type="number" list="xp-presets">` with presets 10–100 (steps of 10) + custom entry
- `completedBy` counter incremented only on first-time completion via Firestore `increment(1)`

## Key Decisions
- `puzzleToFirestore`: `acceptedAnswers: null` when empty; `puzzleFromFirestore`: `?? undefined`
- All Firestore catch blocks log errors to console
- Studio test modal uses `PuzzlePlay` with close-on-complete (no XP awarded)
- "Puzzles" category renamed to "Puzzles"
- Deployed to Vercel: brainblooms.vercel.app
- `correctExplanation` replaces old `explanation` + `requiresExplanation` toggle; both explanation fields always shown in Studio for quiz/type-answer

## Build Order
1. ✅ Foundation (Phase 1-3, Home page, UI components, store, auth, shell)
2. ✅ Puzzle Engine (Phase 4):
   a. Puzzle type definitions + data service (Firestore + local fallback)
   b. Puzzle Studio: password gate, list, create/edit form, preview
   c. Player App: puzzle browser (Learn page), play UI, result screen
   d. Wire up XP, hearts, streaks, activity log, daily quests
   e. Crossword editor + player
   f. Type Answer puzzles with acceptedAnswers
   g. Role-based review workflow
   h. Image upload, invite codes, focus mode, heart mechanics
3. ✅ **Learning Path (Duolingo-style)**:
   - `lessonContent?: string` and `lessonOrder?: number` added to Puzzle data model
   - `LessonView` component: shows numbered facts + image before the quiz
   - `CurriculumPath` component: lesson tree with locked/available/completed states
   - Learn page shows Learning Path toggle for categories with lessons
   - `PuzzleBrowser` emits category changes to detect lesson-enabled categories
4. ✅ **Sub-lesson Groups + Hierarchy Management**:
   - `lessonGroup?: string` and `lessonGroupOrder?: number` added to Puzzle data model
   - `services/lesson-service.ts`: CRUD for lesson groups per category (Firestore + localStorage)
   - Settings page: Lesson Hierarchy section (add/edit/delete groups), admin-only invite codes
   - CurriculumPath shows collapsible Lesson groups with numbered sub-lessons (1.1, 1.2, etc.)
   - Sequential unlock: complete all sub-lessons in a group → next group unlocks
   - Studio create/edit: Lesson Group picklist from settings; Sub-lesson Order picklist (1-10, excludes taken orders)
   - `getUsedLessonOrders()` helper prevents duplicate sub-lesson orders per group
5. ✅ **Sudoku Puzzle Type**:
   - `"sudoku"` added to PuzzleType with `SudokuData { puzzle: number[], solution: number[] }`
   - `services/sudoku-generator.ts`: backtracking generator, unique-solution validation via `countSolutions`, difficulty-based clue counts (easy=40, medium=30, hard=24)
   - `SudokuPlay.tsx`: interactive 9×9 grid, number pad, notes mode, auto-validate on each cell fill, conflict shake+highlight, 3-mistake heart deduction, auto-advance to next empty cell, auto-complete detection
   - Progress saved to localStorage (`brainbloom-sudoku-{id}`), restored on mount, cleared on completion
   - Studio create/edit: Sudoku picklist type, grid preview, Regenerate button; stored via puzzleToFirestore/puzzleFromFirestore
6. ✅ **PWA + Sound Effects**:
   - `app/manifest.ts` → webmanifest with standalone display, SVG icons, indigo theme
   - `public/sw.js`: cache-first service worker, precaches `/` and `/offline`
   - `services/sound-service.ts`: Web Audio API procedural sounds (correct chime, wrong buzz, heartbreak, XP arpeggio, gem chime, completion fanfare, daily fanfare, lesson bell, unlock sweep, streak scale, click tick)
   - `initSounds()` on first interaction, mute toggle synced to user store + Firestore
   - Profile page: switch toggle, sound-enabled field cross-device synced
7. ✅ **Polish & UI**:
   - Studio Settings: tabbed navigation (Lesson Hierarchy / Invite Codes), GlassCard sections, group-hover reveal edit/delete
   - Leaderboard: sorted by actual XP, correct rank positioning (crown/medal top-3, user below when outside top-5)
   - BottomNav: Apple-style frosted glass (`backdrop-blur-2xl saturate-[1.8]`), gradient top line, progressive enhancement
   - Profile page: gradient-blur avatar ring, animated level XP bar, glass stat grid, collapsible heart timer, two-column achievements/streak-freeze, animated sound toggle
8. ✅ **Content Seeding**:
    - `scripts/seed-data/importer.ts` — direct localStorage + Firestore import/clear engine (batch delete, dual-write)
    - `scripts/seed-data/data.ts` — 68 hand-crafted puzzles across 4 categories with lesson groups
    - `app/studio/seed/page.tsx` — protected seed page at `/studio/seed` with danger confirmation, animated progress, live log
    - Studio header: Database icon button links to seed page
    - All puzzles `published: true`, `reviewStatus: "approved"`, include lesson content + explanations
9. ✅ **Analytics Dashboard** (`/studio/analytics`):
   - `services/analytics-service.ts` — aggregates puzzle stats (total, published, completions)
   - Stat cards: total puzzles, published count, total completions, category count
   - Horizontal bar charts: puzzles by type, puzzles by status, completions by category
   - Top 10 most-completed puzzles + recent 10 puzzles lists
   - Category breakdown table with counts & avg plays per puzzle
   - BarChart3 icon button in Studio header next to Settings
10. ✅ **Skeleton Loading**: 15 reusable skeleton variants replacing all spinners
11. ✅ **Duolingo-style inline result UI**:
    - Replaced `explanation` + `requiresExplanation` with `correctExplanation` / `incorrectExplanation`
    - Studio forms show both explanation fields for quiz/type-answer (not crossword/sudoku)
    - QuizPlay and TypeAnswerPlay show inline result card with appropriate explanation after each answer
    - All existing logic preserved (XP, hearts, sounds, completion tracking)

## Recent Changes (Session: Jul 2026 - Part 3)
- Added admin code deletion prevention, confirmed acceptedAnswers checking, comma-split fix
- Added 5-second timer confirmation for publish/unpublish/delete
- Blocked contributors from deleting live puzzles
- Fixed type-answer display in player app
- **Puzzle of the Day** with auto-pick, admin override, streak tracking, 2x XP bonus
- **Studio improvements**: Submit button on dashboard, Discuss filter tab, Note badge, re-submit needs-discussion
- **Learning Path (Duolingo-style)**:
  - `lessonContent` + `lessonOrder` fields on Puzzle type
  - `LessonView` component — teaches facts before quiz, with image support
  - `CurriculumPath` component — lesson tree with lock/unlock/completed states, sequential progression
  - Learn page detects categories with lessons, shows toggle between All and Learning Path
  - `PuzzleBrowser` now accepts `onCategoryChange` for lesson detection
  - Studio create/edit forms include Lesson Content (one fact per line) and Lesson Order fields
  - Edge cases: puzzles without lesson content skip lesson view; extras shown as bonus puzzles
- **Learn page redesign**: categories grid first (like home page), click → puzzles view, linked from home page cards
- **Sub-lesson Groups**: `lessonGroup` + `lessonGroupOrder` fields, groups defined in Settings, auto-filled on puzzle creation
- **Settings page**: Lesson Hierarchy section (both admin/contributor), invite codes section (admin-only)
- **Dynamic picklists**: Lesson Group picklist from settings, Sub-lesson Order picklist (1-10, excludes taken orders)
- **CurriculumPath rewrite**: collapsible lesson groups with numbered sub-lessons, sequential unlock per group
- **Sudoku Puzzle Type**:
  - Full 9×9 grid with number pad, notes mode, auto-validate
  - Backtracking generator with unique-solution validation
  - Conflict shake+highlight, 3-mistake heart deduction, auto-advance
  - Progress saved to localStorage, restored on revisit, cleared on completion
  - Game ends when hearts depleted (onComplete with 0 XP)
- **PWA support**: manifest route, SVG icons, cache-first service worker
- **Sound Effects**: Web Audio API procedural sounds, profile toggle, cross-device sync
- **Studio Settings redesign**: tabbed navigation (Lesson Hierarchy / Invite Codes), GlassCard sections, group-hover reveal
- **Leaderboard fix**: sorted by actual XP with correct rank (top-3 crown/medal, user at actual position)
- **BottomNav glass effect**: Apple-style frosted glass with gradient top line
- **Profile page redesign**: gradient-blur avatar ring, animated XP progress bar, glass stat grid, two-column layout
- **Learning path for all types**: lesson fields now visible for crossword/sudoku; puzzles without lessonContent still appear in learning path
- **Lesson group loading fix**: useEffect now depends on both `form.category` and `form.type`; loads for all puzzle types
- **Analytics Dashboard** (`/studio/analytics`): stat cards, bar charts (by type/status/category), top 10 puzzles, recent puzzles table, category breakdown, BarChart3 button in Studio header
- **Skeleton Loading**: professional skeleton placeholders across all loading states
  - `components/ui/skeleton.tsx` — 15 reusable skeleton variants (Card, Chart, Row, LessonGroup, Leaderboard, Activity, DailyChallenge, StreakBar, Form, FilterBar, Curriculum, etc.)
  - Home: DailyChallengeCard upgraded from spinner to matching skeleton blocks
  - Learn: PuzzleBrowser filters + puzzle list skeletons; CurriculumPath lesson group skeletons
  - Studio: puzzle list rows skeleton; edit form skeleton; settings lesson groups skeleton
- **Duolingo-style inline result UI**:
  - Replaced single `explanation` + `requiresExplanation` toggle with `correctExplanation` and `incorrectExplanation` fields
  - Studio create/edit forms show both explanation fields for quiz/type-answer puzzles (not crossword/sudoku)
  - QuizPlay and TypeAnswerPlay show inline result card after each answer with the appropriate explanation (green for correct, red for wrong)
  - Correct answer shows correctExplanation; wrong answer shows incorrectExplanation + the right answer
  - All existing logic preserved (XP, hearts, sound effects, completion tracking)
- **Polish & UX (Session: Jul 2026 - Part 2)**:
  - Lesson progress bar on learn/play screens (absolute top-right, gradient bar)
  - Streak widget on learn page: 7-day circles (epoch ms fix) + today status
  - Heart timer uses destructive (red) colors instead of primary (purple)
  - EmptyState component replaces 9+ inline empty states across Studio/PuzzleBrowser/CurriculumPath
  - CelebrationModal with canvas confetti for achievements/level-ups (auto-checked after completion, detected in addXp)
  - Studio dashboard: sort dropdown (newest, last modified, title A–Z, XP, completions) + asc/desc toggle
  - Studio create/edit: unsaved changes warning (`useUnsavedChanges`), image validation (<2MB, <4096×4096px), Ctrl+S shortcut, collapsible Learning Path section
  - Heart refill notification: animated toast when processHeartRefill detects hearts increased
  - Daily puzzle streak badge on home page card
  - Custom 404 page
- **Analytics time-range filter** (7d/30d/all) — toggle buttons in analytics header, filters puzzles by createdAt
- **Drag-to-reorder lesson groups** — HTML5 drag & drop in Settings lesson list, reindexes via `reorderLessonGroups()`
- **Home screen streak** — text badges removed from StreakBar and DailyChallengeCard; clicking flame opens streak popup with 7-day circles (unmaintained today = b/w, maintained = filled orange)
- **Riddle Puzzle Type** (`"riddle"`) — Duolingo-style animated reveal puzzle type:
  - `RiddlePlay.tsx` component: 4-phase flow (thinking → typewriter reveal → self-assessment → result)
  - `hintText?: string` field — progressive hints (one per line) shown via hint button
  - Self-assessment model: user taps "I got it" or "Nope" (not system-graded, heart deducted on wrong)
  - Suspenseful reveal sound (`playRiddleReveal`) + gentle chime on correct (`playRiddleCorrect`)
  - Studio create/edit: Riddle type in picklist, hint textarea, correct answer + accepted answers + explanations
  - Works with existing Learning Path system (lessonContent shown before riddle)
- **Duolingo-style polish for all play components**:
  - QuizPlay: phase indicator icon, gradient glow, thinking dots, shimmer submit, staggered result card with XP pill badge, "Also accepted" with star icon
  - TypeAnswerPlay: same phase indicator + shimmer + gradient result card + "Also accepted"
  - CrosswordPlay: shimmer check button, gradient result banner with XP pill, spring-animated icons
  - SudokuPlay: MistakeDots component, gradient progress bar, number pad hover effects, polished completion modal with gradient continue
- **Sidebar redesign**:
  - Frosted glass body (`backdrop-blur-2xl saturate-[1.8]`) matching BottomNav
  - Nav items with rounded-2xl, gradient active background + gradient left bar indicator
  - Gradient-ring avatar, inline XP/hearts mini-stats in user card
- **Unsaved changes modal** (`useUnsavedChanges.tsx`):
  - Replaced native `window.confirm()` with proper styled modal (AlertTriangle icon, backdrop blur)
  - `confirmLeave` now takes a callback instead of returning boolean
  - Both create and edit pages use the new modal
- **Daily Login Bonus** (`DailyRewardChest.tsx`):
  - Trigger card on home page opens full-screen modal with 3.5s auto-play sequence
  - Custom SVG gift box with 3D-style lid, base, ribbon, bow (gradients + shines)
  - Phases: idle (golden glow) → shaking (violent wiggle) → opening (lid flies off, 4 radial light beams) → confetti explosion → reward reveal
  - Reward reveal: gradient-ring icon, orbiting sparkle ring, gradient gradient text, expanding shimmer ring
  - Weighted probability pool (XP 10-100, Gems 5-10, Streak Freeze) — higher chance for lower XP
  - Modal blocks all input during animation (`pointer-events: none`, body scroll locked)
  - Auto-closes after reward display
- **Weekly Insights Report** (`WeeklyInsights.tsx`):
  - Trigger card on home page showing weekly summary (puzzles, XP)
  - Modal with 6 stat tiles: XP earned, puzzles done, best streak, accuracy %, weakest category, categories explored
  - Share button using native `navigator.share()` with clipboard fallback

## Recent Changes (Session: Jul 2026 - Part 4)
- **Streak freeze fix**: replaced exact-2-day-gap check with `diffDays` calculation — each freeze covers exactly one missed day; streak only breaks if missed days exceed available freezes. Edge case: new users (`lastActiveDate: ""`) get streak=1 on first completion
- **Level XP helpers exported**: `xpForLevel()` and `getLevelProgress()` exported from `store/user-store.ts`; profile page `getLevel()` delegates to shared helper instead of hardcoded `LEVEL_XP_MULTIPLIER`
- **Lesson image support**: `lessonImageUrl?: string` added to `Puzzle`/`PuzzleFormData` types, `puzzleToFirestore`/`puzzleFromFirestore`, Studio create/edit forms (separate file input + imgbb upload), and `LessonView` (renders `lessonImageUrl ?? imageUrl` fallback)
- **Content Seeding System**:
  - `scripts/seed-data/importer.ts` — batch delete (localStorage + Firestore writeBatch), `seedLessonGroups()`, `seedPuzzles()`, `directCreatePuzzle()` with `published: true` + `reviewStatus: "approved"`
  - `scripts/seed-data/data.ts` — 68 hand-crafted puzzles across Logic (16), Riddles (16), Science (20), Puzzles (16); 17 lesson groups; each with real questions, lesson content (3-5 facts), explanations, hint text for riddles
  - `app/studio/seed/page.tsx` — danger-confirmed seed page with animated step indicators, live log, completion stats
  - Studio header: Database icon button links to seed page
- **True-false puzzle fix**: all 5 true-false puzzles now have `choices: ["True", "False"]` with `correctAnswer` matching exact case (strict `===` in `PuzzlePlay.tsx:41`)

## Remaining / Known Issues
- **`/offline` page missing** — SW precaches it but page doesn't exist, SW install will fail
- **`npm run lint` broken** — script is just `"eslint"` with no glob (should be `"eslint ."`)
- **4 unused store actions** — `restoreHearts`, `claimDailyReward`, `canClaimReward`, `refreshDailyQuests` implemented but never called from UI
- **No `loading.tsx` / `error.tsx`** at any route level — no suspense fallbacks or route error boundaries
- **Sudoku generator 2s timeout** can produce partial/invalid puzzles
- **`acceptedAnswers` save inconsistency** — type-answer uses `onChange`, riddle uses `onBlur`
- **Starter SVGs** — `public/window.svg`, `globe.svg`, `file.svg` unused
- **Local dev IP** — `192.168.1.3` in `next.config.ts` `allowedDevOrigins`
- **No test infrastructure** — zero tests across the project
- **`shadcn` in `dependencies`** instead of `devDependencies`

## Recent Changes (Session: Jul 2026 - Part 5)
- **Weekly XP tracking fix**: Added `weeklyXp` + `weeklyStartDate` store fields; `addXp` and `unlockAchievement` increment it; ISO week boundary detection via `getWeekStart()`/`hasWeekChanged()`; `checkWeeklyReset()` on rehydration + `loadFromFirestore`; WeeklyInsights uses `store.weeklyXp` (not history sum)
- **Weekly insights grid 60:40**: Changed from `md:grid-cols-4` (75:25) to `md:grid-cols-5` with 3:2 split
- **Streak freeze visualization**: Added `frozenDays`/`brokenDays` tracking to `checkStreak()`; streak circles show blue Snowflake for freeze-saved days, red X for broken days, orange CheckCircle2 for maintained
- **Achievement fixes**: `hearts_saver` (perfect run via module-level `heartsLostThisSession` flag, reset per puzzle in PuzzlePlay) and `daily_goal_week` (7-day goal streak via `dailyGoalStreak`/`dailyGoalLastHitDate` tracked in `addXp`) — both now trigger correctly
