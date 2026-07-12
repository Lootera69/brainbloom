# BrainBloom — Full Project Reference

## Overview
BrainBloom is a **mobile-first PWA** for daily brain training (puzzles, quizzes, riddles). It has two route groups:
- **`(dashboard)`** — Player App (home, learn, profile, achievements, leaderboard)
- **`(studio)`** — Puzzle Studio (create/edit/publish puzzles, analytics, settings, seed)
- **`(auth)`** — Login page (guest, Google, email/password with verification)

Deployed at **brainblooms.vercel.app**.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui primitives
- **Animation**: Framer Motion (spring animations, AnimatePresence)
- **State**: Zustand (persist middleware → localStorage)
- **Backend**: Firebase Auth + Firestore (free tier)
  - Only active when `NEXT_PUBLIC_FIREBASE_API_KEY` env var is set
  - Firestore collections: `puzzles`, `users/{uid}`, `settings/studio`
- **Image hosting**: imgbb API (free, unlimited, base64 upload)
- **Payments**: None — everything on free tier

---

## Project Structure
```
app/
  (auth)/login/page.tsx          — Login page (guest, Google, email/password, verify)
  (dashboard)/
    page.tsx                     — Home (daily puzzle, streak, weekly insights, daily reward chest)
    learn/page.tsx               — Puzzle browser + learning path + curriculum
    profile/page.tsx             — User profile (stats, achievements, settings)
    achievements/page.tsx        — Achievement list
  (studio)/
    page.tsx                     — Studio dashboard (puzzle list, review workflow)
    create/page.tsx              — Puzzle create form
    edit/[id]/page.tsx           — Puzzle edit form
    settings/page.tsx            — Lesson hierarchy + invite codes
    analytics/page.tsx           — Analytics dashboard (charts, stats)
    seed/page.tsx                — Content seeding (danger-guarded)
  manifest.ts                    — PWA webmanifest

components/
  ui/                            — shadcn/ui primitives + custom (GlassCard, Skeleton, EmptyState, CelebrationModal)
  layout/
    AppLayout.tsx                — Main shell (sidebar, bottom nav, heart refill timer)
    BottomNav.tsx                — Apple-style frosted glass bottom nav
    Sidebar.tsx                  — Frosted glass sidebar with gradient nav items
  home/                          — Home page components
    DailyChallengeCard.tsx
    DailyRewardChest.tsx         — 3.5s animated gift box with confetti
    StreakBar.tsx                — Week/month streak view with circles
    MonthlyStreakView.tsx        — Calendar month view
    WeeklyInsights.tsx           — Weekly stats modal with share

features/
  puzzle/
    components/
      PuzzlePlay.tsx             — Plays multiple-choice & true-false (inline result with explanations)
      CrosswordPlay.tsx          — Crossword player (keyboard input, auto-advance, arrow keys)
      TypeAnswerPlay.tsx         — Type-answer player (accepted answers, Levenshtein close match)
      SudokuPlay.tsx             — Sudoku player (9x9 grid, notes, mistake tracking, auto-validate)
      RiddlePlay.tsx             — 4-phase riddle (thinking → typewriter reveal → self-assessment → result)
      LessonView.tsx             — Pre-quiz lesson content (numbered facts + image)
      CurriculumPath.tsx         — Lesson tree with lock/available/completed, collapsible groups
      PuzzleBrowser.tsx          — Filterable puzzle grid
    data/
      puzzle-schemas.ts          — Puzzle type definitions & schemas

store/
  user-store.ts                  — User state (XP, level, hearts, streak, achievements, daily quests, settings)
  ui-store.ts                    — UI state (focus mode)

services/
  firebase.ts                    — Firebase auth (Google, email/password, reset, verify) + Firestore CRUD
  puzzle-service.ts              — Puzzle CRUD (Firestore + localStorage dual-write)
  user-service.ts                — User data save/load (Firestore + localStorage)
  lesson-service.ts              — Lesson groups CRUD
  analytics-service.ts           — Aggregated puzzle stats
  imgbb.ts                       — Image upload to imgbb
  sudoku-generator.ts            — Backtracking sudoku generator + unique-solution validation
  sound-service.ts               — Web Audio API procedural sounds (initSounds(), play*())

lib/
  utils.tsx                      — checkAnswer(), cn(), formatters
```

---

## Data Model

