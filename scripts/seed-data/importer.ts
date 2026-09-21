"use client";

import { type Puzzle, type PuzzleFormData, type PuzzleType, type Difficulty, type CipherData, type StoryData } from "@/types/puzzle";
import { getFirebase } from "@/services/firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { addLessonGroup, type LessonGroupEntry } from "@/services/lesson-service";

const STORAGE_KEY = "brainbloom-puzzles";
const LESSON_STORAGE_KEY = "brainbloom-lesson-groups";

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isFirestoreAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const { db } = getFirebase();
  return !!db;
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

function saveLocalPuzzles(puzzles: Puzzle[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
    return true;
  } catch (e) {
    // 5k+ puzzles exceed the ~5MB localStorage quota. Firestore remains the
    // source of truth; the app falls back to it automatically.
    console.warn("Local puzzle cache skipped (storage quota):", e);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
}

export interface SeedPuzzleInput {
  type: PuzzleType;
  category: string;
  difficulty: Difficulty;
  title: string;
  question: string;
  choices?: string[];
  correctAnswer?: string;
  acceptedAnswers?: string[];
  xpReward: number;
  lessonContent?: string;
  lessonGroup?: string;
  lessonOrder?: number;
  lessonGroupOrder?: number;
  correctExplanation?: string;
  incorrectExplanation?: string;
  hintText?: string;
  imageUrl?: string;
  lessonImageUrl?: string;
  sharePrompt?: string;
  cipherData?: CipherData;
  storyData?: StoryData;
}

export interface SeedData {
  lessonGroups: Omit<LessonGroupEntry, "createdAt" | "createdBy">[];
  puzzles: SeedPuzzleInput[];
}

function seedPuzzleToFormData(input: SeedPuzzleInput): PuzzleFormData {
  return {
    type: input.type,
    category: input.category,
    difficulty: input.difficulty,
    title: input.title,
    question: input.question,
    choices: input.choices ?? [],
    correctAnswer: input.correctAnswer ?? "",
    acceptedAnswers: input.acceptedAnswers,
    xpReward: input.xpReward,
    lessonContent: input.lessonContent,
    lessonOrder: input.lessonOrder,
    lessonGroup: input.lessonGroup,
    lessonGroupOrder: input.lessonGroupOrder,
    correctExplanation: input.correctExplanation,
    incorrectExplanation: input.incorrectExplanation,
    hintText: input.hintText,
    imageUrl: input.imageUrl,
    lessonImageUrl: input.lessonImageUrl,
    sharePrompt: input.sharePrompt,
    cipherData: input.cipherData,
    storyData: input.storyData,
  };
}

function buildPuzzle(data: PuzzleFormData, id: string): Puzzle {
  const now = Date.now();
  return {
    id,
    ...data,
    published: true,
    reviewStatus: "approved",
    completedBy: 0,
    createdBy: "seed-admin",
    createdAt: now,
    lastModifiedBy: "seed-admin",
    updatedAt: now,
    choices: data.choices ?? [],
  };
}

export async function importPuzzleToStore(puzzle: Puzzle): Promise<void> {
  const local = getLocalPuzzles();
  const existingIdx = local.findIndex((p) => p.id === puzzle.id);
  if (existingIdx >= 0) {
    local[existingIdx] = puzzle;
  } else {
    local.push(puzzle);
  }
  saveLocalPuzzles(local);

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return;
      const ref = await addDoc(collection(db, "puzzles"), {
        type: puzzle.type,
        category: puzzle.category,
        difficulty: puzzle.difficulty,
        title: puzzle.title,
        question: puzzle.question,
        choices: puzzle.choices,
        correctAnswer: puzzle.correctAnswer,
        acceptedAnswers: puzzle.acceptedAnswers ?? null,
        xpReward: puzzle.xpReward,
        published: true,
        reviewStatus: "approved",
        reviewedBy: null,
        reviewNote: null,
        completedBy: 0,
        correctExplanation: puzzle.correctExplanation ?? null,
        incorrectExplanation: puzzle.incorrectExplanation ?? null,
        imageUrl: puzzle.imageUrl ?? null,
        lessonImageUrl: puzzle.lessonImageUrl ?? null,
        lessonContent: puzzle.lessonContent ?? null,
        lessonOrder: puzzle.lessonOrder ?? null,
        lessonGroup: puzzle.lessonGroup ?? null,
        lessonGroupOrder: puzzle.lessonGroupOrder ?? null,
        hintText: puzzle.hintText ?? null,
        sharePrompt: puzzle.sharePrompt ?? null,
        cipherData: puzzle.cipherData ?? null,
        storyData: puzzle.storyData ?? null,
        createdBy: "seed-admin",
        createdAt: Timestamp.fromMillis(puzzle.createdAt),
        lastModifiedBy: "seed-admin",
        updatedAt: Timestamp.fromMillis(puzzle.updatedAt),
      });
      // Update local with Firestore ID
      const idx = getLocalPuzzles().findIndex((p) => p.id === puzzle.id);
      if (idx >= 0) {
        const localPuzzles = getLocalPuzzles();
        localPuzzles[idx] = { ...localPuzzles[idx], id: ref.id };
        saveLocalPuzzles(localPuzzles);
      }
    } catch (e) {
      console.error("Firestore import failed:", e);
    }
  }
}

