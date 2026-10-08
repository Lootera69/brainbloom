"use client";

import { getFirebase } from '@/services/firebase';
import { playerApi, PlayerRequestError } from '@/services/player-service';
import { getUserSessionVersion, useUserStore } from '@/store/user-store';
import type { PlayerAction, PlayerResponse } from '@/lib/player-contract';
import { rememberPlayerProgress } from '@/lib/verified-player-progress';

let refreshStarted = -Infinity;
let refreshing: Promise<void> | null = null;
let refreshIdentity = '';
let confirmedAt = -Infinity;
let serverTime = 0;

const identityKey = () => `${useUserStore.getState().userId}:${getUserSessionVersion()}`;

export function applyPlayerResponse(uid: string, reply: PlayerResponse) {
  const current = useUserStore.getState();
  if (current.userId !== uid || getFirebase().auth?.currentUser?.uid !== uid) {
    throw new PlayerRequestError('Your sign-in changed. Please retry.', 'identity-changed');
  }
  if (rememberPlayerProgress(uid, reply.progress) !== reply.progress) return;
  if (refreshIdentity !== identityKey()) {
    refreshStarted = -Infinity;
    refreshing = null;
  }
  refreshIdentity = identityKey();
  confirmedAt = performance.now();
  serverTime = reply.serverTime;
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
  const state = useUserStore.getState();
  if (!state.isAuthenticated || !state.userId || getFirebase().auth?.currentUser?.uid !== state.userId
    || (typeof document !== 'undefined' && document.visibilityState !== 'visible')
    || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve();
  const identity = identityKey();
  const now = performance.now();
  if (refreshIdentity !== identity) {
    refreshIdentity = identity;
    refreshStarted = confirmedAt = -Infinity;
    serverTime = 0;
    refreshing = null;
  }
  if (refreshing) return refreshing;
  if (now - refreshStarted < 30000) return Promise.resolve();
  const currentServerTime = serverTime + now - confirmedAt;
  let dayChanged = false;
  if (serverTime) {
    try {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: state.timeZone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
      dayChanged = day.format(serverTime) !== day.format(currentServerTime);
    } catch { dayChanged = new Date(serverTime).getUTCDate() !== new Date(currentServerTime).getUTCDate(); }
  }
  const heartDue = state.tier !== 'premium' && state.nextHeartAt !== null && state.nextHeartAt <= currentServerTime;
  const premiumExpired = state.tier === 'premium' && state.subscriptionExpiry !== null && state.subscriptionExpiry <= currentServerTime;
  if (now - confirmedAt < 300000 && !dayChanged && !heartDue && !premiumExpired) return Promise.resolve();
  refreshStarted = now;
  const work = refreshPlayerProgress().catch(() => undefined).finally(() => { if (refreshing === work) refreshing = null; });
  refreshing = work;
  return refreshing;
}
