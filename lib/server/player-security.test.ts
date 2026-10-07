import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { executePlayerCommand, playerCommandSchema, type Data, type PlayerCommand, type PlayerDatabase } from "@/lib/server/player-engine";
import { initialProgress, refreshProgress, serverDay, serverWeek, applyPuzzleResult, pickDailyReward } from "@/lib/server/player-progress";
import { gradeAnswer, publicPuzzle, readScoringPuzzle, type ScoringPuzzle } from "@/lib/server/player-puzzles";
import type { PlayerProgress } from "@/lib/player-contract";

const now = Date.parse("2026-10-07T10:00:00Z");
const hour = 3600000;
const day = 86400000;
const docs = new Map<string, Data>();
let queue: Promise<unknown>;
const database: PlayerDatabase = {
  transaction: (work) => {
    const result = queue.then(async () => {
      const copy = new Map([...docs].map(([key, value]) => [key, structuredClone(value)]));
      const result = await work({
        get: async (path) => copy.get(path),
        publishedPuzzles: async () => [...copy].filter(([path]) => path.startsWith("puzzles/")).map(([path, raw]) =>
          readScoringPuzzle(path.split("/")[1], raw)).filter((p) => p !== null),
        put: (path, value, merge = false) => { copy.set(path, { ...(merge ? copy.get(path) : {}), ...structuredClone(value) }); },
      });
      docs.clear(); for (const [key, value] of copy) docs.set(key, value);
      return result;
    });
    queue = result.catch(() => undefined);
    return result;
  },
};
const call = (command: PlayerCommand, at = now, uid = "player") => executePlayerCommand(database, { uid, anonymous: false }, command, at, 0.5);
const request = () => randomUUID();
const progress = () => docs.get("playerProgress/player") as unknown as PlayerProgress;
const patch = (data: Partial<PlayerProgress>) => docs.set("playerProgress/player", { ...initialProgress(now, "Asia/Kolkata"), ...data });
const start = async (puzzleId = "quiz", mode: "challenge" | "daily" | "practice" = "challenge", at = now) => {
  const result = await call({ action: "start", puzzleId, mode, requestId: request() }, at);
  return (result.session as { id: string }).id;
};
const submit = (sessionId: string, answer = "B", at = now) => call({ action: "answer", sessionId, answer, requestId: request() }, at);
const quiz: ScoringPuzzle = { id: "quiz", type: "multiple-choice", title: "Question", category: "logic", difficulty: "easy",
  question: "Pick B", choices: ["A", "B"], correctAnswer: "B", xpReward: 20, published: true };

beforeEach(() => {
  docs.clear(); queue = Promise.resolve();
  docs.set("settings/player-security", { version: 1, enabled: true, migrationComplete: true, paymentsEnabled: false });
  docs.set("puzzles/quiz", { ...quiz });
  docs.set("puzzles/two", { ...quiz, id: "two" });
  docs.set("puzzles/three", { ...quiz, id: "three" });
});

