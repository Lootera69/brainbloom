import "server-only";
import { randomUUID } from "node:crypto";
import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { SEED_DISCOVER_LESSONS } from "@/lib/discover/seed";
import { discoverLessonSchema } from "@/lib/discover/validation";
import type { DiscoverLesson, DiscoverLessonInput } from "@/types/discover";

export class DiscoverError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export function readDiscoverDocument(document: Pick<DocumentSnapshot, "id" | "data">): DiscoverLesson | null {
  // Parsing explicitly strips arbitrary Firestore metadata from public responses.
  const parsed = discoverLessonSchema.safeParse({ ...document.data(), id: document.id });
  return parsed.success ? parsed.data : null;
}

export function sortDiscoverLessons(lessons: DiscoverLesson[]): DiscoverLesson[] {
  return [...lessons].sort((a, b) => Number(b.featured) - Number(a.featured) || b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
}

/** Drafts, malformed documents, and an intentionally emptied catalogue all suppress examples. */
async function hasStudioCatalogue(db: Firestore) {
  const [settings, anyLesson] = await Promise.all([
    db.doc("settings/discover").get(),
    db.collection("discover").limit(1).get(),
  ]);
  return settings.data()?.initialized === true || !anyLesson.empty;
}

export async function publicDiscoverLessons(db: Firestore | null) {
  if (!db) return { lessons: sortDiscoverLessons(SEED_DISCOVER_LESSONS), source: "starter" as const };
  const snapshot = await db.collection("discover").where("published", "==", true).get();
  const lessons = snapshot.docs.flatMap((document) => {
    const lesson = readDiscoverDocument(document);
    return lesson?.published ? [lesson] : [];
  });
  if (!snapshot.empty || await hasStudioCatalogue(db)) return { lessons: sortDiscoverLessons(lessons), source: "studio" as const };
  return { lessons: sortDiscoverLessons(SEED_DISCOVER_LESSONS), source: "starter" as const };
}

export async function publicDiscoverLesson(db: Firestore | null, id: string): Promise<DiscoverLesson | null> {
  if (db) {
    const snapshot = await db.doc(`discover/${id}`).get();
    if (snapshot.exists) {
      const lesson = readDiscoverDocument(snapshot);
      return lesson?.published ? lesson : null;
    }
    if (await hasStudioCatalogue(db)) return null;
  }
  return SEED_DISCOVER_LESSONS.find((lesson) => lesson.id === id) ?? null;
}

export async function studioDiscoverLessons(db: Firestore): Promise<DiscoverLesson[]> {
  const snapshot = await db.collection("discover").get();
  return sortDiscoverLessons(snapshot.docs.flatMap((document) => {
    const lesson = readDiscoverDocument(document);
    return lesson ? [lesson] : [];
  }));
}

export async function writeDiscoverLesson(db: Firestore, input: DiscoverLessonInput, uid: string, update?: { id: string; expectedUpdatedAt: number }): Promise<DiscoverLesson> {
  const id = update?.id ?? randomUUID();
  const ref = db.doc(`discover/${id}`);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (update && !existing.exists) throw new DiscoverError("This Discover lesson no longer exists. Reload Studio.", 404);
    if (!update && existing.exists) throw new DiscoverError("A lesson already uses this identifier. Try again.", 409);
    if (update && existing.data()?.updatedAt !== update.expectedUpdatedAt) {
      throw new DiscoverError("This lesson changed in another session. Reload it before saving.", 409);
    }
    const now = Math.max(Date.now(), (update?.expectedUpdatedAt ?? 0) + 1);
    const previousCreatedAt = existing.data()?.createdAt;
    const lesson: DiscoverLesson = {
      ...input, id, updatedAt: now,
      createdAt: typeof previousCreatedAt === "number" ? previousCreatedAt : now,
    };
    // Avoid undefined optional values, which Firestore refuses by default.
    transaction.set(ref, JSON.parse(JSON.stringify({ ...lesson, updatedBy: uid })));
    transaction.set(db.doc("settings/discover"), { initialized: true, updatedAt: now }, { merge: true });
    return lesson;
  });
}

export async function removeDiscoverLesson(db: Firestore, id: string, expectedUpdatedAt: number): Promise<void> {
  await db.runTransaction(async (transaction) => {
    const ref = db.doc(`discover/${id}`);
    const existing = await transaction.get(ref);
    if (!existing.exists) throw new DiscoverError("This Discover lesson no longer exists. Reload Studio.", 404);
    if (existing.data()?.updatedAt !== expectedUpdatedAt) throw new DiscoverError("This lesson changed in another session. Reload it before deleting.", 409);
    transaction.delete(ref);
    transaction.set(db.doc("settings/discover"), { initialized: true, updatedAt: Date.now() }, { merge: true });
  });
}

export async function importStarterDiscoverLessons(db: Firestore, uid: string) {
  const existing = await db.collection("discover").get();
  const existingTitles = new Set(existing.docs.map((document) => document.data().title).filter(Boolean));
  const batch = db.batch();
  const now = Date.now();
  let imported = 0;
  let skipped = 0;
  let repaired = 0;

  for (const [index, source] of SEED_DISCOVER_LESSONS.entries()) {
    const existingDoc = existing.docs.find((document) => document.id === source.id);
    if (existingDoc) {
      const current = existingDoc.data();
      const currentSteps = Array.isArray(current.steps) ? current.steps : [];
      const needsImages = currentSteps.length === source.steps.length && currentSteps.length > 0 && currentSteps.every((step) => step?.imageUrl === current.coverImageUrl || !step?.imageUrl);
      if (needsImages) {
        const steps = currentSteps.map((step, index) => ({ ...step, imageUrl: source.steps[index].imageUrl, imageAlt: step.imageAlt || source.steps[index].imageAlt }));
        batch.update(existingDoc.ref, { coverImageUrl: source.coverImageUrl, coverImageAlt: current.coverImageAlt || source.coverImageAlt, steps, updatedAt: now + index });
        repaired += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    if (existingTitles.has(source.title)) { skipped += 1; continue; }
    const ref = db.doc(`discover/${source.id}`);
    const lesson = { ...source, createdAt: now + index, updatedAt: now + index, updatedBy: uid };
    batch.set(ref, JSON.parse(JSON.stringify(lesson)));
    imported += 1;
  }

  if (imported > 0) {
    batch.set(db.doc("settings/discover"), { initialized: true, updatedAt: now }, { merge: true });
    await batch.commit();
  }
  return { imported, skipped, repaired };
}
