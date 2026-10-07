"use client";

import type { Puzzle } from '@/types/puzzle';
import { getFirebase } from '@/services/firebase';

const cache = new Map<string, { puzzles: Puzzle[]; expiresAt: number }>();
const pending = new Map<string, Promise<Puzzle[]>>();
const lifetime = 30 * 60 * 1000;

async function readPuzzles(query: string): Promise<Puzzle[]> {
  const saved = cache.get(query);
  if (saved && saved.expiresAt > Date.now()) return saved.puzzles;
  const existing = pending.get(query);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch(`/api/puzzles${query}`, { cache: 'no-store' });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error('Puzzles could not be loaded. Please retry.');
    const body = await response.json();
    if (body.version !== 1 || !Array.isArray(body.puzzles)) throw new Error('Please update to load these puzzles.');
    const puzzles = body.puzzles.filter((p: Puzzle) => typeof p.id === 'string' && p.published === true) as Puzzle[];
    cache.set(query, { puzzles, expiresAt: Date.now() + lifetime });
    return puzzles;
  })();
  pending.set(query, request);
  try { return await request; } finally { pending.delete(query); }
}

export const getPublishedPuzzles = () => readPuzzles('');
export const getPublishedByCategory = (category: string) => readPuzzles(`?category=${encodeURIComponent(category)}`);
export async function getPuzzle(id: string): Promise<Puzzle | null> {
  const puzzles = await readPuzzles(`?id=${encodeURIComponent(id)}`);
  const puzzle = puzzles[0] ?? null;
  if (puzzle?.type === 'cipher') {
    const weekly = await getWeeklyContent();
    if (weekly.puzzle?.id === id) return weekly.puzzle;
  }
  return puzzle;
}

export interface WeeklyContent {
  puzzle: Puzzle | null;
  weekStart: string;
  phase: 'active' | 'hint' | 'closed';
  setBy: 'admin' | 'auto';
  serverTime: number;
}

export async function getWeeklyContent(): Promise<WeeklyContent> {
  const user = getFirebase().auth?.currentUser;
  const token = await user?.getIdToken();
  const response = await fetch('/api/puzzles/weekly', {
    cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('The weekly cipher could not be loaded. Please retry.');
  const body = await response.json();
  if (body.version !== 1 || !['active', 'hint', 'closed'].includes(body.phase)
    || typeof body.weekStart !== 'string' || typeof body.serverTime !== 'number') {
    throw new Error('Please update to load the weekly cipher.');
  }
  if (getFirebase().auth?.currentUser?.uid !== user?.uid) throw new Error('Your sign-in changed. Please retry.');
  return body;
}
