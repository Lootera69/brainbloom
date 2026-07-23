import { type Puzzle, type PuzzleFormData, type CrosswordData, type SudokuData, type CipherData, type ReviewStatus, type ReviewComment } from "@/types/puzzle";
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
  increment,
} from "firebase/firestore";

const STORAGE_KEY = "brainbloom-puzzles";

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
    completedBy: (data.completedBy as number) ?? 0,
    correctExplanation: (data.correctExplanation as string) ?? undefined,
    incorrectExplanation: (data.incorrectExplanation as string) ?? undefined,
    imageUrl: (data.imageUrl as string) ?? undefined,
    lessonImageUrl: (data.lessonImageUrl as string) ?? undefined,
    acceptedAnswers: (data.acceptedAnswers as string[]) ?? undefined,
    reviewStatus: (data.reviewStatus as ReviewStatus) ?? "draft",
    reviewedBy: (data.reviewedBy as string) ?? undefined,
    reviewNote: (data.reviewNote as string) ?? undefined,
    reviewComments: (() => {
      const raw = data.reviewComments as ReviewComment[] | undefined;
      if (raw && Array.isArray(raw) && raw.length > 0) return raw;
      const note = data.reviewNote as string | undefined;
      if (note) return [{ text: note, author: (data.reviewedBy as string) || "unknown", timestamp: (data.updatedAt as Timestamp)?.toMillis?.() ?? (data.updatedAt as number) ?? 0 }];
      return undefined;
    })(),
    lessonContent: (data.lessonContent as string) ?? undefined,
    lessonOrder: (data.lessonOrder as number) ?? undefined,
    lessonGroup: (data.lessonGroup as string) ?? undefined,
    lessonGroupOrder: (data.lessonGroupOrder as number) ?? undefined,
    hintText: (data.hintText as string) ?? undefined,
    sharePrompt: (data.sharePrompt as string) ?? undefined,
  };
  if (data.crosswordData) {
    puzzle.crosswordData = data.crosswordData as CrosswordData;
  }
  if (data.sudokuData) {
    puzzle.sudokuData = data.sudokuData as SudokuData;
  }
  if (data.cipherData) {
    puzzle.cipherData = data.cipherData as CipherData;
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
    completedBy: puzzle.completedBy ?? 0,
    correctExplanation: puzzle.correctExplanation ?? null,
    incorrectExplanation: puzzle.incorrectExplanation ?? null,
    imageUrl: puzzle.imageUrl ?? null,
    lessonImageUrl: puzzle.lessonImageUrl ?? null,
    acceptedAnswers: puzzle.acceptedAnswers ?? null,
    reviewStatus: puzzle.reviewStatus ?? "draft",
    reviewedBy: puzzle.reviewedBy ?? null,
    reviewNote: puzzle.reviewNote ?? null,
    reviewComments: puzzle.reviewComments ?? null,
    lessonContent: puzzle.lessonContent ?? null,
    lessonOrder: puzzle.lessonOrder ?? null,
    lessonGroup: puzzle.lessonGroup ?? null,
    lessonGroupOrder: puzzle.lessonGroupOrder ?? null,
    hintText: puzzle.hintText ?? null,
    sharePrompt: puzzle.sharePrompt ?? null,
  };
  if (puzzle.crosswordData) {
    data.crosswordData = puzzle.crosswordData;
  }
  if (puzzle.sudokuData) {
    data.sudokuData = puzzle.sudokuData;
  }
  if (puzzle.cipherData) {
    data.cipherData = puzzle.cipherData;
  }
  return data;
}

function isFirestoreAvailable() {
  const { db } = getFirebase();
  return !!db;
}