### Puzzle (Firestore `puzzles` collection / localStorage `brainbloom-puzzles`)
```ts
{
  id: string,
  type: "multiple-choice" | "true-false" | "crossword" | "type-answer" | "sudoku" | "riddle",
  category: string,
  difficulty: "easy" | "medium" | "hard",
  title: string,
  question: string,
  choices?: string[],               // for multiple-choice, true-false
  correctAnswer: string,
  acceptedAnswers?: string[],       // alternate correct answers (type-answer, riddle)
  imageUrl?: string,                // imgbb URL
  lessonImageUrl?: string,          // separate image for lesson view
  xpReward: number,
  published: boolean,
  createdAt: number,                // epoch ms
  updatedAt: number,
  crosswordData?: CrosswordData,
  sudokuData?: SudokuData,          // { puzzle: number[], solution: number[] }
  reviewStatus: "draft" | "pending" | "approved" | "rejected" | "needs-discussion",
  reviewedBy?: string,
  reviewNote?: string,
  correctExplanation?: string,      // shown on correct answer (inline result card)
  incorrectExplanation?: string,    // shown on wrong answer
  completedBy?: number,             // incremented via Firestore increment(1)
  lessonContent?: string,           // numbered facts, one per line
  lessonOrder?: number,             // position in learning path
  lessonGroup?: string,             // lesson group name (from Settings)
  lessonGroupOrder?: number,        // group display order
  hintText?: string,                // progressive hints for riddles (one per line)
}
```
- `puzzleToFirestore()`: strips `undefined` fields, sets `acceptedAnswers: null` when empty
- `puzzleFromFirestore()`: maps `acceptedAnswers: null` back to `undefined`

### User (Firestore `users/{uid}` / localStorage `brainbloom-user`)
Stored in Zustand with persist middleware. Key fields:
- `uid`, `displayName`, `email`, `photoURL`
- `xp`, `level`, `hearts`, `maxHearts`, `nextHeartAt`
- `streak`, `lastActiveDate`, `streakStartDate`, `activeDates` (ISO date strings)
- `streakFreezes` (count)
- `weeklyXp`, `weeklyStartDate`
- `dailyQuestProgress`, `dailyGoalStreak`, `dailyGoalLastHitDate`
- `completedPuzzleIds: string[]`
- `achievements: Record<string, number>` (achievement ID → unlocked count)
- `gems`, `totalXpEarned`, `puzzlesCompleted`, `totalCorrect`, `totalAttempts`
- `soundEnabled`, `dailyRewardClaimed`, `dailyRewardDate`
- `heartsLostThisSession` (module-level flag for hearts_saver achievement)

### Settings (Firestore `settings/studio` / localStorage `brainbloom-settings`)
```ts
{
  lessonGroups: { name: string, order: number }[],
  codes: { code: string, password: string, role: "admin" | "contributor" }[]
}
```

---

## Auth System
- **Guest-first**: No forced login. Zustand persist to localStorage. `loginAsGuest()` sets guest flag.
- **Email/Password** (`services/firebase.ts`):
  - `signUpWithEmailFull()` → sends verification email → shows verify screen
  - `signInWithEmailFull()` → checks `emailVerified`, returns `{ needsVerification: true }` if unverified → shows verify screen
  - `resendVerificationEmail()` — re-sends verification
  - `sendPasswordReset()` — sends password reset email
  - Verify screen has "Resend" + "I've verified — Sign In" buttons. Hides Google/Guest/divider.
  - Profile shows email auth type badge + Change Password card. Sign out calls Firebase `signOutUser()`.
- **Google**: `signInWithGoogle()` → sets user in store → redirects to `/`
- **Firebase env guard**: All Firebase functions check `firebaseConfigured` before use
- **Cross-device sync**: Debounced Zustand subscriber (3s) → `saveUserData` → Firestore. Merge strategy: newer `updatedAt` wins for same puzzle ID.

---

## Routing
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Daily puzzle, streak, weekly insights, daily reward chest |
| `/learn` | Learn | Category grid → puzzle browser → play + curriculum path |
| `/profile` | Profile | Stats, achievements, sound toggle, auth settings |
| `/achievements` | Achievements | Full achievement list |
| `/login` | Login | Sign in / Sign up / Forgot / Verify |
| `/studio` | Studio | Dashboard with puzzle list + review filters |
| `/studio/create` | Create | Puzzle creation form |
| `/studio/edit/[id]` | Edit | Puzzle edit form |
| `/studio/settings` | Settings | Lesson hierarchy + invite codes |
| `/studio/analytics` | Analytics | Charts, stats, top/ recent puzzles |
| `/studio/seed` | Seed | Content seeding (danger-guarded) |
| `/manifest.webmanifest` | PWA | Webmanifest |

