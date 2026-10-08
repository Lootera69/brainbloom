import { expect, it, vi } from 'vitest';
import { currentDailyPuzzles, currentWeeklyCipher } from '@/lib/server/puzzle-selection';
import { selectDailySet, type PuzzleCandidate } from '@/lib/server/player-puzzles';

const now = Date.parse('2026-10-08T10:00:00Z');
const quiz = { type: 'multiple-choice', category: 'logic', title: 'Question', published: true,
  choices: ['A', 'B'], correctAnswer: 'B', xpReward: 20 };

function fixture(count = 1000) {
  const candidates: PuzzleCandidate[] = Array.from({ length: count }, (_, i) => ({
    id: `puzzle-${i}`, category: 'logic', type: 'multiple-choice',
  }));
  const docs = new Map<string, Record<string, unknown>>(candidates.map((candidate) => [`puzzles/${candidate.id}`, { ...quiz }]));
  const get = vi.fn(async (path: string) => docs.get(path));
  const getAll = vi.fn(async (paths: (string | null)[]) => paths.map((path) => path === null ? undefined : docs.get(path)));
  const reader = { get, getAll, publishedPuzzles: vi.fn(async () => candidates) };
  return { candidates, docs, reader, readIds: () => getAll.mock.calls.flatMap(([paths]) => paths) };
}

it('selects from cached metadata and reads only the three actual Daily Set records', async () => {
  const { reader, readIds } = fixture();
  const selected = await currentDailyPuzzles(reader, now);
  expect(selected).toHaveLength(3);
  expect(readIds()).toEqual(selected.map((puzzle) => `puzzles/${puzzle.id}`));
});

it('drops withdrawn cached candidates and fills the set with freshly validated replacements', async () => {
  const { reader, candidates, docs, readIds } = fixture();
  const withdrawn = selectDailySet(candidates, now, undefined);
  for (const id of withdrawn) docs.set(`puzzles/${id}`, { ...quiz, published: false });
  const selected = await currentDailyPuzzles(reader, now);
  expect(selected).toHaveLength(3);
  expect(selected.every((puzzle) => !withdrawn.includes(puzzle.id))).toBe(true);
  expect(readIds()).toHaveLength(6);
});

it('honors a fresh admin pin even when it is absent from the cached catalogue', async () => {
  const { reader, docs } = fixture();
  docs.set('settings/daily-puzzle', { date: '2026-10-08', puzzleId: 'new-pin' });
  docs.set('puzzles/new-pin', { ...quiz, xpReward: 77 });
  const selected = await currentDailyPuzzles(reader, now);
  expect(selected[0]).toMatchObject({ id: 'new-pin', xpReward: 77 });
  expect(selected).toHaveLength(3);
  expect(reader.get).toHaveBeenCalledWith('puzzles/new-pin');
});

it('keeps category preferences after a cached candidate changes category', async () => {
  const { reader, candidates, docs } = fixture();
  const changed = selectDailySet(candidates, now, undefined, ['logic'])[0];
  docs.set(`puzzles/${changed}`, { ...quiz, category: 'science' });
  const selected = await currentDailyPuzzles(reader, now, ['logic']);
  expect(selected).toHaveLength(3);
  expect(selected.every((puzzle) => puzzle.category === 'logic')).toBe(true);
});

it('bounds replacement reads when the cached catalogue has become unusable', async () => {
  const { reader, docs, readIds } = fixture();
  docs.clear();
  await expect(currentDailyPuzzles(reader, now)).rejects.toThrow('temporarily unavailable');
  expect(readIds().length).toBeLessThanOrEqual(9);
});

it('reads a pinned cipher fresh and never serves one that has been unpublished', async () => {
  const { reader, candidates, docs } = fixture(2);
  candidates.forEach((candidate) => { candidate.type = 'cipher'; });
  candidates.forEach((candidate) => docs.set(`puzzles/${candidate.id}`, { ...quiz, type: 'cipher' }));
  docs.set('settings/weekly-cipher', { weekStart: '2026-10-04', puzzleId: 'new-cipher' });
  docs.set('puzzles/new-cipher', { ...quiz, type: 'cipher', correctAnswer: 'secret phrase' });
  expect((await currentWeeklyCipher(reader, now)).puzzle).toMatchObject({ id: 'new-cipher', correctAnswer: 'secret phrase' });
  docs.set('puzzles/new-cipher', { ...quiz, type: 'cipher', published: false });
  expect((await currentWeeklyCipher(reader, now)).puzzle?.id).not.toBe('new-cipher');
});
