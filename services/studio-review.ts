"use client";

import { collection, doc, getDocsFromServer, query, runTransaction, Timestamp, where } from "firebase/firestore";
import { canReviewRole } from "@/lib/staff-access";
import { getFirebase } from "@/services/firebase";
import { clearPuzzlesCache, getStudioRole, puzzleFromFirestore } from "@/services/puzzle-service";
import type { Puzzle, ReviewComment } from "@/types/puzzle";

export type ReviewDecision = "approved" | "rejected" | "needs-discussion";

const submissionBaselines = new WeakMap<Puzzle, string>();

function canonicalSnapshot(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array:[${value.map(canonicalSnapshot).join(",")}]`;
  if (typeof value === "object") {
    const type = Object.getPrototypeOf(value)?.constructor?.name ?? "Object";
    const fields = value as Record<string, unknown>;
    return `${type}:{${Object.keys(fields).sort().map((key) => `${JSON.stringify(key)}:${canonicalSnapshot(fields[key])}`).join(",")}}`;
  }
  if (typeof value === "number") return `number:${Object.is(value, -0) ? "-0" : String(value)}`;
  return `${typeof value}:${JSON.stringify(value)}`;
}

function reviewedSnapshot(id: string, data: Record<string, unknown>): Puzzle {
  const puzzle = puzzleFromFirestore(id, data);
  submissionBaselines.set(puzzle, canonicalSnapshot(data));
  return puzzle;
}

function reviewContext() {
  const { db, auth } = getFirebase();
  const user = auth?.currentUser;
  const role = getStudioRole();
  if (!db || !auth || !user?.emailVerified || (role !== "admin" && role !== "reviewer") || !canReviewRole(role)) {
    throw new Error("Sign in with an active administrator or reviewer account.");
  }
  return { db, auth, uid: user.uid };
}

export function isAwaitingReview(puzzle: Pick<Puzzle, "published" | "reviewStatus">) {
  return puzzle.published === false && (puzzle.reviewStatus === "pending" || puzzle.reviewStatus === "needs-discussion");
}

export async function loadReviewQueue(): Promise<Puzzle[]> {
  const { db, auth, uid } = reviewContext();
  const snapshots = await getDocsFromServer(query(collection(db, "puzzles"), where("published", "==", false), where("reviewStatus", "in", ["pending", "needs-discussion"])));
  if (auth.currentUser?.uid !== uid) throw new Error("Your Studio session changed. Sign in again.");
  return snapshots.docs.map((snapshot) => reviewedSnapshot(snapshot.id, snapshot.data()))
    .filter(isAwaitingReview).sort((a, b) => a.createdAt - b.createdAt);
}

export async function reviewSubmittedPuzzle(submission: Puzzle, decision: ReviewDecision, note: string): Promise<Puzzle> {
  if (!["approved", "rejected", "needs-discussion"].includes(decision)) throw new Error("Choose a review decision.");
  const text = note.trim();
  if (text.length > 2000) throw new Error("Keep the review note under 2,000 characters.");
  if (decision !== "approved" && !text) throw new Error("Add a note explaining the changes or discussion needed.");
  const { db, auth, uid } = reviewContext();
  const baseline = submissionBaselines.get(submission);
  if (!baseline) throw new Error("Refresh and open this submission before reviewing it.");
  const reference = doc(db, "puzzles", submission.id);
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (auth.currentUser?.uid !== uid) throw new Error("Your Studio session changed. Sign in again.");
    if (!snapshot.exists()) throw new Error("This submission is no longer available.");
    const puzzle = puzzleFromFirestore(snapshot.id, snapshot.data());
    if (!isAwaitingReview(puzzle)) throw new Error("This puzzle has already left the review queue. Refresh to see the latest submissions.");
    if (canonicalSnapshot(snapshot.data()) !== baseline) throw new Error("This submission changed since you opened it. Refresh and review the latest version.");
    const now = Date.now();
    const update: Record<string, unknown> = { reviewStatus: decision, reviewedBy: uid, lastModifiedBy: uid, updatedAt: Timestamp.fromMillis(now) };
    if (text) {
      const comment: ReviewComment = { text, author: uid, timestamp: now };
      const existing = snapshot.data().reviewComments;
      update.reviewComments = [...(Array.isArray(existing) ? existing : []), comment];
    }
    transaction.update(reference, update);
    return reviewedSnapshot(snapshot.id, { ...snapshot.data(), ...update });
  });
  clearPuzzlesCache();
  return result;
}
