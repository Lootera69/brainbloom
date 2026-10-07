import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initialProgress } from '@/lib/server/player-progress';

const mock = vi.hoisted(() => ({
  state: {} as Record<string, unknown>, session: 0,
  auth: { currentUser: null as null | { uid: string; isAnonymous: boolean }, authStateReady: vi.fn() },
  load: vi.fn(), signIn: vi.fn(), setUser: vi.fn(), setState: vi.fn(), sync: vi.fn(),
}));
vi.mock('@/services/firebase', () => ({ getFirebase: () => ({ auth: mock.auth }) }));
vi.mock('firebase/auth', () => ({ signInAnonymously: (...args: unknown[]) => mock.signIn(...args) }));
vi.mock('@/services/user-service', () => ({ loadUserData: (...args: unknown[]) => mock.load(...args) }));
vi.mock('@/store/user-store', () => ({ getUserSessionVersion: () => mock.session, useUserStore: {
  getState: () => ({ ...mock.state, setUser: mock.setUser, syncToFirestore: mock.sync }),
  setState: (state: Record<string, unknown>) => mock.setState(state),
} }));

let ensureGuestSession: typeof import('@/services/guest-session').ensureGuestSession;
let guestHistoryKey: typeof import('@/services/guest-history').guestHistoryKey;
const now = Date.parse('2026-10-07T12:00:00Z');
const cloud = { ...initialProgress(now, 'Asia/Kolkata'), progressVersion: 1 };

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  mock.session = 0;
  const saved = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => saved.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { saved.set(key, value); }),
  });
  mock.state = {
    userId: 'legacy', isGuest: true, displayName: 'Guest', xp: 900, gems: 80,
    history: [{ title: 'Earlier puzzle' }], completedPuzzleIds: ['old'], experiencedWonderIds: ['wonder'],
    revision: 99999999, tier: 'premium', avatarId: 'owl', soundEnabled: false,
    hapticsEnabled: false, theme: 'dark', cloudRestoreBase: { xp: 900 },
  };
  mock.auth.currentUser = null;
  mock.auth.authStateReady.mockResolvedValue(undefined);
  mock.signIn.mockImplementation(async () => {
    mock.auth.currentUser = { uid: 'anonymous', isAnonymous: true };
    return { user: mock.auth.currentUser };
  });
  mock.load.mockResolvedValue(cloud);
  mock.setUser.mockImplementation((user: { uid: string; isAnonymous: boolean }, opts: { cloudData: object }) => {
    mock.session++;
    mock.state = { ...mock.state, ...opts.cloudData, userId: user.uid, isGuest: user.isAnonymous };
  });
  mock.setState.mockImplementation((state: Record<string, unknown>) => { mock.state = { ...mock.state, ...state }; });
  ({ ensureGuestSession } = await import('@/services/guest-session'));
  ({ guestHistoryKey } = await import('@/services/guest-history'));
});

afterEach(() => { vi.unstubAllGlobals(); });

it('archives old guest history and uses only fresh server rewards for concurrent guest starts', async () => {
  localStorage.setItem(guestHistoryKey, JSON.stringify({ earlier: { progress: { xp: 50 } } }));
  const first = ensureGuestSession(true);
  const second = ensureGuestSession(true);
  expect(second).toBe(first);
  await Promise.all([first, second]);
  expect(mock.signIn).toHaveBeenCalledTimes(1);
  expect(mock.load).toHaveBeenCalledExactlyOnceWith('anonymous');
  expect(mock.setUser).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ uid: 'anonymous', isAnonymous: true }), { cloudData: cloud });
  expect(mock.state).toMatchObject({
    userId: 'anonymous', xp: 0, gems: 0, revision: 0, tier: 'free', isGuest: true,
    completedPuzzleIds: [], experiencedWonderIds: [], history: [],
    avatarId: 'owl', soundEnabled: false, hapticsEnabled: false, theme: 'dark',
  });
  expect(mock.setState).toHaveBeenCalledExactlyOnceWith({ avatarId: 'owl', soundEnabled: false, hapticsEnabled: false, theme: 'dark' });
  expect(mock.sync).toHaveBeenCalledTimes(1);
  const archive = JSON.parse(localStorage.getItem(guestHistoryKey)!);
  expect(archive.legacy.progress).toMatchObject({ xp: 900, gems: 80, completedPuzzleIds: ['old'], history: [{ title: 'Earlier puzzle' }] });
  expect(archive.legacy.progress).not.toHaveProperty('cloudRestoreBase');
  expect(archive.earlier).toEqual({ progress: { xp: 50 } });
  await ensureGuestSession();
  expect(mock.load).toHaveBeenCalledTimes(1);
});