**Missing**: No `loading.tsx` or `error.tsx` at any route level. No `/offline` page (SW precaches it but it doesn't exist).

---

## State Management (Zustand)
### `useUserStore` (`store/user-store.ts`)
- Persisted to localStorage via Zustand `persist` middleware
- Key actions: `loginAsGuest`, `setUser`, `addXp`, `deductHeart`, `processHeartRefill`, `updateStreak`, `checkStreak`, `completePuzzle`, `unlockAchievement`, `checkAchievements`
- Level helpers: `xpForLevel(level)`, `getLevelProgress(xp, level)` — exported for use outside store
- Streak uses `lastActiveDate`, `streakStartDate`, `activeDates` (array of ISO date strings)
- `checkStreak()` returns `{ current, longest, frozenDays, brokenDays, todayActive }`

### `useUiStore` (`store/ui-store.ts`)
- `focusMode: boolean` — hides Sidebar/BottomNav during puzzle play

---

## Key Features

### 1. Puzzle Engine
- **6 types**: multiple-choice, true-false, crossword, type-answer, sudoku, riddle
- **Data service** (`services/puzzle-service.ts`): CRUD with Firestore + localStorage fallback
- **Play components**: `PuzzlePlay`, `CrosswordPlay`, `TypeAnswerPlay`, `SudokuPlay`, `RiddlePlay`
  - All show inline result card after answer (green=correct, red=wrong) with explanation fields
  - Hearts deducted only on wrong answer (not on start/retry). `onWrongAttempt` callback fires.
  - `resetHeartsLostFlag()` called in `handleStartPuzzle` (learn page), not on mount
  - `checkAchievements()` runs after puzzle completion (not mid-group)
- **XP awarded on first-time completion only**. `completedBy` increments via Firestore `increment(1)`.

### 2. Studio (Puzzle Studio)
- **Access**: Invite code system (`settings/studio`). Roles: `admin` (alpha-2026), `contributor` (beta-2026, gamma-2026)
  - Session role in `sessionStorage("studio-role")`. Legacy localStorage codes auto-migrated.
  - Admin codes cannot be deleted from settings page.
  - Studio login has loading spinner + "Authenticating…" on Unlock button during credential check.
- **Review workflow**: `draft → pending → approved/rejected/needs-discussion → admin publishes`
  - Contributors create as `draft`, submit → `pending`. Admin approves/rejects with optional note.
  - `reviewedBy` only written on actual admin review (not contributor submit).
  - Publish only on approved; unpublish always available.
  - Studio dashboard: filter tabs (All/Pending/Approved/Rejected/Needs-discussion/Discuss) + pending count badge
  - Single badge: "Live" when published, review status otherwise. Review note hidden when live.
- **Create/Edit form**: All 6 types in picklist. Lesson group picklist from settings, sub-lesson order picklist (1-10, excludes taken orders via `getUsedLessonOrders()`). Both explanation fields shown for quiz/type-answer (not crossword/sudoku). Unsaved changes warning via `useUnsavedChanges` modal (styled, not native confirm). Ctrl+S shortcut. Image validation (<2MB, <4096×4096px).

### 3. Learning Path (Duolingo-style)
- **Lesson groups**: Defined in Settings (`services/lesson-service.ts`). Drag-to-reorder via HTML5 drag & drop, reindexed via `reorderLessonGroups()`.
- **Sub-lessons**: Each puzzle has `lessonGroup`, `lessonOrder`, `lessonContent`.
- **CurriculumPath component**: Collapsible groups with numbered sub-lessons (1.1, 1.2, etc.). Sequential unlock: complete all in group → next group unlocks.
- **LessonView**: Shows numbered facts + image (`lessonImageUrl ?? imageUrl`) before quiz.
- **Learn page**: Category grid → click → puzzle view with "All" / "Learning Path" toggle. Puzzles without `lessonContent` skip lesson view, shown as bonus.
- **Lesson progress bar**: Absolute top-right on learn/play screens, gradient bar.

### 4. Heart System
- Max 5 hearts, refill 1 per 5 hours. `nextHeartAt` as timestamp.
- `processHeartRefill()` called from AppLayout (30s interval) + Learn page (1s for countdown).
- Heart deducted **only on wrong answer** (not start/retry) for all puzzle types.
- Hearts=0 → "No Hearts Left" card with timer. Hearts<5 → "Next heart in" banner.
- Heart refill notification: animated toast when `processHeartRefill` detects increase.
- Heart timer uses destructive (red) colors.

### 5. XP & Levels
- Level formula: `xpForLevel(n) = n * 100` (can change). `getLevelProgress()` returns `{ current, next, progress }`.
- Difficulty picklist does NOT auto-set XP. XP has separate `<input type="number" list="xp-presets">` (10-100, steps of 10).
- `weeklyXp` tracked with ISO week boundary detection. Reset on week change.

### 6. Streak System
- `checkStreak()` uses `lastActiveDate`, `streakStartDate`, `activeDates[]`.
- **Streak freeze**: Each freeze covers exactly one missed day. `diffDays` calculation — streak breaks only if missed days exceed available freezes. Frozen day shown as blue Snowflake icon.
- New users (`lastActiveDate: ""`) get streak=1 on first completion.
- StreakBar: 7-day circles + today status. Click flame → popup with Week/Month tabs (MonthlyStreakView: calendar month with active/frozen/broken/empty/future states, legend, active-day count).
- Streak circles: orange CheckCircle2 (maintained), blue Snowflake (freeze-saved), red X (broken), b/w (unmaintained today).

### 7. Achievement System
- `checkAchievements()` called after puzzle completion (not mid-group).
- Achievements tracked in `store.achievements: Record<string, number>`.
- `hearts_saver` (perfect run) uses module-level `heartsLostThisSession` flag, reset in `handleStartPuzzle`.
- `daily_goal_week` (7-day goal streak) via `dailyGoalStreak` / `dailyGoalLastHitDate` tracked in `addXp`.
- `CelebrationModal`: canvas confetti for achievements/level-ups. Auto-checked after completion, detected in `addXp`.

### 8. Puzzle Type Specifics

**Crossword**:
- Grid builder with clue panel, auto-numbering
- Player: keyboard input with auto-advance, arrow key navigation
- `handleCheck` validates against clue answers (not grid cells)
- Non-clue cells blocked/greyed, grid stays visible after check, "Try Again" button
- Cells: `string` (letter), `null` (blocked), `""` (open)

**Type-Answer**:
- `acceptedAnswers?: string[]` — alternate correct answers
- `checkAnswer()` in `lib/utils.tsx`: case-insensitive, checks `acceptedAnswers[]`, falls back to Levenshtein distance ≤ 2 for "close" feedback
- Result shows "Also accepted: ..." when `acceptedAnswers` present
- Studio form: comma-separated input → `value.split(",").map(s => s.trim()).filter(Boolean)`

**Sudoku**:
- Backtracking generator (`services/sudoku-generator.ts`) with `countSolutions()` for uniqueness
- Difficulty-based clue counts: easy=40, medium=30, hard=24
- `SudokuPlay.tsx`: 9×9 grid, number pad, notes mode, auto-validate on each cell fill
- Conflict shake+highlight, 3-mistake heart deduction, auto-advance to next empty cell
- Progress saved to localStorage (`brainbloom-sudoku-{id}`), restored on mount, cleared on completion
- Game ends when hearts depleted (onComplete with 0 XP)

**Riddle**:
- 4-phase flow in `RiddlePlay.tsx`: thinking → typewriter reveal → self-assessment ("I got it" / "Nope") → result
- `hintText?: string` — progressive hints (one per line) shown via hint button
- Self-assessment model: user taps, heart deducted on "Nope" (not system-graded)
- Suspenseful reveal sound + gentle chime on correct

### 9. Puzzle of the Day
- Auto-picked daily puzzle, admin override available
- Streak tracking, 2x XP bonus
- Streak badge on home page card

### 10. PWA + Sound
- **Manifest**: `app/manifest.ts` → standalone display, SVG icons, indigo theme
- **Service Worker**: `public/sw.js` — cache-first, precaches `/` and `/offline`
- **Sound**: `services/sound-service.ts` — Web Audio API procedural sounds (correct chime, wrong buzz, heartbreak, XP arpeggio, gem chime, completion fanfare, daily fanfare, lesson bell, unlock sweep, streak scale, click tick)
  - `initSounds()` on first user interaction
  - Mute toggle synced to user store + Firestore cross-device
  - Profile page: animated sound toggle switch

### 11. Analytics Dashboard (`/studio/analytics`)
- Stat cards: total puzzles, published, total completions, category count
- Horizontal bar charts: by type, by status, completions by category
- Top 10 most-completed + recent 10 puzzles
- Category breakdown table with counts & avg plays
- Time-range filter (7d/30d/all)
- BarChart3 button in Studio header

### 12. Content Seeding (`/studio/seed`)
- `scripts/seed-data/importer.ts` — batch delete (localStorage + Firestore writeBatch), `seedLessonGroups()`, `seedPuzzles()`, `directCreatePuzzle()` with `published: true` + `reviewStatus: "approved"`
- `scripts/seed-data/data.ts` — 68 puzzles across Logic (16), Riddles (16), Science (20), Puzzles (16); 17 lesson groups
- Seed page: danger confirmation, animated step indicators, live log, completion stats
- Studio header: Database icon button links to seed page

### 13. Daily Login Bonus (`DailyRewardChest.tsx`)
- Full-screen modal with 3.5s auto-play: idle glow → shake → open (lid flies off, radial light beams) → confetti → reward reveal
- Weighted probability pool: XP 10-100, Gems 5-10, Streak Freeze (higher chance for lower XP)
- Modal blocks all input during animation, auto-closes after reveal

### 14. Weekly Insights (`WeeklyInsights.tsx`)
- Trigger card on home page → modal with 6 stat tiles (XP, puzzles, streak, accuracy, weakest category, categories explored)
- Share button via `navigator.share()` with clipboard fallback

---

## UI / UX Patterns
- **Mobile-first** (320px+), dark mode only (no light mode toggle)
- **Glassmorphism**: `GlassCard` component, `backdrop-blur-2xl saturate-[1.8]`, `bg-card/60` patterns
- **Design tokens**: No hardcoded colors. Uses Tailwind `primary`, `secondary`, `destructive`, `muted`, `card`, `background`, `foreground`, `muted-foreground`
- **Framer Motion**: Spring animations, `AnimatePresence` for transitions, `motion.div` with `initial`/`animate`/`exit`. Stagger delays for lists.
- **Focus mode** (`useUiStore`): Hides Sidebar/BottomNav during puzzle play
- **Toast positioning**: All custom toasts use explicit `position: "top-center"`
- **Category filter**: Uses `flex-wrap` no horizontal scroll
- **Skeleton loading**: 15 variants (Card, Chart, Row, LessonGroup, Leaderboard, Activity, DailyChallenge, StreakBar, Form, FilterBar, Curriculum, etc.) via `components/ui/skeleton.tsx`
- **EmptyState component**: Replaces 9+ inline empty states across Studio/PuzzleBrowser/CurriculumPath
- **Error/Success banners**: `AnimatePresence` with slide-in from top
- **Gradient CTAs**: Buttons use `bg-gradient-to-r from-primary to-[#8b5cf6]` pattern

---

## Design Patterns & Conventions
- No comments in code (expect AGENTS.md for context)
- All Firebase catch blocks log errors to console only
- Studio test modal uses `PuzzlePlay` with `closeOnComplete` (no XP awarded)
- Store selectors used in components (not raw store access)
- Firestore writes are dual: Firestore + localStorage. Reads merge both, newest `updatedAt` wins.
- `puzzleToFirestore()` / `puzzleFromFirestore()` used as serialization layer
- `cn()` from `lib/utils.tsx` for class merging
- Exported helper functions over store-internal utilities where possible (e.g., `xpForLevel`, `getLevelProgress`, `checkAnswer`)

---

## Known Issues & Gotchas
1. **`/offline` page missing** — SW precaches it but page doesn't exist → SW install fails
2. **`npm run lint` broken** — script is `"eslint"` with no glob (should be `"eslint ."`)
3. **4 unused store actions** — `restoreHearts`, `claimDailyReward`, `canClaimReward`, `refreshDailyQuests` never called from UI
4. **No `loading.tsx` / `error.tsx`** at any route level — no suspense fallbacks or route error boundaries
5. **Sudoku generator 2s timeout** can produce partial/invalid puzzles
6. **`acceptedAnswers` save inconsistency** — type-answer uses `onChange`, riddle uses `onBlur`
7. **Starter SVGs** — `public/window.svg`, `globe.svg`, `file.svg` unused
8. **Local dev IP** — `192.168.1.3` in `next.config.ts` `allowedDevOrigins`
9. **No test infrastructure** — zero tests across the project
10. **`shadcn` in `dependencies`** instead of `devDependencies`

---

## Environment Variables (`.env.local`)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_IMGBB_API_KEY=
```

---

## Commands
```bash
npm run dev          # Development server
npm run build        # Production build (lint + typecheck + compile)
npm run lint         # Broken — needs "eslint ." fix
```

## Git Workflow
- Commits on `main` branch
- Push to `origin/main` (GitHub: Lootera69/brainbloom)
- Always `git status` + `git diff --stat` before committing