export async function clearAllPuzzles(): Promise<{ local: number; firestore: number }> {
  let localCount = 0;
  let firestoreCount = 0;

  const local = getLocalPuzzles();
  localCount = local.length;
  saveLocalPuzzles([]);

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return { local: localCount, firestore: 0 };
      const snap = await getDocs(collection(db, "puzzles"));
      firestoreCount = snap.docs.length;
      // Chunked: a single commit caps at 500 writes, and re-seeds wipe 5k+.
      for (const chunk of splitIntoChunks(snap.docs, FIRESTORE_BATCH_LIMIT)) {
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(doc(db, "puzzles", d.id)));
        await batch.commit();
      }
    } catch (e) {
      console.error("Firestore clear failed:", e);
    }
  }

  return { local: localCount, firestore: firestoreCount };
}

export async function clearAllLessonGroups(): Promise<void> {
  localStorage.removeItem(LESSON_STORAGE_KEY);
  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (!db) return;
      const ref = doc(db, "settings", "lesson-groups");
      await deleteDoc(ref);
    } catch (e) {
      console.error("Firestore clear lesson groups failed:", e);
    }
  }
}

export async function seedLessonGroups(groups: Omit<LessonGroupEntry, "createdAt" | "createdBy">[]): Promise<number> {
  let count = 0;
  for (const g of groups) {
    const added = await addLessonGroup(g.category, g.name, g.order, "seed-admin");
    if (added) count++;
  }
  return count;
}

export const FIRESTORE_BATCH_LIMIT = 400;

/** Split an array into chunks of at most `size` (pure, unit-tested). */
export function splitIntoChunks<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Flatten a Puzzle into its Firestore document shape (pure, unit-tested). */
export function puzzleToFirestoreData(puzzle: Puzzle): Record<string, unknown> {
  return {
    type: puzzle.type,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    title: puzzle.title,
    question: puzzle.question,
    choices: puzzle.choices,
    correctAnswer: puzzle.correctAnswer,
    acceptedAnswers: puzzle.acceptedAnswers ?? null,
    xpReward: puzzle.xpReward,
    published: true,
    reviewStatus: "approved",
    reviewedBy: null,
    reviewNote: null,
    completedBy: 0,
    correctExplanation: puzzle.correctExplanation ?? null,
    incorrectExplanation: puzzle.incorrectExplanation ?? null,
    imageUrl: puzzle.imageUrl ?? null,
    lessonImageUrl: puzzle.lessonImageUrl ?? null,
    lessonContent: puzzle.lessonContent ?? null,
    lessonOrder: puzzle.lessonOrder ?? null,
    lessonGroup: puzzle.lessonGroup ?? null,
    lessonGroupOrder: puzzle.lessonGroupOrder ?? null,
    hintText: puzzle.hintText ?? null,
    sharePrompt: puzzle.sharePrompt ?? null,
    cipherData: puzzle.cipherData ?? null,
    storyData: puzzle.storyData ?? null,
    createdBy: "seed-admin",
    createdAt: Timestamp.fromMillis(puzzle.createdAt),
    lastModifiedBy: "seed-admin",
    updatedAt: Timestamp.fromMillis(puzzle.updatedAt),
  };
}

