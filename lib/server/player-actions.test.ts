import { beforeEach, expect, it, vi } from 'vitest';
import { claimDailyReward, answerMoment, readMomentResult } from '@/services/player-actions';
import { previewTransport } from '@/services/preview-attempt';
import { playerCommand } from '@/services/player-progress';
import { initialProgress } from '@/lib/server/player-progress';
import type { Puzzle } from '@/types/puzzle';

vi.mock('@/services/player-progress', () => ({ playerCommand: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it('accepts only confirmed daily rewards and surfaces failures for retry', async () => {
  vi.mocked(playerCommand).mockResolvedValueOnce({ reward: { type: 'gems', amount: 5, label: '5 gems' } } as never);
  expect(await claimDailyReward()).toEqual({ type: 'gems', amount: 5, label: '5 gems' });
  expect(playerCommand).toHaveBeenCalledWith({ action: 'daily-bonus' });
  vi.mocked(playerCommand).mockResolvedValueOnce({ reward: null } as never);
  expect(await claimDailyReward()).toBeNull();
  vi.mocked(playerCommand).mockRejectedValueOnce(new Error('offline'));
  await expect(claimDailyReward()).rejects.toThrow('offline');
});

it('submits the selected Moment option without client XP or correctness', async () => {
  vi.mocked(playerCommand).mockResolvedValueOnce({ correct: false, correctIndex: 2, explanation: 'Fact', xpEarned: 0, token: 'halloween@2026-10-31' } as never);
  expect(await answerMoment('halloween', 1)).toMatchObject({ correct: false, correctIndex: 2, xpEarned: 0 });
  expect(playerCommand).toHaveBeenCalledWith({ action: 'event-answer', eventId: 'halloween', choice: 1 });
});

it('reads a Moment result without submitting an option', async () => {
  vi.mocked(playerCommand).mockResolvedValueOnce({ result: null } as never);
  expect(await readMomentResult('halloween')).toBeNull();
  expect(playerCommand).toHaveBeenCalledWith({ action: 'event-result', eventId: 'halloween' });
});

it('previews a draft without contacting rewards or changing any balance', async () => {
  const progress = initialProgress(Date.now(), 'Asia/Kolkata');
  const before = structuredClone(progress);
  const send = previewTransport({ id: 'draft', type: 'multiple-choice', category: 'logic', title: 'Draft',
    published: false, choices: ['A', 'B'], correctAnswer: 'B', xpReward: 100 } as Puzzle, progress);
  expect(await send({ action: 'start', puzzleId: 'draft', mode: 'challenge' })).toHaveProperty('session.id', 'preview');
  expect(await send({ action: 'answer', sessionId: 'preview', answer: 'B' })).toMatchObject({ correct: true, xpEarned: 0, gemsEarned: 0 });
  expect(await send({ action: 'answer', sessionId: 'preview', answer: 'A' })).toMatchObject({ correct: false, xpEarned: 0 });
  expect(progress).toEqual(before);
  expect(playerCommand).not.toHaveBeenCalled();
});
