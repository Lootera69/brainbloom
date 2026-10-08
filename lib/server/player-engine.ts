import { createHash } from "node:crypto";
import { z } from "zod";
import type { PlayerProgress, PlayResult } from "@/lib/player-contract";
import { applyDailyReward, applyPuzzleResult, grantXp, hasServerPremium, initialProgress, markActive, pickDailyReward,
  refreshProgress, serverDay, unlockAchievements } from "@/lib/server/player-progress";
import { cipherWeek, closeAnswer, crosswordFeedback, gradeAnswer, publicPuzzle, puzzleSolution, readScoringPuzzle, scoredType,
  type PuzzleCandidate } from "@/lib/server/player-puzzles";
import { currentDailyPuzzles, currentWeeklyCipher } from "@/lib/server/puzzle-selection";
import { authoredEventConfig } from "@/lib/server/event-config";
import { scheduleOccursOn } from "@/lib/events/event-theme";
import { admitGuest, takeGuestRequest, type GuestNetwork } from "@/lib/server/player-abuse";

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const requestId = z.string().uuid();
const answer = z.union([z.string().max(5000), z.array(z.number().int().min(0).max(9)).max(81),
  z.record(z.string().regex(/^\d{1,2},\d{1,2}$/), z.string().max(4)).refine((value) => Object.keys(value).length <= 625)]);
export const playerCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("snapshot"), timeZone: z.string().max(100).optional() }).strict(),
  z.object({ action: z.literal("daily-set"), categories: z.array(z.string().max(100)).max(20).default([]) }).strict(),
  z.object({ action: z.literal("start"), puzzleId: id, mode: z.enum(["daily", "challenge", "practice"]), requestId }).strict(),
  z.object({ action: z.literal("answer"), sessionId: requestId, answer, requestId }).strict(),
  z.object({ action: z.literal("daily-bonus"), requestId }).strict(),
  z.object({ action: z.literal("event-result"), eventId: id }).strict(),
  z.object({ action: z.literal("event-answer"), eventId: id, choice: z.number().int().min(0).max(19), requestId }).strict(),
  z.object({ action: z.literal("exchange"), item: z.enum(["hearts", "streak-freeze"]), requestId }).strict(),
  z.object({ action: z.literal("shop"), productId: z.enum(["gems_100", "gems_500", "gems_1200", "heart_refill", "streak_freeze_3", "premium_monthly", "premium_yearly"]), requestId }).strict(),
]);

export type PlayerCommand = z.infer<typeof playerCommandSchema>;
export type Data = Record<string, unknown>;
export interface PlayerTransaction {
  get(path: string): Promise<Data | undefined>;
  getAll(paths: (string | null)[]): Promise<(Data | undefined)[]>;
  publishedPuzzles(): Promise<PuzzleCandidate[]>;
  put(path: string, data: Data, merge?: boolean): void;
}
export interface PlayerDatabase {
  transaction<T>(work: (transaction: PlayerTransaction) => Promise<T>): Promise<T>;
}
export class PlayerError extends Error {
  constructor(public code: string, message: string, public status = 409, public retryAfter?: number) { super(message); }
}

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const failure = (code: string, message: string, status = 409): never => { throw new PlayerError(code, message, status); };
const sessionLifetime = 2 * 60 * 60 * 1000;
const freeProducts = {
  gems_100: { gems: 100 }, gems_500: { gems: 500 }, gems_1200: { gems: 1200 },
  heart_refill: { hearts: 5 }, streak_freeze_3: { freezes: 3 },
  premium_monthly: { days: 30 }, premium_yearly: { days: 365, freezes: 3 },
};

