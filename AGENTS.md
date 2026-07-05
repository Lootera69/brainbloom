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
Puzzles stored in Firestore collection `puzzles` or local fallback:
```
{
  id: string,
  type: "multiple-choice" | "true-false",
  category: string,
  difficulty: "easy" | "medium" | "hard",
  title: string,
  question: string,
  choices: string[],
  correctAnswer: string,
  xpReward: number,
  published: boolean,
  createdAt: number,
  updatedAt: number,
}
```

## Studio Access
- Simple password gate (`STUDIO_PASSWORD` env var or dev fallback `"brainbloom"`)
- Session stored in sessionStorage — no Firebase Auth needed

## Build Order
1. ✅ Foundation (Phase 1-3, Home page, UI components, store, auth, shell)
2. 🔄 Puzzle Engine (Phase 4):
   a. Puzzle type definitions + data service (Firestore + local fallback)
   b. Puzzle Studio: password gate, list, create/edit form, preview
   c. Player App: puzzle browser (Learn page), play UI, result screen
   d. Wire up XP, hearts, streaks, activity log, daily quests
3. ⬜ Content: seed 30-50 puzzles via Studio or LLM-generated JSON
4. ⬜ Polish: animations, sounds, error states, empty states