describe("reward authority", () => {
  it("rejects client amounts, success flags, tiers, timestamps and identity overrides", () => {
    for (const extra of [{ xp: 100000 }, { correct: true }, { uid: "victim" }, { now: 1 }, { tier: "premium" }]) {
      expect(playerCommandSchema.safeParse({ action: "answer", sessionId: request(), requestId: request(), answer: "B", ...extra }).success).toBe(false);
    }
    expect(playerCommandSchema.safeParse({ action: "watched-ad", requestId: request() }).success).toBe(false);
  });

  it("does not trust legacy profile balances when creating progress", async () => {
    docs.set("users/player", { xp: 999999, gems: 999999, tier: "premium", pushEnabled: true });
    await call({ action: "snapshot", timeZone: "Asia/Kolkata" });
    expect(progress()).toMatchObject({ xp: 0, gems: 0, hearts: 5, tier: "free", timeZone: "Asia/Kolkata" });
    expect(docs.get("users/player")?.pushEnabled).toBe(true);
  });

  it("fails closed during migration, account deletion, and unsupported anonymous access", async () => {
    docs.set("settings/player-security", { enabled: true });
    await expect(call({ action: "snapshot" })).rejects.toMatchObject({ code: "rewards-unavailable" });
    docs.set("settings/player-security", { enabled: true, migrationComplete: true, version: 1 });
    await expect(executePlayerCommand(database, { uid: "player", anonymous: true }, { action: "snapshot" }, now, 0.5)).rejects.toMatchObject({ code: "sign-in-required" });
    docs.set("accountDeletions/player", { status: "pending" });
    await expect(call({ action: "snapshot" })).rejects.toMatchObject({ code: "account-deleting" });
    expect(docs.has("playerProgress/player")).toBe(false);
  });

  it("grades on the server and commits one reward across concurrent device attempts", async () => {
    const sessions = await Promise.all([start(), start()]);
    const results = await Promise.all(sessions.map((id) => submit(id)));
    expect(results.filter((r) => r.replayed)).toHaveLength(1);
    expect(progress().completedPuzzleIds).toEqual(["quiz"]);
    expect(progress().xp).toBe(70);
    expect(progress().gems).toBe(20);
  });

  it("retries a committed answer without charging or rewarding twice, returning current progress", async () => {
    const sessionId = await start();
    const command = { action: "answer" as const, sessionId, answer: "B", requestId: request() };
    const first = await call(command);
    await call({ action: "shop", productId: "gems_100", requestId: request() });
    const repeated = await call(command);
    expect(first.xpEarned).toBe(70);
    expect(repeated).toMatchObject({ replayed: true, progress: { xp: 70, gems: 120 } });
    await expect(call({ ...command, answer: "A" })).rejects.toMatchObject({ code: "request-conflict" });
  });

  it("a wrong answer costs one heart and cannot be resubmitted under a different request", async () => {
    const sessionId = await start();
    const wrong = { action: "answer" as const, sessionId, answer: "A", requestId: request() };
    const result = await call(wrong);
    expect(result).toMatchObject({ correct: false, completed: true, xpEarned: 0 });
    await call(wrong);
    expect(progress()).toMatchObject({ xp: 0, hearts: 4, nextHeartAt: now + 5 * hour });
    await expect(submit(sessionId)).rejects.toMatchObject({ code: "session-complete" });
  });

  it("cannot redeem another player's session or an expired/unpublished puzzle", async () => {
    const sessionId = await start();
    await expect(call({ action: "answer", sessionId, answer: "B", requestId: request() }, now, "other")).rejects.toMatchObject({ code: "session-missing" });
    await expect(submit(sessionId, "B", now + 3 * hour)).rejects.toMatchObject({ code: "session-expired" });
    docs.set("puzzles/quiz", { ...quiz, published: false });
    await expect(submit(sessionId)).rejects.toMatchObject({ code: "puzzle-unavailable" });
  });

  it("enforces the server play limit even with different request ids and keeps the timezone fixed", async () => {
    await call({ action: "snapshot", timeZone: "Pacific/Kiritimati" });
    await call({ action: "snapshot", timeZone: "Pacific/Pago_Pago" });
    expect(progress().timeZone).toBe("Pacific/Kiritimati");
    const sessions = await Promise.all([start(), start(), start(), start()]);
    expect(progress().puzzlesPlayedToday).toBe(0);
    for (const session of sessions.slice(0, 3)) await submit(session, 'A');
    await expect(submit(sessions[3], 'A')).rejects.toMatchObject({ code: "daily-limit" });
    await expect(start()).rejects.toMatchObject({ code: "daily-limit" });
    await expect(start("not-found")).rejects.toMatchObject({ code: "puzzle-unavailable" });
  });

  it('preparing or reopening a puzzle never consumes a play or changes balances', async () => {
    patch({ xp: 123, gems: 45, hearts: 4, nextHeartAt: now + hour });
    await Promise.all([start(), start(), start(), start()]);
    expect(progress()).toMatchObject({ xp: 123, gems: 45, hearts: 4, puzzlesPlayedToday: 0 });
    expect([...docs.keys()].filter((key) => key.includes('/awards/'))).toHaveLength(0);
  });

  it("enforces hearts at both start and answer while valid premium can play with zero", async () => {
    patch({ hearts: 1 });
    const sessions = await Promise.all([start(), start()]);
    await submit(sessions[0], "A");
    await expect(submit(sessions[1])).rejects.toMatchObject({ code: "no-hearts" });
    await expect(start()).rejects.toMatchObject({ code: "no-hearts" });
    patch({ hearts: 0, tier: "premium", subscriptionExpiry: now + day });
    await submit(await start());
    expect(progress().hearts).toBe(0);
  });

  it("only the chosen daily set can earn the doubled reward and perfect bonus", async () => {
    const plan = await call({ action: "daily-set", categories: [] });
    expect((plan.puzzles as Data[])).toHaveLength(3);
    docs.set("puzzles/injected", { ...quiz, id: "injected" });
    await expect(start("injected", "daily")).rejects.toMatchObject({ code: "not-daily" });
    for (const id of ["quiz", "two", "three"]) await submit(await start(id, "daily"));
    expect(progress()).toMatchObject({ xp: 195, dailyPuzzleStreak: 1, dailyPuzzleCompletedDate: serverDay(now, "UTC") });
    expect(progress().dailySetCompletedIds).toHaveLength(3);
    await expect(start("quiz", "daily")).rejects.toMatchObject({ code: "already-completed" });
  });

  it("daily and ordinary completions cannot create duplicate first-completion awards", async () => {
    const first = await start(); const daily = await start("quiz", "daily");
    await submit(first); await submit(daily);
    expect(progress().xp).toBe(110);
    expect(progress().completedPuzzleIds).toEqual(["quiz"]);
    expect(progress().dailyQuests.find((q) => q.id === "complete-challenges")?.progress).toBe(1);
  });

  it("practice cannot award XP, requires prior completion and gives at most one heart per puzzle per day", async () => {
    await expect(start("quiz", "practice")).rejects.toMatchObject({ code: "not-practice" });
    patch({ completedPuzzleIds: ["quiz"], hearts: 2, xp: 80 });
    const sessions = await Promise.all([start("quiz", "practice"), start("quiz", "practice")]);
    await Promise.all(sessions.map((id) => submit(id)));
    expect(progress()).toMatchObject({ hearts: 3, xp: 80, practiceHeartsToday: 1 });
  });

  it("daily chest is granted once under concurrent retries with different request ids", async () => {
    await Promise.all(Array.from({ length: 5 }, () => call({ action: "daily-bonus", requestId: request() })));
    expect(progress().xp).toBe(20);
    expect(progress().lastRewardClaim).toBe(serverDay(now, "UTC"));
  });

  it("free shop grants fixed server products and fails closed if real billing is enabled", async () => {
    const command = { action: "shop" as const, productId: "premium_monthly" as const, requestId: request() };
    await call(command); await call(command);
    expect(progress()).toMatchObject({ tier: "premium", subscriptionExpiry: now + 30 * day, streakFreezes: 0 });
    docs.set("settings/player-security", { version: 1, enabled: true, migrationComplete: true, paymentsEnabled: true });
    await expect(call({ action: "shop", productId: "gems_1200", requestId: request() })).rejects.toMatchObject({ code: "purchase-verification-required" });
  });

  it("gem exchanges are atomic and cannot spend the same balance twice", async () => {
    patch({ gems: 200 });
    const results = await Promise.allSettled(Array.from({ length: 2 }, () => call({ action: "exchange", item: "streak-freeze", requestId: request() })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(progress()).toMatchObject({ gems: 0, streakFreezes: 1 });
  });

  it("restores only previously submitted Moment results without answering or granting XP", async () => {
    const halloween = Date.parse("2026-10-31T10:00:00Z");
    expect(await call({ action: "event-result", eventId: "halloween" }, halloween)).toMatchObject({ result: null });
    expect(progress().answeredEventTokens).toEqual([]);
    expect(progress().xp).toBe(0);
    await call({ action: "event-answer", eventId: "halloween", choice: 0, requestId: request() }, halloween);
    expect(await call({ action: "event-result", eventId: "halloween" }, halloween)).toMatchObject({
      correct: true, correctIndex: 0, choice: 0, xpEarned: 30, token: "halloween@2026-10-31", replayed: true,
    });
    expect(progress().xp).toBe(30);
    expect(await call({ action: "event-result", eventId: "halloween" }, halloween, "another-player")).toMatchObject({ result: null });
  });

  it("a Moment answer is final for that day and an off-day event cannot reward", async () => {
    const halloween = Date.parse("2026-10-31T10:00:00Z");
    await expect(call({ action: "event-answer", eventId: "halloween", choice: 0, requestId: request() })).rejects.toMatchObject({ code: "event-unavailable" });
    await call({ action: "event-answer", eventId: "halloween", choice: 1, requestId: request() }, halloween);
    const retry = await call({ action: "event-answer", eventId: "halloween", choice: 0, requestId: request() }, halloween);
    expect(retry).toMatchObject({ correct: false, replayed: true });
    expect(progress().xp).toBe(0);
  });
});

describe("server calendar and economy", () => {
  it("uses the stored timezone, honors DST and resets weekly XP at Monday UTC", () => {
    expect(serverDay(Date.parse("2026-11-01T05:30:00Z"), "America/New_York")).toBe("Sun Nov 01 2026");
    expect(serverDay(Date.parse("2026-11-01T06:30:00Z"), "America/New_York")).toBe("Sun Nov 01 2026");
    expect(serverWeek(now)).toBe(Date.parse("2026-10-05T00:00:00Z"));
    const state = initialProgress(now); state.weeklyXp = 40; state.weeklyStartDate = now - day;
    expect(refreshProgress(state, now).weeklyXp).toBe(40);
    expect(refreshProgress(state, now + 7 * day).weeklyXp).toBe(0);
  });

  it("heart refill and premium expiration depend only on the supplied server clock", () => {
    const state = { ...initialProgress(now), hearts: 1, nextHeartAt: now + 5 * hour, tier: "premium" as const, subscriptionExpiry: now + hour };
    expect(refreshProgress(state, now + 4 * hour)).toMatchObject({ hearts: 1, tier: "free" });
    expect(refreshProgress(state, now + 10 * hour)).toMatchObject({ hearts: 3, nextHeartAt: now + 15 * hour });
    expect(refreshProgress(state, now + 40 * hour)).toMatchObject({ hearts: 5, nextHeartAt: null });
  });

  it("a missed date consumes one freeze even after repeated refresh and daily streak evaluation", () => {
    const state = { ...initialProgress(now), lastActiveDate: serverDay(now - 2 * day, "UTC"), streak: 3, streakFreezes: 2,
      dailyPuzzleLastDate: serverDay(now - 2 * day, "UTC"), dailyPuzzleStreak: 3 };
    const once = refreshProgress(state, now);
    expect(once.streakFreezes).toBe(1);
    expect(refreshProgress(once, now).streakFreezes).toBe(1);
    const final = applyPuzzleResult(once, { ...quiz, hasLesson: false }, { correct: true, daily: true, practice: false, hadWrongAttempt: false, dailyTarget: 1 }, now);
    expect(final).toMatchObject({ streak: 4, dailyPuzzleStreak: 4, streakFreezes: 1 });
    expect(final.frozenDays).toEqual([serverDay(now - day, "UTC")]);
  });

  it("a random input outside the server RNG range never produces a reward", () => {
    for (const value of [-1, 1, Infinity, NaN]) expect(() => pickDailyReward(value)).toThrow();
  });
});

describe("answer and content boundary", () => {
  it("only published valid puzzles can start; public projections never include solutions or review data", () => {
    expect(readScoringPuzzle("draft", { ...quiz, published: false })).toBeNull();
    expect(readScoringPuzzle("invalid", { ...quiz, xpReward: 100000 })).toBeNull();
    const parsed = readScoringPuzzle("quiz", { ...quiz, reviewedBy: "secret", reviewComments: ["private"], correctExplanation: "B because" })!;
    expect(publicPuzzle(parsed)).not.toHaveProperty("correctAnswer");
    expect(publicPuzzle(parsed)).not.toHaveProperty("correctExplanation");
    expect(publicPuzzle(parsed)).not.toHaveProperty("reviewedBy");
    expect(gradeAnswer(parsed, "B")).toBe(true);
    expect(gradeAnswer(parsed, "b")).toBe(false);
  });

  it("normalizes typed answers and does not treat close spellings as correct", () => {
    const typed = { ...quiz, type: "type-answer" as const, correctAnswer: "Four", acceptedAnswers: ["4"] };
    expect(gradeAnswer(typed, "  FOUR  ")).toBe(true);
    expect(gradeAnswer(typed, "4")).toBe(true);
    expect(gradeAnswer(typed, "for")).toBe(false);
    expect(gradeAnswer(typed, "")).toBe(false);
  });

  it("validates every Sudoku row, column, box and fixed clue", () => {
    const solution = Array.from({ length: 81 }, (_, i) => (Math.floor(i / 9) * 3 + Math.floor(i / 27) + i % 9) % 9 + 1);
    const puzzle = { ...quiz, type: "sudoku" as const, sudokuData: { solution, puzzle: solution.map((n, i) => i % 2 ? 0 : n) } };
    expect(gradeAnswer(puzzle, solution)).toBe(true);
    expect(gradeAnswer(puzzle, Array(81).fill(1))).toBe(false);
    expect(gradeAnswer(puzzle, solution.map((n) => n % 9 + 1))).toBe(false);
    expect(publicPuzzle(puzzle)).not.toHaveProperty("sudokuData.solution");
  });

  it("checks each crossword cell without sending letters to the client", () => {
    const puzzle = { ...quiz, type: "crossword" as const, crosswordData: { size: 2, grid: [["A", "B"], [null, "C"]],
      clues: [{ number: 1, clue: "First", answer: "AB", startRow: 0, startCol: 0, direction: "across" as const }] } };
    expect(gradeAnswer(puzzle, { "0,0": "a", "0,1": "B", "1,1": "C" })).toBe(true);
    expect(gradeAnswer(puzzle, { "0,0": "a", "0,1": "B" })).toBe(false);
    expect(publicPuzzle(puzzle)).toMatchObject({ crosswordData: { grid: [["", ""], [null, ""]], clues: [{ length: 2 }] } });
    expect(publicPuzzle(puzzle)).not.toHaveProperty("crosswordData.clues.0.answer");
  });
});

it('allows anonymous play only when configured and never imports device balances', async () => {
  docs.set('settings/player-security', { version: 1, enabled: true, migrationComplete: true, allowAnonymous: true, paymentsEnabled: false });
  docs.set('users/guest', { xp: 900000, gems: 900000 });
  const reply = await executePlayerCommand(database, { uid: 'guest', anonymous: true }, { action: 'snapshot' }, now, 0.5);
  expect(reply.progress).toMatchObject({ xp: 0, gems: 0, tier: 'free' });
});

it('loads only the established Daily Set on repeat visits', async () => {
  patch({ dailySetDate: serverDay(now, 'Asia/Kolkata'), dailySetPuzzleIds: ['quiz', 'two'] });
  const paths: string[] = [];
  const db: PlayerDatabase = { transaction: (work) => database.transaction((tx) => work({ ...tx,
    get: async (path) => { paths.push(path); return tx.get(path); },
    publishedPuzzles: async () => { throw new Error('Catalog should not be reloaded'); },
  })) };
  const reply = await executePlayerCommand(db, { uid: 'player', anonymous: false }, { action: 'daily-set', categories: [] }, now, 0.5);
  expect(reply.puzzles).toHaveLength(2);
  expect(paths.filter((path) => path.startsWith('puzzles/'))).toEqual(['puzzles/quiz', 'puzzles/two']);
});

it('rate limits snapshots and already committed retries as well as new commands', async () => {
  const command = { action: 'daily-bonus' as const, requestId: request() };
  await call(command);
  docs.set('playerProgress/player/limits/actions', { startedAt: now, count: 120 });
  const previous = progress().xp;
  await expect(call({ action: 'snapshot' })).rejects.toMatchObject({ code: 'rate-limit' });
  await expect(call(command)).rejects.toMatchObject({ code: 'rate-limit' });
  expect(progress().xp).toBe(previous);
  await expect(call({ action: 'snapshot' }, now + 600001)).resolves.toHaveProperty('progress');
});
