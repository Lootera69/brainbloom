import { type Puzzle, type PuzzleFormData, type CrosswordData } from "@/types/puzzle";
import { getFirebase } from "@/services/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

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

function puzzleFromFirestore(id: string, data: Record<string, unknown>): Puzzle {
  const puzzle: Puzzle = {
    id,
    type: data.type as Puzzle["type"],
    category: data.category as string,
    difficulty: data.difficulty as Puzzle["difficulty"],
    title: data.title as string,
    question: (data.question as string) ?? "",
    choices: (data.choices as string[]) ?? [],
    correctAnswer: (data.correctAnswer as string) ?? "",
    xpReward: data.xpReward as number,
    published: data.published as boolean,
    createdBy: data.createdBy as string,
    createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? (data.createdAt as number),
    lastModifiedBy: data.lastModifiedBy as string,
    updatedAt: (data.updatedAt as Timestamp)?.toMillis?.() ?? (data.updatedAt as number),
  };
  if (data.crosswordData) {
    puzzle.crosswordData = data.crosswordData as CrosswordData;
  }
  return puzzle;
}

function puzzleToFirestore(puzzle: Puzzle) {
  const data: Record<string, unknown> = {
    type: puzzle.type,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    title: puzzle.title,
    question: puzzle.question,
    choices: puzzle.choices,
    correctAnswer: puzzle.correctAnswer,
    xpReward: puzzle.xpReward,
    published: puzzle.published,
    createdBy: puzzle.createdBy,
    createdAt: Timestamp.fromMillis(puzzle.createdAt),
    lastModifiedBy: puzzle.lastModifiedBy,
    updatedAt: Timestamp.fromMillis(puzzle.updatedAt),
  };
  if (puzzle.crosswordData) {
    data.crosswordData = puzzle.crosswordData;
  }
  return data;
}

function isFirestoreAvailable() {
  const { db } = getFirebase();
  return !!db;
}

async function getFirestorePuzzles(): Promise<Puzzle[]> {
  const { db } = getFirebase();
  if (!db) return [];
  const q = query(collection(db, "puzzles"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => puzzleFromFirestore(d.id, d.data() as Record<string, unknown>));
}

export async function getPuzzles(): Promise<Puzzle[]> {
  if (isFirestoreAvailable()) {
    try {
      return await getFirestorePuzzles();
    } catch {
      return getLocalPuzzles();
    }
  }
  return getLocalPuzzles();
}

export async function getPublishedPuzzles(): Promise<Puzzle[]> {
  const all = await getPuzzles();
  return all.filter((p) => p.published);
}

export async function getPuzzle(id: string): Promise<Puzzle | null> {
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return getLocalPuzzles().find((p) => p.id === id) ?? null;
      const ref = doc(db, "puzzles", id);
      const snap = await getDoc(ref);
      if (snap.exists()) return puzzleFromFirestore(snap.id, snap.data() as Record<string, unknown>);
    } catch {
      return getLocalPuzzles().find((p) => p.id === id) ?? null;
    }
  }
  return getLocalPuzzles().find((p) => p.id === id) ?? null;
}

export async function createPuzzle(data: PuzzleFormData): Promise<Puzzle> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();
  const puzzle: Puzzle = {
    id: generateId(),
    ...data,
    published: false,
    createdBy: user,
    createdAt: now,
    lastModifiedBy: user,
    updatedAt: now,
  };

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = await addDoc(collection(db, "puzzles"), puzzleToFirestore(puzzle));
        return { ...puzzle, id: ref.id };
      }
    } catch {
      // fall through to localStorage
    }
  }

  const local = getLocalPuzzles();
  local.unshift(puzzle);
  saveLocalPuzzles(local);
  return puzzle;
}

export async function updatePuzzle(id: string, data: Partial<PuzzleFormData>): Promise<Puzzle | null> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        await updateDoc(ref, { ...data, lastModifiedBy: user, updatedAt: Timestamp.fromMillis(now) });
        const updated = await getDoc(ref);
        return puzzleFromFirestore(updated.id, updated.data() as Record<string, unknown>);
      }
    } catch {
      // fall through to localStorage
    }
  }

  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  local[idx] = { ...local[idx], ...data, lastModifiedBy: user, updatedAt: now };
  saveLocalPuzzles(local);
  return local[idx];
}

export async function deletePuzzle(id: string): Promise<boolean> {
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        await deleteDoc(ref);
        return true;
      }
    } catch {
      // fall through to localStorage
    }
  }

  const local = getLocalPuzzles();
  const filtered = local.filter((p) => p.id !== id);
  if (filtered.length === local.length) return false;
  saveLocalPuzzles(filtered);
  return true;
}

export async function togglePublish(id: string): Promise<Puzzle | null> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const current = snap.data() as { published: boolean };
        await updateDoc(ref, {
          published: !current.published,
          lastModifiedBy: user,
          updatedAt: Timestamp.fromMillis(now),
        });
        const updated = await getDoc(ref);
        return puzzleFromFirestore(updated.id, updated.data() as Record<string, unknown>);
      }
    } catch {
      // fall through to localStorage
    }
  }

  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  local[idx] = { ...local[idx], published: !local[idx].published, lastModifiedBy: user, updatedAt: now };
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
