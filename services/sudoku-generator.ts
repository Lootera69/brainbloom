import type { Difficulty, SudokuData } from "@/types/puzzle";

const SIZE = 9;
const BOX = 3;

const clueCounts: Record<Difficulty, number> = {
  easy: 40,
  medium: 30,
  hard: 24,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCandidates(grid: number[], pos: number): number[] {
  const row = Math.floor(pos / SIZE);
  const col = pos % SIZE;
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  const used = new Set<number>();
  for (let c = 0; c < SIZE; c++) used.add(grid[row * SIZE + c]);
  for (let r = 0; r < SIZE; r++) used.add(grid[r * SIZE + col]);
  for (let r = boxRow; r < boxRow + BOX; r++)
    for (let c = boxCol; c < boxCol + BOX; c++)
      used.add(grid[r * SIZE + c]);
  const candidates: number[] = [];
  for (let n = 1; n <= SIZE; n++) if (!used.has(n)) candidates.push(n);
  return candidates;
}

function fillGrid(grid: number[]): boolean {
  const empty = grid.indexOf(0);
  if (empty === -1) return true;
  const candidates = shuffle(getCandidates(grid, empty));
  for (const num of candidates) {
    grid[empty] = num;
    if (fillGrid(grid)) return true;
    grid[empty] = 0;
  }
  return false;
}

function countSolutions(grid: number[], limit: number = 2): number {
  const empty = grid.indexOf(0);
  if (empty === -1) return 1;
  let count = 0;
  const candidates = getCandidates(grid, empty);
  for (const num of candidates) {
    grid[empty] = num;
    count += countSolutions(grid, limit - count);
    grid[empty] = 0;
    if (count >= limit) break;
  }
  return count;
}

function generateCompleteGrid(): number[] {
  const grid = new Array(SIZE * SIZE).fill(0);
  fillGrid(grid);
  return grid;
}

export function generateSudoku(difficulty: Difficulty): SudokuData {
  const solution = generateCompleteGrid();
  const puzzle = [...solution];
  const targetClues = clueCounts[difficulty];
  const positions = shuffle([...Array(SIZE * SIZE).keys()]);

  let clues = SIZE * SIZE;
  for (const pos of positions) {
    if (clues <= targetClues) break;
    const backup = puzzle[pos];
    puzzle[pos] = 0;
    if (countSolutions(puzzle) === 1) {
      clues--;
    } else {
      puzzle[pos] = backup;
    }
  }

  return { puzzle, solution };
}

export function isValidSudokuMove(
  grid: number[],
  pos: number,
  num: number,
): boolean {
  const row = Math.floor(pos / SIZE);
  const col = pos % SIZE;
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  for (let c = 0; c < SIZE; c++)
    if (grid[row * SIZE + c] === num) return false;
  for (let r = 0; r < SIZE; r++)
    if (grid[r * SIZE + col] === num) return false;
  for (let r = boxRow; r < boxRow + BOX; r++)
    for (let c = boxCol; c < boxCol + BOX; c++)
      if (grid[r * SIZE + c] === num) return false;
  return true;
}

export function getSudokuErrors(
  cells: (number | null)[],
  solution: number[],
): Set<number> {
  const errors = new Set<number>();
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (cells[i] !== null && cells[i] !== solution[i]) {
      errors.add(i);
    }
  }
  return errors;
}

export function isSudokuComplete(cells: (number | null)[]): boolean {
  return cells.every((c) => c !== null && c > 0);
}
