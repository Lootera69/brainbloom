import { useUserStore } from '@/store/user-store';

export const guestHistoryKey = 'guest_history_archive';

export function preserveGuestHistory() {
  const state = useUserStore.getState();
  if (!state.isGuest || (!state.xp && !state.gems && !state.history.length && !state.completedPuzzleIds.length && !state.experiencedWonderIds.length)) return;
  const raw = localStorage.getItem(guestHistoryKey);
  let entries: Record<string, unknown>;
  try { entries = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error('Your saved guest history needs recovery before continuing.'); }
  if (!entries || Array.isArray(entries) || typeof entries !== 'object') throw new Error('Your saved guest history needs recovery before continuing.');
  entries[state.userId || 'legacy'] = { savedAt: Date.now(), progress: {
    ...state, cloudRestoreBase: undefined,
  } };
  try {
    const serialized = JSON.stringify(entries);
    localStorage.setItem(guestHistoryKey, serialized);
    if (localStorage.getItem(guestHistoryKey) !== serialized) throw new Error('Storage verification failed.');
  }
  catch { throw new Error('Free some device storage so your guest history can be preserved.'); }
}
