import type { DailyReward } from '@/lib/player-contract';
import { playerCommand } from '@/services/player-progress';

export async function claimDailyReward(): Promise<DailyReward | null> {
  const reply = await playerCommand({ action: 'daily-bonus' });
  if (reply.reward === null) return null;
  const reward = reply.reward as Partial<DailyReward> | undefined;
  if (!reward || !['xp', 'gems', 'streak-freeze'].includes(reward.type ?? '')
    || !Number.isSafeInteger(reward.amount) || typeof reward.label !== 'string') {
    throw new Error('Your reward could not be confirmed. Please retry.');
  }
  return reward as DailyReward;
}

export interface MomentResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  xpEarned: number;
  token: string;
  choice?: number;
}

function confirmedMoment(reply: Record<string, unknown>): MomentResult {
  if (typeof reply.correct !== 'boolean' || !Number.isSafeInteger(reply.correctIndex) || (reply.correctIndex as number) < 0
    || typeof reply.explanation !== 'string' || !Number.isSafeInteger(reply.xpEarned) || (reply.xpEarned as number) < 0
    || typeof reply.token !== 'string') {
    throw new Error('Your answer could not be confirmed. Please retry.');
  }
  return { correct: reply.correct, correctIndex: reply.correctIndex as number,
    explanation: reply.explanation, xpEarned: reply.xpEarned as number, token: reply.token,
    ...(Number.isSafeInteger(reply.choice) ? { choice: reply.choice as number } : {}) };
}

export async function answerMoment(eventId: string, choice: number): Promise<MomentResult> {
  return confirmedMoment(await playerCommand({ action: 'event-answer', eventId, choice }));
}

export async function readMomentResult(eventId: string): Promise<MomentResult | null> {
  const reply = await playerCommand({ action: 'event-result', eventId });
  return reply.result === null ? null : confirmedMoment(reply);
}
