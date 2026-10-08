import { cipherWeek, dailyEligible, readScoringPuzzle, selectCipher, selectDailySet,
  type PuzzleCandidate, type ScoringPuzzle } from '@/lib/server/player-puzzles';

type Data = Record<string, unknown>;
interface PuzzleReader {
  get(path: string): Promise<Data | undefined>;
  getAll(paths: (string | null)[]): Promise<(Data | undefined)[]>;
  publishedPuzzles(): Promise<PuzzleCandidate[]>;
}

async function candidatesWithPin(reader: PuzzleReader, path: string, current: (pin: Data) => boolean) {
  const [candidates, pin] = await Promise.all([reader.publishedPuzzles(), reader.get(path)]);
  const pool = new Map(candidates.map((puzzle) => [puzzle.id, puzzle]));
  const checked = new Map<string, ScoringPuzzle | null>();
  if (pin && current(pin) && typeof pin.puzzleId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(pin.puzzleId)) {
    const puzzle = readScoringPuzzle(pin.puzzleId, await reader.get(`puzzles/${pin.puzzleId}`));
    checked.set(pin.puzzleId, puzzle);
    if (puzzle) pool.set(puzzle.id, puzzle);
    else pool.delete(pin.puzzleId);
  }
  return { pool, checked, pin };
}

async function checkSelected(reader: PuzzleReader, ids: string[], checked: Map<string, ScoringPuzzle | null>) {
  const missing = ids.filter((id) => !checked.has(id));
  const records = await reader.getAll(missing.map((id) => `puzzles/${id}`));
  missing.forEach((id, index) => checked.set(id, readScoringPuzzle(id, records[index])));
  return ids.map((id) => checked.get(id) ?? null);
}

export async function currentDailyPuzzles(reader: PuzzleReader, now: number, categories: string[] = []) {
  const { pool, checked, pin } = await candidatesWithPin(reader, 'settings/daily-puzzle',
    (value) => value.date === new Date(now).toISOString().slice(0, 10));
  let selected: ScoringPuzzle[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const ids = selectDailySet([...pool.values()], now, pin, categories);
    const puzzles = await checkSelected(reader, ids, checked);
    selected = [];
    let changed = false;
    for (let index = 0; index < ids.length; index++) {
      const puzzle = puzzles[index];
      const candidate = pool.get(ids[index]);
      if (!puzzle || !dailyEligible(puzzle)) {
        pool.delete(ids[index]);
        changed = true;
      } else {
        pool.set(puzzle.id, puzzle);
        if (candidate?.category !== puzzle.category) changed = true;
        if (!categories.length || categories.includes(puzzle.category)) selected.push(puzzle);
      }
    }
    if (!changed) return puzzles.filter((puzzle) => puzzle !== null) as ScoringPuzzle[];
  }
  if (!selected.length && checked.size > 0) throw new Error('The Daily Set is temporarily unavailable.');
  return selected;
}

export async function currentWeeklyCipher(reader: PuzzleReader, now: number) {
  const { pool, checked, pin } = await candidatesWithPin(reader, 'settings/weekly-cipher',
    (value) => value.weekStart === cipherWeek(now));
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = selectCipher([...pool.values()], now, pin);
    if (!id) return { puzzle: null, pin };
    const [puzzle] = await checkSelected(reader, [id], checked);
    if (puzzle?.type === 'cipher') return { puzzle, pin };
    pool.delete(id);
  }
  throw new Error('The weekly cipher is temporarily unavailable.');
}
