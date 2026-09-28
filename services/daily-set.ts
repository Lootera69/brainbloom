"use client";

import { getPublishedPuzzles, getPuzzle } from "@/services/puzzle-service";
import { getTodayDailyPuzzleId } from "@/services/daily-puzzle";
import { DAILY_SET_SIZE } from "@/lib/subscription";
import type { Puzzle, PuzzleType } from "@/types/puzzle";

// A puzzle can complete the daily flow only when it is a scored type. Cipher,
// wonder and story never score, so they are excluded from every daily reward.
export function isDailyEligibleType(type: PuzzleType): boolean {
  return type !== "cipher" && type !== "wonder" && type !== "story";
}

// The Daily Set is limited to fast, scored types: crossword and sudoku blow the
// 2–3 minute-per-puzzle budget, so they are excluded on top of isDailyEligible.
export function isDailySetEligible(puzzle: Puzzle): boolean {
  return (
    isDailyEligibleType(puzzle.type) &&
    puzzle.type !== "crossword" &&
    puzzle.type !== "sudoku"
  );
}

// The UTC day number — the seed for every deterministic daily pick so the whole
// install base sees the same content on the same calendar day.
export function dailyUtcDayIndex(now: number = Date.now()): number {
  return Math.floor(now / 86400000);
}

// Deterministically pick `count` distinct puzzles from `pool` for `dayIndex`.
// `pool` must already be sorted by id so every device agrees on the order. The
// stride walks the list by a day-dependent step so consecutive days do not
// simply shift by one, while staying a pure function of the day. When the pool
// is smaller than `count` the whole pool is returned (deduped).
export function pickDailyPuzzles(pool: Puzzle[], dayIndex: number, count: number): Puzzle[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return [...pool];
  const n = pool.length;
  // A stride coprime-ish with n keeps picks spread out; +1 guards against 0.
  const stride = (dayIndex % (n - 1)) + 1;
  const start = dayIndex % n;
  const chosen: Puzzle[] = [];
  const seen = new Set<number>();
  let idx = start;
  while (chosen.length < count) {
    const slot = ((idx % n) + n) % n;
    if (!seen.has(slot)) {
      seen.add(slot);
      chosen.push(pool[slot]);
    } else {
      // Collision (stride shares a factor with n): nudge to the next free slot.
      idx++;
    }
    idx += stride;
  }
  return chosen;
}

// Picks `count` puzzles spread as evenly as possible across `categories`. Slots
// are distributed round-robin (3 categories over 3 slots gives one each; 2 over
// 3 gives 2 and 1), with the extra slot rotating by `dayIndex` so the same
// category is not always the one that gets two. Within a category the pick is
// the same deterministic day-seeded choice as pickDailyPuzzles. Any shortfall —
// a category with too few puzzles — is back-filled from the remaining pool.
// `pool` must already be filtered to `categories` and sorted by id.
export function pickDailySetMixed(
  pool: Puzzle[],
  categories: string[],
  dayIndex: number,
  count: number,
): Puzzle[] {
  if (pool.length === 0 || count <= 0) return [];

  // Categories that actually have puzzles, in a stable then day-rotated order
  // so the distribution is deterministic but the "extra" slot moves each day.
  const present = categories
    .filter((c) => pool.some((p) => p.category === c))
    .sort();
  if (present.length === 0) return pickDailyPuzzles(pool, dayIndex, count);
  const n = present.length;
  const rot = dayIndex % n;
  const order = [...present.slice(rot), ...present.slice(0, rot)];

  const byCat = new Map<string, Puzzle[]>();
  for (const c of order) byCat.set(c, pool.filter((p) => p.category === c));

  const base = Math.floor(count / n);
  const extra = count % n;

  const chosen: Puzzle[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const quota = base + (i < extra ? 1 : 0);
    if (quota === 0) continue;
    for (const p of pickDailyPuzzles(byCat.get(order[i]) ?? [], dayIndex, quota)) {
      if (!used.has(p.id)) {
        used.add(p.id);
        chosen.push(p);
      }
    }
  }

  // Back-fill any shortfall (a category ran dry) from the rest of the pool.
  if (chosen.length < count) {
    const remaining = pool.filter((p) => !used.has(p.id));
    for (const p of pickDailyPuzzles(remaining, dayIndex, count - chosen.length)) {
      if (!used.has(p.id)) {
        used.add(p.id);
        chosen.push(p);
      }
    }
  }

  return chosen.length <= count ? chosen : chosen.slice(0, count);
}

// Today's Daily Set: DAILY_SET_SIZE fast puzzles, identical for everyone on the
// same UTC day. An admin pin (settings/daily-puzzle) becomes slot 0; the rest
// are filled deterministically from the daily-set-eligible pool. A premium
// category filter swaps the pool for the chosen categories and drops the shared
// pin. If the filter yields nothing it falls back to the shared pool so the
// card is never empty.
export async function getDailySet(categories: string[] = []): Promise<Puzzle[]> {
  const all = await getPublishedPuzzles();
  const allEligible = all
    .filter((p) => isDailySetEligible(p))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (allEligible.length === 0) return [];

  // Apply the premium category filter, falling back to the full pool when the
  // chosen categories have no eligible puzzles.
  const wanted = new Set(categories);
  const filtered = wanted.size === 0
    ? allEligible
    : allEligible.filter((p) => wanted.has(p.category));
  const eligible = filtered.length === 0 ? allEligible : filtered;

  const dayIndex = dailyUtcDayIndex();

  // A premium category pick is a personal set, so it skips the shared pin and
  // spreads the slots evenly across the chosen categories.
  if (wanted.size > 0 && filtered.length > 0) {
    return pickDailySetMixed(eligible, categories, dayIndex, DAILY_SET_SIZE);
  }

  // Optional admin pin takes slot 0 when valid for today.
  let pinned: Puzzle | null = null;
  const pinnedId = await getTodayDailyPuzzleId();
  if (pinnedId) {
    const p = await getPuzzle(pinnedId);
    if (p && p.published && isDailySetEligible(p)) pinned = p;
  }

  if (!pinned) {
    return pickDailyPuzzles(eligible, dayIndex, DAILY_SET_SIZE);
  }

  // Pin leads; fill the remaining slots from the pool minus the pin.
  const rest = eligible.filter((p) => p.id !== pinned!.id);
  const filled = pickDailyPuzzles(rest, dayIndex, DAILY_SET_SIZE - 1);
  return [pinned, ...filled];
}