export async function seedPuzzles(
  inputs: SeedPuzzleInput[],
  onProgress?: (message: string) => void,
): Promise<number> {
  const puzzles = inputs.map((input) =>
    buildPuzzle(seedPuzzleToFormData(input), generateId()),
  );

  if (isFirestoreAvailable()) {
    try {
      const { db } = getFirebase();
      if (db) {
        const col = collection(db, "puzzles");
        // Pre-generate doc refs so local IDs match Firestore IDs (prevents
        // merged duplicates in getPuzzles, which keys on id).
        const refs = puzzles.map(() => doc(col));
        const chunks = splitIntoChunks(
          refs.map((ref, i) => ({ ref, puzzle: puzzles[i] })),
          FIRESTORE_BATCH_LIMIT,
        );
        let done = 0;
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(({ ref, puzzle }) =>
            batch.set(ref, puzzleToFirestoreData(puzzle)),
          );
          await batch.commit();
          done += chunk.length;
          onProgress?.(`Imported ${done} puzzles...`);
        }
        puzzles.forEach((p, i) => {
          p.id = refs[i].id;
        });
      }
    } catch (e) {
      console.error("Firestore batched import failed:", e);
    }
  }

  // Local snapshot in one write (fast even for 5k+ items).
  const cached = saveLocalPuzzles(puzzles);
  if (!cached) {
    onProgress?.(
      "Note: browser cache skipped (quota) — Firestore holds all puzzles.",
    );
  }
  return puzzles.length;
}

export async function runSeed(data: SeedData, onProgress?: (message: string) => void): Promise<void> {
  const log = onProgress || ((m: string) => console.log(m));

  log("Clearing existing lesson groups...");
  await clearAllLessonGroups();

  log("Creating lesson groups...");
  const groupsCreated = await seedLessonGroups(data.lessonGroups);
  log(`Created ${groupsCreated} lesson groups.`);

  log("Clearing existing puzzles...");
  const cleared = await clearAllPuzzles();
  log(`Cleared ${cleared.local} local + ${cleared.firestore} Firestore puzzles.`);

  log("Importing seed puzzles...");
  const imported = await seedPuzzles(data.puzzles);
  log(`Imported ${imported} puzzles.`);

  log("Seed complete!");
}

export async function resetAndSeed(data: SeedData, onProgress?: (message: string) => void): Promise<void> {
  await runSeed(data, onProgress);
}

// ============================================================================
// Additive cipher loader
// ============================================================================
// Unlike resetAndSeed (which wipes the whole bank), this upserts each cipher by
// a STABLE document id. Re-running it updates the existing cipher docs in place
// and never touches the ~5k Forge puzzles. Safe to run repeatedly.

/** A seed puzzle that carries its own stable Firestore document id. */
export interface IdentifiedSeedPuzzle extends SeedPuzzleInput {
  id: string;
}

/** Flatten an identified seed puzzle into its Firestore document shape. */
function seedInputToFirestoreData(input: IdentifiedSeedPuzzle): Record<string, unknown> {
  const now = Date.now();
  return {
    type: input.type,
    category: input.category,
    difficulty: input.difficulty,
    title: input.title,
    question: input.question,
    choices: input.choices ?? [],
    correctAnswer: input.correctAnswer ?? "",
    acceptedAnswers: input.acceptedAnswers ?? null,
    xpReward: input.xpReward,
    published: true,
    reviewStatus: "approved",
    reviewedBy: null,
    reviewNote: null,
    completedBy: 0,
    correctExplanation: input.correctExplanation ?? null,
    incorrectExplanation: input.incorrectExplanation ?? null,
    imageUrl: input.imageUrl ?? null,
    lessonImageUrl: input.lessonImageUrl ?? null,
    lessonContent: input.lessonContent ?? null,
    lessonOrder: input.lessonOrder ?? null,
    lessonGroup: input.lessonGroup ?? null,
    lessonGroupOrder: input.lessonGroupOrder ?? null,
    hintText: input.hintText ?? null,
    sharePrompt: input.sharePrompt ?? null,
    cipherData: input.cipherData ?? null,
    storyData: input.storyData ?? null,
    createdBy: "cipher-loader",
    createdAt: Timestamp.fromMillis(now),
    lastModifiedBy: "cipher-loader",
    updatedAt: Timestamp.fromMillis(now),
  };
}