it('restores an existing anonymous server account without importing or archiving cached balances', async () => {
  mock.auth.currentUser = { uid: 'existing', isAnonymous: true };
  mock.state.userId = 'existing';
  mock.load.mockResolvedValue({ ...cloud, xp: 2400, gems: 350, revision: 8, completedPuzzleIds: ['cloud'], avatarId: 'fox' });
  await ensureGuestSession();
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(mock.state).toMatchObject({ userId: 'existing', xp: 2400, gems: 350, revision: 8, completedPuzzleIds: ['cloud'], avatarId: 'fox' });
  expect(localStorage.getItem(guestHistoryKey)).toBeNull();
  expect(mock.setState).not.toHaveBeenCalled();
  expect(mock.sync).not.toHaveBeenCalled();
});

it('keeps local history after an unavailable reward read and retries with the same anonymous identity', async () => {
  const before = { ...mock.state };
  mock.load.mockRejectedValueOnce(new Error('offline'));
  await expect(ensureGuestSession(true)).rejects.toThrow('offline');
  expect(mock.state).toEqual(before);
  expect(mock.setUser).not.toHaveBeenCalled();
  expect(localStorage.getItem(guestHistoryKey)).toBeNull();
  await ensureGuestSession(true);
  expect(mock.signIn).toHaveBeenCalledTimes(1);
  expect(mock.load).toHaveBeenCalledTimes(2);
  expect(mock.state).toMatchObject({ userId: 'anonymous', xp: 0, gems: 0 });
  expect(JSON.parse(localStorage.getItem(guestHistoryKey)!).legacy.progress.xp).toBe(900);
});

it.each(['broken', 'null', '[]', '42'])('does not overwrite corrupt guest archive %s or replace local progress', async (raw) => {
  localStorage.setItem(guestHistoryKey, raw);
  const before = { ...mock.state };
  await expect(ensureGuestSession(true)).rejects.toThrow('recovery');
  expect(localStorage.getItem(guestHistoryKey)).toBe(raw);
  expect(mock.state).toEqual(before);
  expect(mock.setUser).not.toHaveBeenCalled();
  expect(mock.sync).not.toHaveBeenCalled();
});

it.each(['throws', 'drops'])('does not replace local progress when archive storage %s the write', async (failure) => {
  vi.mocked(localStorage.setItem).mockImplementation(() => {
    if (failure === 'throws') throw new Error('quota');
  });
  const before = { ...mock.state };
  await expect(ensureGuestSession(true)).rejects.toThrow('device storage');
  expect(mock.state).toEqual(before);
  expect(mock.setUser).not.toHaveBeenCalled();
  expect(mock.sync).not.toHaveBeenCalled();
});

it('does not silently replace a permanent Firebase identity', async () => {
  mock.auth.currentUser = { uid: 'permanent', isAnonymous: false };
  await expect(ensureGuestSession()).rejects.toThrow('Finish signing in');
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(mock.load).not.toHaveBeenCalled();
});

it('leaves an active signed-in store alone during an automatic guest check', async () => {
  mock.state.isGuest = false;
  mock.auth.currentUser = { uid: 'permanent', isAnonymous: false };
  await ensureGuestSession();
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(mock.load).not.toHaveBeenCalled();
  expect(mock.setUser).not.toHaveBeenCalled();
});

it('waits for restored Firebase auth instead of creating an unnecessary guest', async () => {
  let finishAuth!: () => void;
  mock.auth.authStateReady.mockReturnValue(new Promise<void>((resolve) => { finishAuth = resolve; }));
  const pending = ensureGuestSession(true);
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(mock.load).not.toHaveBeenCalled();
  mock.auth.currentUser = { uid: 'restored', isAnonymous: true };
  finishAuth();
  await pending;
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(mock.load).toHaveBeenCalledExactlyOnceWith('restored');
  expect(mock.state.userId).toBe('restored');
});

it('rejects a session replaced during Firebase auth restoration before creating a guest', async () => {
  mock.auth.authStateReady.mockImplementation(async () => { mock.session++; });
  await expect(ensureGuestSession(true)).rejects.toThrow('sign-in changed');
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(mock.load).not.toHaveBeenCalled();
  expect(mock.setUser).not.toHaveBeenCalled();
});

it('rejects a session replaced during anonymous sign-in before restoring progress', async () => {
  mock.signIn.mockImplementation(async () => {
    mock.session++;
    mock.auth.currentUser = { uid: 'anonymous', isAnonymous: true };
    return { user: mock.auth.currentUser };
  });
  await expect(ensureGuestSession(true)).rejects.toThrow('sign-in changed');
  expect(mock.load).not.toHaveBeenCalled();
  expect(mock.setUser).not.toHaveBeenCalled();
});

it.each(['identity', 'session'])('rejects a changed %s while restoring guest progress without archiving it', async (changed) => {
  const before = { ...mock.state };
  mock.load.mockImplementation(async () => {
    if (changed === 'identity') mock.auth.currentUser = { uid: 'other', isAnonymous: false };
    else mock.session++;
    return cloud;
  });
  await expect(ensureGuestSession(true)).rejects.toThrow('sign-in changed');
  expect(mock.state).toEqual(before);
  expect(mock.setUser).not.toHaveBeenCalled();
  expect(localStorage.getItem(guestHistoryKey)).toBeNull();
});