let puzzlesCache: { data: Puzzle[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

async function getFirestorePuzzles(): Promise<Puzzle[]> {
  const { db } = getFirebase();
  if (!db) return [];
  const q = query(collection(db, "puzzles"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => puzzleFromFirestore(d.id, d.data() as Record<string, unknown>));
}

export function clearPuzzlesCache() {
  puzzlesCache = null;
}

export async function getPuzzles(): Promise<Puzzle[]> {
  if (puzzlesCache && Date.now() - puzzlesCache.ts < CACHE_TTL) {
    return puzzlesCache.data;
  }
  const local = getLocalPuzzles();
  if (!isFirestoreAvailable()) return local;

  try {
    const firestore = await getFirestorePuzzles();
    // Merge: prefer whichever version is newer by updatedAt
    const merged = [...firestore];
    const fsMap = new Map(merged.map((p) => [p.id, true]));
    for (const lp of local) {
      const idx = merged.findIndex((p) => p.id === lp.id);
      if (idx >= 0) {
        if (lp.updatedAt > merged[idx].updatedAt) merged[idx] = lp;
      } else {
        merged.push(lp);
      }
    }
    puzzlesCache = { data: merged, ts: Date.now() };
    return merged;
  } catch (e) {
    console.error("Firestore getPuzzles failed:", e);
    return local;
  }
}

export async function getPublishedPuzzles(): Promise<Puzzle[]> {
  const all = await getPuzzles();
  return all.filter((p) => p.published);
}

export async function categoryHasLessons(category: string): Promise<boolean> {
  const puzzles = await getPublishedByCategory(category);
  return puzzles.some((p) => p.lessonOrder != null);
}

export async function getPublishedByCategory(category: string): Promise<Puzzle[]> {
  const all = await getPublishedPuzzles();
  return all.filter((p) => p.category === category)
    .sort((a, b) => {
      const go = (a.lessonGroupOrder ?? 999) - (b.lessonGroupOrder ?? 999);
      if (go !== 0) return go;
      return (a.lessonOrder ?? 999) - (b.lessonOrder ?? 999);
    });
}

export async function getPuzzle(id: string): Promise<Puzzle | null> {
  // Check local first — avoids Firestore read for already-known puzzles
  const local = getLocalPuzzles().find((p) => p.id === id);
  if (local) return local;

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return null;
      const ref = doc(db, "puzzles", id);
      const snap = await getDoc(ref);
      if (snap.exists()) return puzzleFromFirestore(snap.id, snap.data() as Record<string, unknown>);
    } catch (e) {
      console.error("Firestore getPuzzle failed:", e);
    }
  }
  return null;
}

function syncToLocal(puzzle: Puzzle) {
  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === puzzle.id);
  if (idx >= 0) {
    local[idx] = puzzle;
  } else {
    local.unshift(puzzle);
  }
  saveLocalPuzzles(local);
}

export async function createPuzzle(data: PuzzleFormData): Promise<Puzzle> {
  const user = getStudioSession() || "unknown";
  const role = getStudioRole() || "contributor";
  const now = Date.now();
  let puzzle: Puzzle = {
    id: generateId(),
    ...data,
    published: false,
    reviewStatus: role === "admin" ? "approved" : "draft",
    completedBy: 0,
    correctExplanation: data.correctExplanation ?? undefined,
    incorrectExplanation: data.incorrectExplanation ?? undefined,
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
        puzzle = { ...puzzle, id: ref.id };
      }
    } catch (e) {
      console.error("Firestore createPuzzle failed:", e);
    }
  }

  syncToLocal(puzzle);
  clearPuzzlesCache();
  return puzzle;
}

export async function updatePuzzle(id: string, data: Partial<PuzzleFormData>): Promise<Puzzle | null> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();
  let updated: Puzzle | null = null;

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const clean = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
          await updateDoc(ref, { ...clean, lastModifiedBy: user, updatedAt: Timestamp.fromMillis(now) });
          const snap2 = await getDoc(ref);
          updated = puzzleFromFirestore(snap2.id, snap2.data() as Record<string, unknown>);
        }
      }
    } catch (e) {
      console.error("Firestore updatePuzzle failed:", e);
    }
  }

  if (updated) {
    syncToLocal(updated);
    clearPuzzlesCache();
    return updated;
  }

  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  local[idx] = { ...local[idx], ...data, lastModifiedBy: user, updatedAt: now };
  saveLocalPuzzles(local);
  clearPuzzlesCache();
  return local[idx];
}

export async function deletePuzzle(id: string): Promise<boolean> {
  const puzzle = await getPuzzle(id);
  if (puzzle?.published && !isAdmin()) {
    console.error("Contributors cannot delete live puzzles");
    return false;
  }
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        await deleteDoc(doc(db, "puzzles", id));
      }
    } catch (e) {
      console.error("Firestore deletePuzzle failed:", e);
    }
  }

  const local = getLocalPuzzles();
  const before = local.length;
  saveLocalPuzzles(local.filter((p) => p.id !== id));
  clearPuzzlesCache();
  return local.length !== before;
}

export async function togglePublish(id: string): Promise<Puzzle | null> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();
  let updated: Puzzle | null = null;

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const current = snap.data() as { published: boolean };
          await updateDoc(ref, {
            published: !current.published,
            lastModifiedBy: user,
            updatedAt: Timestamp.fromMillis(now),
          });
          const snap2 = await getDoc(ref);
          updated = puzzleFromFirestore(snap2.id, snap2.data() as Record<string, unknown>);
        }
      }
    } catch (e) {
      console.error("Firestore togglePublish failed:", e);
    }
  }

  if (updated) {
    syncToLocal(updated);
    clearPuzzlesCache();
    return updated;
  }

  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  local[idx] = { ...local[idx], published: !local[idx].published, lastModifiedBy: user, updatedAt: now };
  saveLocalPuzzles(local);
  clearPuzzlesCache();
  return local[idx];
}

