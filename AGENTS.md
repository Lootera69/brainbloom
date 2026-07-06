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
  type: "multiple-choice" | "true-false" | "crossword" | "type-answer",
  category: string,
  difficulty: "easy" | "medium" | "hard",
  title: string,
  question: string,
  choices?: string[],
  correctAnswer: string,
  acceptedAnswers?: string[],         // alternate correct answers for type-answer
  imageUrl?: string,                   // uploaded via imgbb
  xpReward: number,
  published: boolean,
  createdAt: number,
  updatedAt: number,
  crosswordData?: CrosswordData,       // for type: "crossword"
  reviewStatus: "draft" | "pending" | "approved" | "rejected" | "needs-discussion",
  reviewedBy?: string,
  reviewNote?: string,
  requiresExplanation?: boolean,
  explanation?: string,
  completedBy?: number,                // incremented via Firestore increment(1)
  lessonContent?: string,               // numbered facts, one per line, shown before quiz
  lessonOrder?: number,                 // position in Learning Path
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
5. ⬜ Content: seed 30-50 puzzles via Studio or LLM-generated JSON
6. ⬜ Polish: analytics, sound effects, PWA manifest, offline support, bulk JSON import/export

## Recent Changes (Session: Jul 2026)
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
