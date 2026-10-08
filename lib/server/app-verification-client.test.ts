import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ configured: true, token: vi.fn() }));
vi.mock('@/services/firebase', () => ({ getFirebase: () => ({ appCheck: mocks.configured ? {} : null }) }));
vi.mock('firebase/app-check', () => ({ getToken: (...args: unknown[]) => mocks.token(...args) }));

beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); vi.useFakeTimers(); mocks.configured = true; });
afterEach(() => vi.useRealTimers());

it('keeps a slow attestation attempt in the background and reuses it for later requests', async () => {
  let finish!: (value: { token: string }) => void;
  mocks.token.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const { requestVerification } = await import('@/services/app-verification');
  const first = requestVerification();
  await vi.advanceTimersByTimeAsync(150);
  expect(await first).toBeNull();
  const second = requestVerification();
  finish({ token: 'valid-app-token' });
  expect(await second).toBe('valid-app-token');
  expect(mocks.token).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('uses a cached token immediately and does not turn provider failure into a login error', async () => {
  const { requestVerification } = await import('@/services/app-verification');
  mocks.token.mockResolvedValueOnce({ token: 'cached-app-token' });
  expect(await requestVerification()).toBe('cached-app-token');
  mocks.token.mockRejectedValueOnce(new Error('Provider failed'));
  expect(await requestVerification()).toBeNull();
  mocks.configured = false;
  expect(await requestVerification()).toBeNull();
  expect(mocks.token).toHaveBeenCalledTimes(2);
});
