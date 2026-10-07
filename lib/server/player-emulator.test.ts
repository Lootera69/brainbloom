import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { executePlayerCommand } from "@/lib/server/player-engine";
import { playerDatabase } from "@/lib/server/player-database";

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("player transactions in the Firestore emulator", () => {
  let app: App;
  let db: Firestore;
  const now = Date.parse("2026-10-07T10:00:00Z");
  const uid = "transaction-player";
  beforeAll(() => {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? "")) throw new Error("Only a local emulator is allowed.");
    app = initializeApp({ projectId: "demo-security" }, "player-tests");
    db = getFirestore(app);
  });
  beforeEach(async () => {
    await db.recursiveDelete(db.doc(`playerProgress/${uid}`));
    await db.doc(`accountDeletions/${uid}`).delete();
    await db.doc(`users/${uid}`).delete();
    await db.doc("settings/player-security").set({ version: 1, enabled: true, migrationComplete: true, paymentsEnabled: false });
    await db.doc("puzzles/transaction-puzzle").set({ type: "multiple-choice", title: "A question", category: "logic", difficulty: "easy",
      question: "Pick two", choices: ["one", "two"], correctAnswer: "two", xpReward: 20, published: true });
  });
  afterAll(async () => { await deleteApp(app); });
  const run = (command: Parameters<typeof executePlayerCommand>[2]) => executePlayerCommand(playerDatabase(db), { uid, anonymous: false }, command, now, 0.5);

  it("retries concurrent transactions and commits exactly one completion reward", async () => {
    const sessions = [randomUUID(), randomUUID()];
    await Promise.all(sessions.map((requestId) => run({ action: "start", puzzleId: "transaction-puzzle", mode: "challenge", requestId })));
    const results = await Promise.all(sessions.map((sessionId) => run({ action: "answer", sessionId, answer: "two", requestId: randomUUID() })));
    expect(results.filter((r) => r.replayed)).toHaveLength(1);
    const trusted = (await db.doc(`playerProgress/${uid}`).get()).data();
    expect(trusted).toMatchObject({ xp: 70, puzzlesPlayedToday: 1, completedPuzzleIds: ["transaction-puzzle"], revision: 4 });
    expect((await db.doc(`users/${uid}`).get()).data()?.xp).toBe(70);
    expect((await db.collection(`playerProgress/${uid}/awards`).get()).size).toBe(1);
  }, 20000);

  it("same request ids produce one session, one limit charge and one purchase", async () => {
    const requestId = randomUUID();
    const start = { action: "start" as const, puzzleId: "transaction-puzzle", mode: "challenge" as const, requestId };
    await Promise.all([run(start), run(start)]);
    expect((await db.doc(`playerProgress/${uid}`).get()).data()?.puzzlesPlayedToday).toBe(0);
    const answer = { action: 'answer' as const, sessionId: requestId, answer: 'two', requestId: randomUUID() };
    await Promise.all([run(answer), run(answer)]);
    const buy = { action: "shop" as const, productId: "gems_100" as const, requestId: randomUUID() };
    await Promise.all([run(buy), run(buy)]);
    expect((await db.doc(`playerProgress/${uid}`).get()).data()).toMatchObject({ puzzlesPlayedToday: 1, gems: 120 });
    expect((await db.collection(`playerProgress/${uid}/sessions`).get()).size).toBe(1);
  }, 20000);

  it("an invalid operation leaves no partial balance, rate limit or receipt write", async () => {
    await run({ action: "snapshot" });
    const before = (await db.doc(`playerProgress/${uid}`).get()).data();
    const limitBefore = (await db.doc(`playerProgress/${uid}/limits/actions`).get()).data();
    await expect(run({ action: "exchange", item: "streak-freeze", requestId: randomUUID() })).rejects.toMatchObject({ code: "insufficient-gems" });
    expect((await db.doc(`playerProgress/${uid}`).get()).data()).toEqual(before);
    expect((await db.doc(`playerProgress/${uid}/limits/actions`).get()).data()).toEqual(limitBefore);
    expect((await db.collection(`playerProgress/${uid}/receipts`).get()).empty).toBe(true);
  });

  it("a deletion tombstone blocks even a previously committed request from recreating data", async () => {
    const command = { action: "daily-bonus" as const, requestId: randomUUID() };
    await run(command);
    await db.doc(`accountDeletions/${uid}`).set({ status: "pending" });
    await db.doc(`users/${uid}`).delete();
    await expect(run(command)).rejects.toMatchObject({ code: "account-deleting" });
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
  });
});
