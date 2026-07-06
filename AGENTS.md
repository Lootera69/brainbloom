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
- "Sudoku" category renamed to "Puzzles"
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
3. ⬜ Content: seed 30-50 puzzles via Studio or LLM-generated JSON
4. ⬜ Polish: analytics, sound effects, PWA manifest, offline support, bulk JSON import/export

## Recent Changes (Session: Jul 2026)
- Fixed admin invite code deletion: delete button disabled for admin role codes
- Fixed type-answer result screen to show "Also accepted: ..." list
- Confirmed `checkAnswer()` properly checks `acceptedAnswers[0], acceptedAnswers[1], ...`
- Comma-separated input in Studio form field now correctly preserves all values
