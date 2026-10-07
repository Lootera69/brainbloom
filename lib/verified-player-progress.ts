import type { PlayerProgress } from '@/lib/player-contract';

const received = new Map<string, PlayerProgress>();

export function rememberPlayerProgress(uid: string, progress: PlayerProgress): PlayerProgress {
  const previous = received.get(uid);
  if (previous && previous.revision > progress.revision) return previous;
  received.set(uid, progress);
  return progress;
}
