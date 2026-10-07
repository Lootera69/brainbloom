import type { PlayerAction, PlayerAnswer, PlayerResponse, PlayMode, PlayResult } from '@/lib/player-contract';
import { PlayerRequestError } from '@/services/player-service';

export class PlayerAttempt {
  private sessionId: string | null = null;
  private preparing: Promise<void> | null = null;
  private submitting: Promise<PlayResult> | null = null;
  private pendingAnswer: string | null = null;
  private complete = false;

  constructor(private puzzleId: string, private mode: PlayMode,
    private send: (command: PlayerAction) => Promise<PlayerResponse>) {}

  warmUp() { void this.prepare().catch(() => undefined); }

  prepare(): Promise<void> {
    if (this.sessionId) return Promise.resolve();
    return this.preparing ??= this.send({ action: 'start', puzzleId: this.puzzleId, mode: this.mode }).then((reply) => {
      const session = reply.session as { id?: unknown } | undefined;
      if (typeof session?.id !== 'string') throw new PlayerRequestError('This puzzle could not be started. Please retry.');
      this.sessionId = session.id;
    }).finally(() => { this.preparing = null; });
  }

  submit(answer: PlayerAnswer): Promise<PlayResult> {
    const encoded = JSON.stringify(answer);
    if (this.submitting) {
      return this.pendingAnswer === encoded ? this.submitting
        : Promise.reject(new PlayerRequestError('Wait for your previous answer to finish.'));
    }
    this.pendingAnswer = encoded;
    this.submitting = this.submitOnce(answer).finally(() => {
      this.submitting = null; this.pendingAnswer = null;
    });
    return this.submitting;
  }

  private async submitOnce(answer: PlayerAnswer): Promise<PlayResult> {
    if (this.complete) { this.sessionId = null; this.complete = false; }
    await this.prepare();
    try {
      const reply = await this.send({ action: 'answer', sessionId: this.sessionId!, answer });
      if (typeof reply.correct !== 'boolean' || typeof reply.completed !== 'boolean'
        || typeof reply.xpEarned !== 'number') throw new PlayerRequestError('The answer could not be confirmed. Please retry.');
      this.complete = reply.completed;
      return reply as unknown as PlayResult;
    } catch (error) {
      if (error instanceof PlayerRequestError && ['session-missing', 'session-expired', 'session-complete', 'attempt-limit'].includes(error.code)) this.sessionId = null;
      throw error;
    }
  }
}