/** Build the local-cache Puzzle mirror for an identified seed puzzle. */
function seedInputToLocalPuzzle(input: IdentifiedSeedPuzzle): Puzzle {
  const now = Date.now();
  return {
    id: input.id,
    type: input.type,
    category: input.category,
    difficulty: input.difficulty,
    title: input.title,
    question: input.question,
    choices: input.choices ?? [],
    correctAnswer: input.correctAnswer ?? "",
    acceptedAnswers: input.acceptedAnswers,
    xpReward: input.xpReward,
    published: true,
    reviewStatus: "approved",
    completedBy: 0,
    correctExplanation: input.correctExplanation,
    incorrectExplanation: input.incorrectExplanation,
    cipherData: input.cipherData,
    createdBy: "cipher-loader",
    createdAt: now,
    lastModifiedBy: "cipher-loader",
    updatedAt: now,
  };
}

export interface CipherLoadResult {
  upserted: number;
  strays: string[]; // ids of cipher docs NOT in the managed set
}

/**
 * Upsert cipher puzzles into Firestore by their stable ids (additive).
 * Optionally reports any pre-existing cipher docs whose ids are not in the
 * managed set, so the caller can offer cleanup without wiping anything.
 */
export async function upsertCiphers(
  ciphers: IdentifiedSeedPuzzle[],
  onProgress?: (message: string) => void,
): Promise<CipherLoadResult> {
  const log = onProgress ?? (() => {});
  const managedIds = new Set(ciphers.map((c) => c.id));
  const strays: string[] = [];

  if (isFirestoreAvailable()) {
    const { db } = getFirebase();
    if (db) {
      // Detect stray ciphers already in the bank (e.g. from an old wipe-seed).
      try {
        const existing = await getDocs(
          query(collection(db, "puzzles"), where("type", "==", "cipher")),
        );
        existing.forEach((d) => {
          if (!managedIds.has(d.id)) strays.push(d.id);
        });
        log(
          `Found ${existing.size} existing cipher docs (${strays.length} outside the managed set).`,
        );
      } catch (e) {
        // A missing composite index or rules issue should not abort the upsert.
        log(`Could not scan existing ciphers (continuing): ${e instanceof Error ? e.message : e}`);
      }

      // Upsert in batches, using set() on a fixed doc id (create-or-overwrite).
      const chunks = splitIntoChunks(ciphers, FIRESTORE_BATCH_LIMIT);
      let done = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((c) =>
          batch.set(doc(db, "puzzles", c.id), seedInputToFirestoreData(c)),
        );
        await batch.commit();
        done += chunk.length;
        log(`Loaded ${done}/${ciphers.length} ciphers...`);
      }
    }
  } else {
    log("Firestore unavailable — writing ciphers to local cache only.");
  }

  // Mirror into the local cache so the change shows without a full refetch.
  const local = getLocalPuzzles();
  for (const c of ciphers) {
    const mirror = seedInputToLocalPuzzle(c);
    const idx = local.findIndex((p) => p.id === c.id);
    if (idx >= 0) local[idx] = mirror;
    else local.push(mirror);
  }
  saveLocalPuzzles(local);

  return { upserted: ciphers.length, strays };
}

/**
 * Delete cipher docs by id (used to clear strays reported by upsertCiphers).
 * Only ever call with ids the caller confirmed are ciphers — never bulk.
 */
export async function deleteCiphersByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  // Drop from local cache first.
  const local = getLocalPuzzles();
  const remaining = local.filter((p) => !ids.includes(p.id));
  saveLocalPuzzles(remaining);

  if (isFirestoreAvailable()) {
    const { db } = getFirebase();
    if (db) {
      for (const chunk of splitIntoChunks(ids, FIRESTORE_BATCH_LIMIT)) {
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.delete(doc(db, "puzzles", id)));
        await batch.commit();
      }
    }
  }
  return ids.length;
}
