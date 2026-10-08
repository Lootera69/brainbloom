import { beforeEach, expect, it, vi } from 'vitest';
import { applyPlayerResponse, playerCommand } from '@/services/player-progress';
import { playerApi } from '@/services/player-service';
import { rememberPlayerProgress } from '@/lib/verified-player-progress';
import { initialProgress } from '@/lib/server/player-progress';

const mock = vi.hoisted(() => ({
  state: {} as Record<string, unknown>, uid: '', session: 0, count: 0, ready: vi.fn(),
}));
vi.mock('@/services/firebase', () => ({ getFirebase: () => ({ auth: {
  get currentUser() { return mock.uid ? { uid: mock.uid } : null; }, authStateReady: mock.ready,
} }) }));
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
  mock.ready.mockReset().mockResolvedValue(undefined);
});

it('waits for a saved login to restore before requesting the Daily Set on a page reload', async () => {
  const restoredUid = mock.uid;
  mock.uid = '';
  let finish!: () => void;
  mock.ready.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  const send = vi.spyOn(playerApi, 'send').mockResolvedValue(reply(1, 20));
  const pending = playerCommand({ action: 'daily-set', categories: [] }).then(
    value => ({ value, error: undefined }), error => ({ value: undefined, error }),
  );
  await Promise.resolve();
  expect(send).not.toHaveBeenCalled();
  mock.uid = restoredUid;
  finish();
  const result = await pending;
  expect(result.error).toBeUndefined();
  expect(result.value?.progress.xp).toBe(20);
  expect(mock.ready).toHaveBeenCalledOnce();
  expect(send).toHaveBeenCalledExactlyOnceWith({ action: 'daily-set', categories: [] });
});

it('does not send a pending command when sign-out happens while the saved login restores', async () => {
  let finish!: () => void;
  mock.ready.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  const send = vi.spyOn(playerApi, 'send').mockResolvedValue(reply(1, 20));
  const pending = playerCommand({ action: 'daily-bonus' }).then(
    value => ({ value, error: undefined }), error => ({ value: undefined, error }),
  );
  await Promise.resolve();
  mock.session++;
  finish();
  expect((await pending).error).toMatchObject({ code: 'identity-changed' });
  expect(send).not.toHaveBeenCalled();
});

it('requires sign-in when authentication finishes without the saved account', async () => {
  mock.uid = '';
  const send = vi.spyOn(playerApi, 'send');
  await expect(playerCommand({ action: 'daily-set', categories: [] })).rejects.toMatchObject({ code: 'sign-in-required' });
  expect(send).not.toHaveBeenCalled();
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
