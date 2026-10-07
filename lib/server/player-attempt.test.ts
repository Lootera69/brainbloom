import { expect, it, vi } from 'vitest';
import { PlayerAttempt } from '@/services/player-attempt';
import { PlayerRequestError } from '@/services/player-service';
import { initialProgress } from '@/lib/server/player-progress';
import type { PlayerAction, PlayerResponse } from '@/lib/player-contract';

vi.mock('@/services/firebase', () => ({ getFirebase: () => ({ auth: null }) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const response = (data: Record<string, unknown> = {}): PlayerResponse => ({
  progress: initialProgress(Date.now(), 'Asia/Kolkata'), serverTime: Date.now(), ...data,
});

it('prepares in the background and shares identical pending answers with one submission request', async () => {
  const preparation = deferred<PlayerResponse>();
  const answer = deferred<PlayerResponse>();
  const send = vi.fn((command: PlayerAction) => command.action === 'start' ? preparation.promise : answer.promise);
  const attempt = new PlayerAttempt('quiz', 'daily', send);
  attempt.warmUp();
  const ready = attempt.prepare();
  expect(send).toHaveBeenCalledTimes(1);
  preparation.resolve(response({ session: { id: 'prepared-session' } }));
  await ready;
  const first = attempt.submit('B');
  expect(attempt.submit('B')).toBe(first);
  await expect(attempt.submit('A')).rejects.toThrow('previous answer');
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1][0]).toEqual({ action: 'answer', sessionId: 'prepared-session', answer: 'B' });
  answer.resolve(response({ correct: true, completed: true, xpEarned: 40 }));
  expect(await first).toMatchObject({ correct: true, xpEarned: 40 });
});

it('keeps the prepared session for retryable wrong answers and replaces an expired session', async () => {
  let starts = 0;
  let expire = false;
  const send = vi.fn(async (command: PlayerAction) => {
    if (command.action === 'start') return response({ session: { id: `session-${++starts}` } });
    if (expire) { expire = false; throw new PlayerRequestError('Expired', 'session-expired'); }
    return response({ correct: false, completed: false, xpEarned: 0 });
  });
  const attempt = new PlayerAttempt('typed', 'challenge', send);
  await attempt.submit('first');
  await attempt.submit('second');
  expect(starts).toBe(1);
  expire = true;
  await expect(attempt.submit('third')).rejects.toMatchObject({ code: 'session-expired' });
  await attempt.submit('third');
  expect(starts).toBe(2);
});

it('never replaces an unavailable or malformed result with a local success', async () => {
  let malformed = false;
  const attempt = new PlayerAttempt('quiz', 'challenge', async (command) => {
    if (command.action === 'start') return response({ session: { id: 'session' } });
    if (malformed) return response({ correct: true });
    throw new PlayerRequestError('Offline');
  });
  await expect(attempt.submit('B')).rejects.toThrow('Offline');
  malformed = true;
  await expect(attempt.submit('B')).rejects.toThrow('could not be confirmed');
});

it('starts a new session after a terminal result rather than reusing a completed attempt', async () => {
  let starts = 0;
  const attempt = new PlayerAttempt('quiz', 'challenge', async (command) => command.action === 'start'
    ? response({ session: { id: `session-${++starts}` } })
    : response({ correct: true, completed: true, xpEarned: starts === 1 ? 20 : 0 }));
  expect((await attempt.submit('B')).xpEarned).toBe(20);
  expect((await attempt.submit('B')).xpEarned).toBe(0);
  expect(starts).toBe(2);
});
