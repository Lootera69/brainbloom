"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Puzzle } from '@/types/puzzle';
import type { PlayerAnswer, PlayerProgress, PlayMode, PlayResult } from '@/lib/player-contract';
import { previewTransport } from '@/services/preview-attempt';
import { PlayerAttempt } from '@/services/player-attempt';
import { playerCommand } from '@/services/player-progress';
import { PlayerRequestError } from '@/services/player-service';
import { useUserStore } from '@/store/user-store';

export const PlayModeContext = createContext<PlayMode>('challenge');
export const PreviewContext = createContext(false);

export function useVerifiedPuzzle(source: Puzzle, overrideMode?: PlayMode) {
  const contextMode = useContext(PlayModeContext);
  const preview = useContext(PreviewContext);
  const mode = overrideMode ?? contextMode;
  const uid = useUserStore((state) => state.userId);
  const attempt = useMemo(() => new PlayerAttempt(source.id, mode, preview
    ? previewTransport(source, useUserStore.getState() as unknown as PlayerProgress) : (command) => {
    if (useUserStore.getState().userId !== uid) {
      return Promise.reject(new PlayerRequestError('Your sign-in changed. Please retry.', 'identity-changed'));
    }
    return playerCommand(command);
  }), [source, mode, uid, preview]);
  const [state, setState] = useState<{ attempt: PlayerAttempt; result: PlayResult | null; busy: boolean } | null>(null);
  const result = state?.attempt === attempt ? state.result : null;
  const busy = state?.attempt === attempt && state.busy;
  const running = useRef<PlayerAttempt | null>(null);
  const active = useRef<PlayerAttempt | null>(null);
  useEffect(() => {
    active.current = attempt;
    attempt.warmUp();
    return () => { active.current = null; };
  }, [attempt]);
  const submit = useCallback(async (answer: PlayerAnswer): Promise<PlayResult | null> => {
    if (running.current === attempt) return null;
    running.current = attempt;
    setState({ attempt, result: null, busy: true });
    try {
      const reply = await attempt.submit(answer);
      if (active.current !== attempt) return null;
      setState({ attempt, result: reply, busy: false });
      return reply;
    } catch (error) {
      if (active.current === attempt) toast.error(error instanceof Error ? error.message : 'Connect and retry.');
      return null;
    } finally {
      if (running.current === attempt) running.current = null;
      if (active.current === attempt) {
        setState((previous) => previous?.attempt === attempt ? { ...previous, busy: false } : previous);
      }
    }
  }, [attempt]);
  const puzzle = { ...source, ...(result?.solution ?? {}) } as Puzzle;
  return { puzzle, submit, busy, result };
}
