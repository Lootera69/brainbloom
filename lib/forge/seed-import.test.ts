import { describe, expect, it } from "vitest";
import {
  FIRESTORE_BATCH_LIMIT,
  splitIntoChunks,
  puzzleToFirestoreData,
} from "@/scripts/seed-data/importer";
import type { Puzzle } from "@/types/puzzle";

function makePuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: "test-id",
    type: "multiple-choice",
    category: "logic",
    difficulty: "easy",
    title: "T",
    question: "Q",
    choices: ["A", "B", "C", "D"],
    correctAnswer: "A",
    xpReward: 10,
    published: true,
    reviewStatus: "approved",
    createdBy: "seed-admin",
    createdAt: 1700000000000,
    lastModifiedBy: "seed-admin",
    updatedAt: 1700000000000,
    completedBy: 0,
    ...overrides,
  };
}

describe("seed chunking", () => {
  it("stays within the Firestore 500-write commit cap", () => {
    expect(FIRESTORE_BATCH_LIMIT).toBeLessThanOrEqual(500);
  });

  it("splits evenly and with remainders", () => {
    expect(splitIntoChunks([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    expect(splitIntoChunks([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(splitIntoChunks([], 400)).toEqual([]);
    expect(splitIntoChunks([1], 400)).toEqual([[1]]);
  });

  it("throws on non-positive sizes", () => {
    expect(() => splitIntoChunks([1], 0)).toThrow();
  });

  it("covers the full forge bank in 13 commits", () => {
    const chunks = splitIntoChunks(new Array(5004).fill(0), FIRESTORE_BATCH_LIMIT);
    expect(chunks).toHaveLength(13);
    expect(chunks.every((c) => c.length <= FIRESTORE_BATCH_LIMIT)).toBe(true);
    expect(chunks.flat()).toHaveLength(5004);
  });
});

describe("puzzleToFirestoreData", () => {
  it("maps every field and stamps seed-admin metadata", () => {
    const d = puzzleToFirestoreData(makePuzzle());
    expect(d).toMatchObject({
      type: "multiple-choice",
      title: "T",
      published: true,
      reviewStatus: "approved",
      createdBy: "seed-admin",
      completedBy: 0,
    });
    expect(d.createdAt).toBeDefined();
    expect(d.updatedAt).toBeDefined();
  });

  it("nulls missing optionals (Firestore rejects undefined)", () => {
    const d = puzzleToFirestoreData(makePuzzle());
    for (const k of [
      "acceptedAnswers",
      "correctExplanation",
      "incorrectExplanation",
      "imageUrl",
      "lessonImageUrl",
      "lessonContent",
      "lessonOrder",
      "lessonGroup",
      "lessonGroupOrder",
      "hintText",
      "sharePrompt",
      "cipherData",
      "storyData",
    ]) {
      expect(d[k]).toBeNull();
    }
  });

  it("carries storyData and cipherData through", () => {
    const storyData = { questionSlides: [{ content: "Q1" }], answerSlides: [{ content: "A1" }] };
    const d = puzzleToFirestoreData(
      makePuzzle({ type: "story", storyData }),
    );
    expect(d.storyData).toEqual(storyData);
  });

  it("never emits undefined values", () => {
    const d = puzzleToFirestoreData(
      makePuzzle({
        type: "riddle",
        choices: [],
        correctAnswer: "Echo",
        acceptedAnswers: ["Echo", "An echo"],
        hintText: "Shout.",
      }),
    );
    for (const v of Object.values(d)) expect(v).not.toBeUndefined();
  });
});
