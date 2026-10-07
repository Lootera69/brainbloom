import { beforeEach, expect, it, vi } from 'vitest';
import { applyPlayerResponse, playerCommand } from '@/services/player-progress';
import { playerApi } from '@/services/player-service';
import { rememberPlayerProgress } from '@/lib/verified-player-progress';
import { initialProgress } from '@/lib/server/player-progress';

const mock = vi.hoisted(() => ({
  state: {} as Record<string, unknown>, uid: '', session: 0, count: 0,
}));
vi.mock('@/services/firebase', () => ({ getFirebase: () => ({ auth: { currentUser: { uid: mock.uid } } }) }));
vi.mock('@/store/user-store', () => ({
  getUserSessionVersion: () => mock.session,
  useUserStore: {
    getState: () => mock.state,
    setState: (value: Record<string, unknown>) => { mock.state = { ...mock.state, ...value }; },
  },
}));

const reply = (revision: number, xp: number) => ({
  progress: { ...initialProgress(Date.now(), 'Asia/Kolkata'), revision, xp }, serverTime: Date.now(),
});

beforeEach(() => {
  vi.restoreAllMocks();
  mock.uid = `player-${++mock.count}`;
  mock.session = 0;
  mock.state = { userId: mock.uid, revision: 999999999, xp: 999999999 };
});

it('replaces forged cached balances and ignores older responses after a verified restoration', () => {
  applyPlayerResponse(mock.uid, reply(2, 20));
  expect(mock.state).toMatchObject({ revision: 2, xp: 20 });
  const restored = reply(7, 70);
  rememberPlayerProgress(mock.uid, restored.progress);
  mock.state = { ...mock.state, ...restored.progress };
  applyPlayerResponse(mock.uid, reply(3, 30));
  expect(mock.state).toMatchObject({ revision: 7, xp: 70 });
  expect(rememberPlayerProgress(mock.uid, reply(4, 40).progress).xp).toBe(70);
});

it('rejects responses after sign-out even when the same account signs back in', async () => {
  vi.spyOn(playerApi, 'send').mockImplementation(async () => {
    mock.session++;
    return reply(1, 100);
  });
  await expect(playerCommand({ action: 'snapshot' })).rejects.toMatchObject({ code: 'identity-changed' });
  expect(mock.state.xp).toBe(999999999);
});

it('cannot apply another account response or request rewards under mismatched identities', async () => {
  expect(() => applyPlayerResponse('other', reply(20, 200))).toThrow('sign-in changed');
  mock.uid = 'other';
  await expect(playerCommand({ action: 'daily-bonus' })).rejects.toMatchObject({ code: 'sign-in-required' });
  expect(mock.state.xp).toBe(999999999);
});
