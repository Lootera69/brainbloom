"use client";

import { getFirebase } from '@/services/firebase';
import { playerApi, PlayerRequestError } from '@/services/player-service';
import { getUserSessionVersion, useUserStore } from '@/store/user-store';
import type { PlayerAction, PlayerResponse } from '@/lib/player-contract';
import { rememberPlayerProgress } from '@/lib/verified-player-progress';

let refreshStarted = -Infinity;
let refreshing: Promise<void> | null = null;

export function applyPlayerResponse(uid: string, reply: PlayerResponse) {
  const current = useUserStore.getState();
  if (current.userId !== uid || getFirebase().auth?.currentUser?.uid !== uid) {
    throw new PlayerRequestError('Your sign-in changed. Please retry.', 'identity-changed');
  }
  if (rememberPlayerProgress(uid, reply.progress) !== reply.progress) return;
  useUserStore.setState({ ...reply.progress, _lastEvalDate: reply.progress.lastEvalDate ?? '',
    lastXpGain: typeof reply.xpEarned === 'number' ? reply.xpEarned : 0,
  });
}

export async function playerCommand(command: PlayerAction): Promise<PlayerResponse> {
  const auth = getFirebase().auth;
  const restoringSession = getUserSessionVersion();
  if (!auth) throw new PlayerRequestError('Sign in to continue.', 'sign-in-required');
  await auth.authStateReady();
  if (getUserSessionVersion() !== restoringSession) {
    throw new PlayerRequestError('Your sign-in changed. Please retry.', 'identity-changed');
  }
  if (useUserStore.getState().isGuest) {
    const { ensureGuestSession } = await import('@/services/guest-session');
    await ensureGuestSession();
  }
  const uid = useUserStore.getState().userId;
  const session = getUserSessionVersion();
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new PlayerRequestError('Connect to the internet and sign in to earn rewards.', 'sign-in-required');
  }
  const reply = await playerApi.send(command);
  if (getUserSessionVersion() !== session) {
    throw new PlayerRequestError('Your sign-in changed. Please retry.', 'identity-changed');
  }
  applyPlayerResponse(uid, reply);
  return reply;
}

export async function refreshPlayerProgress() {
  const timeZone = useUserStore.getState().timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  await playerCommand({ action: 'snapshot', timeZone });
}

export function refreshPlayerProgressIfDue(): Promise<void> {
  if (refreshing) return refreshing;
  if (performance.now() - refreshStarted < 30000) return Promise.resolve();
  refreshStarted = performance.now();
  refreshing = refreshPlayerProgress().catch(() => undefined).finally(() => { refreshing = null; });
  return refreshing;
}
