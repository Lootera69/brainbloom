import { beforeEach, expect, it, vi } from 'vitest';
import { purchaseProduct, restorePurchases, setPurchaseProvider } from '@/services/purchase-service';

const mock = vi.hoisted(() => ({ command: vi.fn(), refresh: vi.fn() }));
vi.mock('@/services/player-progress', () => ({ playerCommand: mock.command, refreshPlayerProgress: mock.refresh }));

beforeEach(() => {
  vi.clearAllMocks();
  setPurchaseProvider('mock');
});

it('only confirms a product after the server grants that exact product', async () => {
  let resolve!: (value: object) => void;
  mock.command.mockReturnValue(new Promise((done) => { resolve = done; }));
  const pending = purchaseProduct('gems_100');
  let completed = false;
  void pending.then(() => { completed = true; });
  await Promise.resolve();
  expect(completed).toBe(false);
  expect(mock.command).toHaveBeenCalledWith({ action: 'shop', productId: 'gems_100' });
  resolve({ productId: 'gems_100' });
  expect(await pending).toEqual({ success: true, productId: 'gems_100' });
});

it('rejects outages, mismatched products and unconfigured paid checkout', async () => {
  mock.command.mockRejectedValueOnce(new Error('Offline'));
  expect(await purchaseProduct('gems_100')).toMatchObject({ success: false, error: 'Offline' });
  mock.command.mockResolvedValueOnce({ productId: 'gems_500' });
  expect(await purchaseProduct('gems_100')).toMatchObject({ success: false });
  mock.command.mockClear();
  setPurchaseProvider('stripe');
  expect(await purchaseProduct('premium_yearly')).toMatchObject({ success: false });
  expect(mock.command).not.toHaveBeenCalled();
});

it('refreshes verified entitlements without reading or replaying a local purchase ledger', async () => {
  const getItem = vi.fn(() => '[{"productId":"premium_yearly"}]');
  vi.stubGlobal('localStorage', { getItem });
  try {
    expect(await restorePurchases()).toEqual([]);
    expect(mock.refresh).toHaveBeenCalledOnce();
    expect(mock.command).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
