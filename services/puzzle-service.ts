import { type Puzzle, type PuzzleFormData } from "@/types/puzzle";

const STORAGE_KEY = "brainbloom-puzzles";

const STUDIO_CREDENTIALS: Record<string, string> = {
  "alpha-2026": "bloom@123",
  "beta-2026": "bloom@456",
  "gamma-2026": "bloom@789",
};

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getLocalPuzzles(): Puzzle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPuzzles(puzzles: Puzzle[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
}

export async function getPuzzles(): Promise<Puzzle[]> {
  return getLocalPuzzles();
}

export async function getPublishedPuzzles(): Promise<Puzzle[]> {
  return getLocalPuzzles().filter((p) => p.published);
}

export async function getPuzzle(id: string): Promise<Puzzle | null> {
  return getLocalPuzzles().find((p) => p.id === id) ?? null;
}

export async function createPuzzle(data: PuzzleFormData): Promise<Puzzle> {
  const local = getLocalPuzzles();
  const user = getStudioSession() || "unknown";
  const puzzle: Puzzle = {
    id: generateId(),
    ...data,
    published: false,
    createdBy: user,
    createdAt: Date.now(),
    lastModifiedBy: user,
    updatedAt: Date.now(),
  };
  local.unshift(puzzle);
  saveLocalPuzzles(local);
  return puzzle;
}

export async function updatePuzzle(id: string, data: Partial<PuzzleFormData>): Promise<Puzzle | null> {
  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const user = getStudioSession() || "unknown";
  local[idx] = { ...local[idx], ...data, lastModifiedBy: user, updatedAt: Date.now() };
  saveLocalPuzzles(local);
  return local[idx];
}

export async function deletePuzzle(id: string): Promise<boolean> {
  const local = getLocalPuzzles();
  const filtered = local.filter((p) => p.id !== id);
  if (filtered.length === local.length) return false;
  saveLocalPuzzles(filtered);
  return true;
}

export async function togglePublish(id: string): Promise<Puzzle | null> {
  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const user = getStudioSession() || "unknown";
  local[idx] = { ...local[idx], published: !local[idx].published, lastModifiedBy: user, updatedAt: Date.now() };
  saveLocalPuzzles(local);
  return local[idx];
}

export function verifyStudioCredentials(inviteCode: string, password: string): boolean {
  return STUDIO_CREDENTIALS[inviteCode] === password;
}

export function getStudioSession(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem("studio-authed");
}

export function setStudioSession(inviteCode: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem("studio-authed", inviteCode);
}

export function clearStudioSession() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem("studio-authed");
}

export const CATEGORIES = [
  { value: "logic", label: "Logic" },
  { value: "riddles", label: "Riddles" },
  { value: "science", label: "Science" },
  { value: "sudoku", label: "Sudoku" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy", xp: 10 },
  { value: "medium", label: "Medium", xp: 25 },
  { value: "hard", label: "Hard", xp: 50 },
];