export async function executePlayerCommand(database: PlayerDatabase, identity: { uid: string; anonymous: boolean; network?: GuestNetwork },
  command: PlayerCommand, now: number, random: number): Promise<Data> {
  const result = await database.transaction(async (transaction): Promise<Data | PlayerError> => {
    const writes: { path: string; data: Data; merge?: boolean }[] = [];
    const tx: PlayerTransaction = { ...transaction, put: (path, data, merge) => { writes.push({ path, data, merge }); } };
    const base = `playerProgress/${identity.uid}`;
    const receiptPath = "requestId" in command ? `${base}/receipts/${digest([command.action, command.requestId])}` : null;
    const fingerprint = digest(command);
    const ratePath = `${base}/limits/actions`;
    const network = identity.anonymous ? identity.network : undefined;
    const abusePath = network ? `playerAbuse/${network.key}` : null;
    const [config, deletion, saved, receipt, rate, loadedSession, abuse] = await tx.getAll([
      "settings/player-security", `accountDeletions/${identity.uid}`, base,
      receiptPath, ratePath,
      command.action === 'answer' ? `${base}/sessions/${command.sessionId}` : null,
      abusePath,
    ]);
    const budget = network ? takeGuestRequest(abuse, now, network.attested) : null;
    if (budget && !budget.allowed) {
      return new PlayerError('guest-rate-limit', 'Too many guest requests from this network. Please wait briefly and retry.', 429, budget.retryAfter);
    }
    if (budget?.allowed && abusePath) transaction.put(abusePath, budget.record);
    const perform = async () => {
    if (deletion) failure("account-deleting", "Account deletion is in progress.", 403);
    if (config?.enabled !== true || config?.migrationComplete !== true || config?.version !== 1) {
      failure("rewards-unavailable", "Rewards are temporarily unavailable. Please try again later.", 503);
    }
    if (identity.anonymous && config?.allowAnonymous !== true) failure("sign-in-required", "Sign in to earn rewards.", 403);
    if (saved && saved.version !== 1) failure("progress-version", "Please update the app to continue.", 409);
    if (!saved && network && budget?.allowed && abusePath) {
      const admission = admitGuest(budget.record, now, network.attested);
      if (!admission.allowed) {
        throw new PlayerError('guest-creation-limit', 'Too many new guests from this network. Try again later or sign in with Google.', 429, admission.retryAfter);
      }
      tx.put(abusePath, admission.record);
    }
    let state = refreshProgress(saved as unknown as PlayerProgress ?? initialProgress(now, command.action === "snapshot" ? command.timeZone : "UTC"), now);
    const today = serverDay(now, state.timeZone);
    const snapshot = (extra: Data = {}) => ({ ...extra, progress: state, serverTime: now });
    const recent = typeof rate?.startedAt === "number" && now - rate.startedAt < 600000;
    const count = recent && typeof rate?.count === "number" ? rate.count : 0;
    if (count >= 120) failure("rate-limit", "Too many requests. Please try again in a few minutes.", 429);
    tx.put(ratePath, { count: count + 1, startedAt: recent ? rate!.startedAt : now });
    const save = () => {
      state.revision++;
      tx.put(base, state as unknown as Data);
      tx.put(`users/${identity.uid}`, { ...state, progressVersion: 1 }, true);
    };
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) failure("request-conflict", "This request was already used. Please retry the original request.");
      save();
      return snapshot({ ...(receipt.result as Data), replayed: true });
    }
    const finish = (result: Data = {}) => {
      save();
      if (receiptPath) tx.put(receiptPath, { fingerprint, result, createdAt: now });
      return snapshot(result);
    };

    if (command.action === "snapshot") return finish();

    if (command.action === "daily-set") {
      if (!state.dailySetPuzzleIds.length) {
        const puzzles = await currentDailyPuzzles(tx, now, hasServerPremium(state, now) ? command.categories : []);
        state.dailySetPuzzleIds = puzzles.map((puzzle) => puzzle.id);
        return finish({ puzzles: puzzles.map(publicPuzzle) });
      }
      const records = await tx.getAll(state.dailySetPuzzleIds.map((id) => `puzzles/${id}`));
      const puzzles = records.map((record, index) => readScoringPuzzle(state.dailySetPuzzleIds[index], record));
      return finish({ puzzles: puzzles.filter((p) => p !== null).map(publicPuzzle) });
    }

    if (command.action === "start") {
      const puzzle = readScoringPuzzle(command.puzzleId, await tx.get(`puzzles/${command.puzzleId}`));
      if (!puzzle) failure("puzzle-unavailable", "This puzzle is no longer available.", 404);
      if (command.mode === "daily") {
        if (!state.dailySetPuzzleIds.length) {
          state.dailySetPuzzleIds = (await currentDailyPuzzles(tx, now)).map((puzzle) => puzzle.id);
        }
        if (!state.dailySetPuzzleIds.includes(puzzle!.id)) failure("not-daily", "Choose a puzzle from today's Daily Set.");
        if (state.dailySetCompletedIds.includes(puzzle!.id)) failure("already-completed", "This daily puzzle is already complete.");
      }
      if (command.mode === "practice" && puzzle!.type !== "cipher" && (!scoredType(puzzle!.type) || !state.completedPuzzleIds.includes(puzzle!.id))) {
        failure("not-practice", "Complete this puzzle before practicing it.");
      }
      const premium = hasServerPremium(state, now);
      if (scoredType(puzzle!.type) && command.mode !== "practice" && !premium && state.hearts <= 0) {
        failure("no-hearts", "Your hearts are empty. Practice a completed puzzle or wait for a refill.");
      }
      const repeat = state.completedPuzzleIds.includes(puzzle!.id) && command.mode === "challenge";
      if (scoredType(puzzle!.type) && command.mode !== "practice" && !repeat) {
        if (!premium && state.puzzlesPlayedToday >= 3) failure("daily-limit", "You have reached today's play limit.");
      }
      let week: string | null = null;
      if (puzzle!.type === "cipher" && command.mode !== "practice") {
        const selected = await currentWeeklyCipher(tx, now);
        if (selected.puzzle?.id === puzzle!.id && new Date(now).getUTCDay() !== 6) week = cipherWeek(now);
      }
      const session = { id: command.requestId, puzzleId: puzzle!.id, mode: command.mode, expiresAt: now + sessionLifetime };
      tx.put(`${base}/sessions/${session.id}`, {
        ...session, day: today, puzzle, hadWrongAttempt: false, attempts: 0, completed: false, cipherWeek: week,
      });
      return finish({ session, puzzle: publicPuzzle(puzzle!) });
    }

    if (command.action === "answer") {
      const path = `${base}/sessions/${command.sessionId}`;
      const session = loadedSession;
      if (!session) failure("session-missing", "Open the puzzle again to start a new attempt.", 404);
      if (session!.completed === true) failure("session-complete", "This attempt is already complete.");
      if (typeof session!.expiresAt !== "number" || session!.expiresAt <= now || session!.day !== today) {
        failure("session-expired", "This attempt expired. Open the puzzle again.");
      }
      const puzzle = readScoringPuzzle(session!.puzzleId as string, session!.puzzle);
      if (!puzzle) failure("puzzle-unavailable", "This puzzle is unavailable.");
      const daily = session!.mode === "daily";
      const practice = session!.mode === "practice";
      const attempts = typeof session!.attempts === "number" ? session!.attempts : 0;
      if (attempts >= 20) failure("attempt-limit", "Please open a new attempt.");
      if (scoredType(puzzle!.type) && !practice && !hasServerPremium(state, now) && state.hearts <= 0) {
        failure("no-hearts", "Your hearts are empty. Practice a completed puzzle or wait for a refill.");
      }
      if (attempts === 0 && scoredType(puzzle!.type) && !practice
        && (daily || !state.completedPuzzleIds.includes(puzzle!.id))) {
        if (!hasServerPremium(state, now) && state.puzzlesPlayedToday >= 3) failure("daily-limit", "You have reached today's play limit.");
        state.puzzlesPlayedToday++;
      }
      const correct = gradeAnswer(puzzle!, command.answer);
      const terminal = correct || ["multiple-choice", "true-false", "riddle", "wonder", "story"].includes(puzzle!.type);
      const rewardKey = daily ? ["daily", today, puzzle!.id] : practice ? ["practice", today, puzzle!.id]
        : puzzle!.type === "cipher" ? ["cipher", session!.cipherWeek] : ["challenge", puzzle!.id];
      const awardPath = `${base}/awards/${digest(rewardKey)}`;
      const [live, award] = await tx.getAll([`puzzles/${puzzle!.id}`, correct ? awardPath : null]);
      if (live?.published !== true) failure("puzzle-unavailable", "This puzzle is no longer available.", 404);
      const beforeXp = state.xp;
      const beforeGems = state.gems;
      if (scoredType(puzzle!.type)) {
        state = applyPuzzleResult(state, { ...puzzle!, hasLesson: !!puzzle!.lessonContent }, {
          correct, daily, practice, hadWrongAttempt: session!.hadWrongAttempt === true || !correct,
          dailyTarget: state.dailySetPuzzleIds.length,
        }, now);
      } else if (!award) {
        if (correct && puzzle!.type === "cipher" && typeof session!.cipherWeek === "string"
          && session!.cipherWeek === cipherWeek(now) && new Date(now).getUTCDay() !== 6
          && !state.cipherSolvedWeeks.includes(session!.cipherWeek)) {
          state.currentCipherWeek = session!.cipherWeek; state.currentCipherSolved = true;
          state.cipherSolvedWeeks.push(session!.cipherWeek); state.cipherSolveCount++;
          if (!state.completedPuzzleIds.includes(puzzle!.id)) state.completedPuzzleIds.push(puzzle!.id);
          markActive(state, today);
          unlockAchievements(state, now);
        } else if (correct && ["wonder", "story"].includes(puzzle!.type) && !state.experiencedWonderIds.includes(puzzle!.id)) {
          state.experiencedWonderIds.push(puzzle!.id);
          if (puzzle!.type === "story") {
            markActive(state, today);
            if (!state.completedPuzzleIds.includes(puzzle!.id)) state.completedPuzzleIds.push(puzzle!.id);
          }
        }
      }
      if (correct && !award) tx.put(awardPath, { puzzleId: puzzle!.id, createdAt: now, sessionId: command.sessionId });
      const result: Omit<PlayResult, "progress" | "serverTime"> = {
        correct, close: !correct && closeAnswer(puzzle!, command.answer), completed: terminal, xpEarned: state.xp - beforeXp, gemsEarned: state.gems - beforeGems, replayed: !!award,
        explanation: (correct ? puzzle!.correctExplanation : puzzle!.incorrectExplanation) ?? "",
        ...(puzzle!.type === "crossword" ? { cellResults: crosswordFeedback(puzzle!, command.answer) ?? {} } : {}),
        ...(terminal ? { solution: puzzleSolution(puzzle!) } : {}),
      };
      tx.put(path, { ...session, hadWrongAttempt: session!.hadWrongAttempt === true || !correct, attempts: attempts + 1, completed: terminal });
      return finish(result);
    }

    if (command.action === "event-answer" || command.action === "event-result") {
      const config = await tx.get("settings/events");
      if (config?.seasonalThemesEnabled === false) failure("event-unavailable", "This Moment is unavailable.");
      const events = authoredEventConfig(config).events;
      const date = new Date(`${today} GMT`);
      const day = { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
      const active = events.filter((event) => scheduleOccursOn(event.schedule, day))
        .sort((a, b) => Number(b.tier === "hero") - Number(a.tier === "hero") || b.priority - a.priority)[0];
      const question = active?.question;
      if (active?.id !== command.eventId || !question || !Number.isInteger(question.xp) || question.xp < 0 || question.xp > 1000
        || !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length
        || (command.action === "event-answer" && command.choice >= question.options.length)) failure("event-unavailable", "This Moment question is unavailable.");
      const token = `${active!.id}@${date.toISOString().slice(0, 10)}`;
      const awardPath = `${base}/awards/${digest(["event", token])}`;
      const prior = await tx.get(awardPath);
      if (prior) return finish({ ...(prior.result as Data), replayed: true });
      if (command.action === "event-result") return finish({ result: null, token });
      const correct = command.choice === question!.correctIndex;
      if (correct) grantXp(state, question!.xp, today);
      state.answeredEventTokens = [...state.answeredEventTokens, token].slice(-400);
      const result = { correct, choice: command.choice, correctIndex: question!.correctIndex, explanation: question!.factoid, xpEarned: correct ? question!.xp : 0, token };
      tx.put(awardPath, { result, createdAt: now });
      return finish(result);
    }

    if (command.action === "daily-bonus") {
      const dayPath = `${base}/awards/${digest(["daily-bonus", today])}`;
      const prior = await tx.get(dayPath);
      if (prior || state.lastRewardClaim === today) return finish({ reward: prior?.reward ?? null, replayed: true });
      const reward = pickDailyReward(random);
      state = applyDailyReward(state, reward, now);
      tx.put(dayPath, { reward, createdAt: now });
      return finish({ reward, replayed: false });
    }

    if (command.action === "exchange") {
      const cost = command.item === "hearts" ? 50 : 200;
      if (state.gems < cost) failure("insufficient-gems", "You do not have enough gems.");
      if (command.item === "hearts" && (state.hearts >= 5 || hasServerPremium(state, now))) failure("hearts-full", "Your hearts are already full.");
      state.gems -= cost;
      if (command.item === "hearts") { state.hearts = 5; state.nextHeartAt = null; }
      else state.streakFreezes++;
      return finish();
    }

    if (command.action === "shop") {
      if (config?.paymentsEnabled !== false) failure("purchase-verification-required", "Verified store purchases are not available yet.", 503);
      const product = freeProducts[command.productId];
      if ("gems" in product) state.gems += product.gems;
      if ("hearts" in product) { state.hearts = 5; state.nextHeartAt = null; }
      if ("freezes" in product) state.streakFreezes += product.freezes;
      if ("days" in product) {
        state.tier = "premium";
        state.subscriptionExpiry = Math.max(now, state.subscriptionExpiry ?? now) + product.days * 86400000;
      }
      return finish({ productId: command.productId });
    }
    return failure("unsupported-action", "This action is unavailable.", 400);
    };
    try {
      const value = await perform();
      for (const write of writes) transaction.put(write.path, write.data, write.merge);
      return value;
    } catch (error) {
      if (error instanceof PlayerError) return error;
      throw error;
    }
  });
  if (result instanceof PlayerError) throw result;
  return result;
}