export async function incrementCompleted(id: string): Promise<void> {
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        await updateDoc(ref, { completedBy: increment(1) });
      }
    } catch (e) {
      console.error("Firestore incrementCompleted failed:", e);
    }
  }
  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx >= 0) {
    local[idx] = { ...local[idx], completedBy: (local[idx].completedBy ?? 0) + 1 };
    saveLocalPuzzles(local);
  }
}

export function isAdmin(): boolean {
  return getStudioRole() === "admin";
}

export function getStudioRole(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem("studio-role");
}

export function setStudioRole(role: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem("studio-role", role);
}

export function clearStudioRole() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem("studio-role");
}

export async function updatePuzzleReview(
  id: string,
  reviewStatus: ReviewStatus,
  reviewNote?: string,
): Promise<Puzzle | null> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();
  let updated: Puzzle | null = null;

  const newComment: ReviewComment | undefined = reviewNote
    ? { text: reviewNote, author: user, timestamp: now }
    : undefined;

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const isReview = reviewStatus === "approved" || reviewStatus === "rejected" || reviewStatus === "needs-discussion";
          const existing = (snap.data()?.reviewComments as ReviewComment[] | undefined) ?? [];
          const updateData: Record<string, unknown> = {
            reviewStatus,
            reviewedBy: isReview ? user : null,
            lastModifiedBy: user,
            updatedAt: Timestamp.fromMillis(now),
          };
          if (newComment) {
            updateData.reviewComments = [...existing, newComment];
          }
          await updateDoc(ref, updateData);
          const snap2 = await getDoc(ref);
          updated = puzzleFromFirestore(snap2.id, snap2.data() as Record<string, unknown>);
        }
      }
    } catch (e) {
      console.error("Firestore updatePuzzleReview failed:", e);
    }
  }

  if (updated) {
    syncToLocal(updated);
    clearPuzzlesCache();
    return updated;
  }

  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const isReview = reviewStatus === "approved" || reviewStatus === "rejected" || reviewStatus === "needs-discussion";
  const existing = local[idx].reviewComments ?? [];
  local[idx] = {
    ...local[idx],
    reviewStatus,
    reviewedBy: isReview ? user : undefined,
    reviewComments: newComment ? [...existing, newComment] : existing,
    lastModifiedBy: user,
    updatedAt: now,
  };
  saveLocalPuzzles(local);
  clearPuzzlesCache();
  return local[idx];
}

export async function updatePuzzleNote(id: string, note: string): Promise<void> {
  const user = getStudioSession() || "unknown";
  const now = Date.now();
  const comment: ReviewComment = { text: note, author: user, timestamp: now };

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const ref = doc(db, "puzzles", id);
        const snap = await getDoc(ref);
        const existing = snap.exists() ? (snap.data()?.reviewComments as ReviewComment[] | undefined) ?? [] : [];
        await updateDoc(ref, {
          reviewComments: [...existing, comment],
          lastModifiedBy: user,
          updatedAt: Timestamp.fromMillis(now),
        });
      }
    } catch (e) {
      console.error("Firestore updatePuzzleNote failed:", e);
    }
  }

  const local = getLocalPuzzles();
  const idx = local.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const existing = local[idx].reviewComments ?? [];
  local[idx] = {
    ...local[idx],
    reviewComments: [...existing, comment],
    lastModifiedBy: user,
    updatedAt: now,
  };
  saveLocalPuzzles(local);
  clearPuzzlesCache();
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
  sessionStorage.removeItem("studio-role");
}

export const CATEGORIES = [
  { value: "logic", label: "Logic" },
  { value: "riddles", label: "Riddles" },
  { value: "science", label: "Science" },
  { value: "puzzles", label: "Puzzles" },
  { value: "wonders", label: "Wonders" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy", xp: 10 },
  { value: "medium", label: "Medium", xp: 25 },
  { value: "hard", label: "Hard", xp: 50 },
];

export async function getUsedLessonOrders(category: string, lessonGroup: string): Promise<number[]> {
  const all = await getPublishedPuzzles();
  return all
    .filter((p) => p.category === category && p.lessonGroup === lessonGroup && p.lessonOrder != null)
    .map((p) => p.lessonOrder as number);
}
