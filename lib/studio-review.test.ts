import { beforeEach, expect, it, vi } from "vitest";
import { isAwaitingReview, loadReviewQueue, reviewSubmittedPuzzle, type ReviewDecision } from "@/services/studio-review";
import type { Puzzle } from "@/types/puzzle";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "reviewer", emailVerified: true } as { uid: string; emailVerified: boolean } | null },
  role: "reviewer", db: {} as object | null, getDocs: vi.fn(), get: vi.fn(), update: vi.fn(), transaction: vi.fn(), clear: vi.fn(),
}));
vi.mock("@/services/firebase", () => ({ getFirebase: () => ({ db: mocks.db, auth: mocks.auth }) }));
vi.mock("@/services/puzzle-service", () => ({
  getStudioRole: () => mocks.role, clearPuzzlesCache: mocks.clear,
  puzzleFromFirestore: (id: string, data: Record<string, unknown>) => ({ id, ...data }),
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name, doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  query: (...constraints: unknown[]) => constraints, where: (...constraint: unknown[]) => constraint,
  getDocsFromServer: mocks.getDocs, runTransaction: mocks.transaction,
  Timestamp: { fromMillis: (value: number) => value },
}));

const submission = { published: false, reviewStatus: "pending", title: "Submitted puzzle", createdAt: 5, createdBy: "contributor", reviewComments: [{ text: "Original note", author: "contributor", timestamp: 1 }] };
function snapshot(data: Record<string, unknown>) { return { id: "puzzle", exists: () => true, data: () => data }; }

async function submit(decision: ReviewDecision, note: string) {
  const [puzzle] = await loadReviewQueue();
  return reviewSubmittedPuzzle(puzzle, decision, note);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = { uid: "reviewer", emailVerified: true };
  mocks.role = "reviewer"; mocks.db = {};
  mocks.get.mockResolvedValue(snapshot(submission));
  mocks.transaction.mockImplementation(async (_db, operation) => operation({ get: mocks.get, update: mocks.update }));
  mocks.getDocs.mockResolvedValue({ docs: [snapshot(submission)] });
});

it("queries only unpublished submitted content from the server", async () => {
  expect(await loadReviewQueue()).toEqual([{ id: "puzzle", ...submission }]);
  expect(mocks.getDocs).toHaveBeenCalledExactlyOnceWith(["puzzles", ["published", "==", false], ["reviewStatus", "in", ["pending", "needs-discussion"]]]);
});

it("rejects contributors, unverified accounts, and unavailable Firebase", async () => {
  mocks.role = "contributor";
  await expect(loadReviewQueue()).rejects.toThrow("administrator or reviewer");
  await expect(submit("approved", "")).rejects.toThrow("administrator or reviewer");
  mocks.role = "reviewer"; mocks.auth.currentUser!.emailVerified = false;
  await expect(loadReviewQueue()).rejects.toThrow("administrator or reviewer");
  mocks.auth.currentUser!.emailVerified = true; mocks.db = null;
  await expect(loadReviewQueue()).rejects.toThrow("administrator or reviewer");
  expect(mocks.getDocs).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("approval writes only review metadata and never publishes content", async () => {
  const result = await submit("approved", "Looks correct.");
  const update = mocks.update.mock.calls[0][1];
  expect(Object.keys(update).sort()).toEqual(["lastModifiedBy", "reviewComments", "reviewStatus", "reviewedBy", "updatedAt"]);
  expect(update).toMatchObject({ reviewStatus: "approved", reviewedBy: "reviewer", lastModifiedBy: "reviewer" });
  expect(update.reviewComments).toEqual([submission.reviewComments[0], { text: "Looks correct.", author: "reviewer", timestamp: expect.any(Number) }]);
  expect(result.published).toBe(false);
  expect(mocks.get).toHaveBeenCalledTimes(1);
  expect(mocks.clear).toHaveBeenCalledTimes(1);
});

it("requires explanatory feedback for rejected and discussion decisions", async () => {
  await expect(submit("rejected", " ")).rejects.toThrow("Add a note");
  await expect(submit("needs-discussion", "")).rejects.toThrow("Add a note");
  await expect(submit("approved", "x".repeat(2001))).rejects.toThrow("2,000");
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("rechecks the submission state inside the transaction", async () => {
  for (const state of [{ published: true, reviewStatus: "pending" }, { published: false, reviewStatus: "approved" }, { published: false, reviewStatus: "draft" }, { published: false, reviewStatus: "rejected" }]) {
    mocks.get.mockResolvedValue(snapshot({ ...submission, ...state }));
    await expect(submit("approved", "")).rejects.toThrow("already left the review queue");
  }
  expect(mocks.update).not.toHaveBeenCalled();
});

it("preserves a denied or failed write as an error without local success", async () => {
  mocks.transaction.mockRejectedValue(new Error("permission-denied"));
  await expect(submit("approved", "")).rejects.toThrow("permission-denied");
  expect(mocks.clear).not.toHaveBeenCalled();
});

it("does not approve content changed since the reviewer opened it", async () => {
  mocks.get.mockResolvedValue(snapshot({ ...submission, updatedAt: 10, question: "New wording" }));
  await expect(submit("approved", "")).rejects.toThrow("changed since you opened it");
  expect(mocks.update).not.toHaveBeenCalled();
});

it("rejects content changes even when the author preserves the original timestamp", async () => {
  const [puzzle] = await loadReviewQueue();
  mocks.get.mockResolvedValue(snapshot({ ...submission, title: "Unreviewed replacement" }));
  await expect(reviewSubmittedPuzzle(puzzle, "approved", "")).rejects.toThrow("changed since you opened it");
  expect(mocks.update).not.toHaveBeenCalled();
});

it("rejects review objects that were not loaded through the review queue", async () => {
  await expect(reviewSubmittedPuzzle({ id: "puzzle", ...submission } as Puzzle, "approved", "")).rejects.toThrow("Refresh and open");
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("drops reads and reviews if the signed-in account changes mid-request", async () => {
  mocks.getDocs.mockImplementation(async () => { mocks.auth.currentUser = null; return { docs: [snapshot(submission)] }; });
  await expect(loadReviewQueue()).rejects.toThrow("session changed");
  mocks.auth.currentUser = { uid: "reviewer", emailVerified: true };
  mocks.getDocs.mockResolvedValue({ docs: [snapshot(submission)] });
  mocks.get.mockImplementation(async () => { mocks.auth.currentUser = { uid: "other", emailVerified: true }; return snapshot(submission); });
  await expect(submit("approved", "")).rejects.toThrow("session changed");
  expect(mocks.update).not.toHaveBeenCalled();
});

it("discussion stays in the queue while decisions leave it", async () => {
  expect(isAwaitingReview({ published: false, reviewStatus: "needs-discussion" })).toBe(true);
  expect(isAwaitingReview({ published: false, reviewStatus: "rejected" })).toBe(false);
  const result = await submit("needs-discussion", "Please clarify the wording.");
  expect(isAwaitingReview(result)).toBe(true);
  expect(result.published).toBe(false);
});
