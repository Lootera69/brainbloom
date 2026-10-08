import type { Firestore } from 'firebase-admin/firestore';
import { afterEach, expect, it, vi } from 'vitest';
import { admitGuest, canonicalNetwork, guestNetwork, removeExpiredGuestLimits, takeGuestRequest } from '@/lib/server/player-abuse';

const now = Date.parse('2026-10-08T08:00:00Z');
afterEach(() => vi.unstubAllEnvs());

it('groups IPv6 privacy addresses and equivalent mapped IPv4 addresses into the same network', () => {
  expect(canonicalNetwork('2001:db8:1234:5678::1')).toBe(canonicalNetwork('2001:0db8:1234:5678:ffff:ffff:ffff:ffff'));
  expect(canonicalNetwork('2001:db8:1234:5678::1')).not.toBe(canonicalNetwork('2001:db8:1234:5679::1'));
  expect(canonicalNetwork('::ffff:192.0.2.17')).toBe(canonicalNetwork('192.0.2.17'));
  expect(canonicalNetwork('::ffff:c000:211')).toBe(canonicalNetwork('192.0.2.17'));
  for (const value of ['192.0.2.1, 198.51.100.1', 'not-an-ip', 'fe80::1%eth0', '192.0.2.1:3000', '']) {
    expect(canonicalNetwork(value)).toBeNull();
  }
});

it('uses the platform address and a secret hash, ignoring spoofed platform and device identifiers', () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('PLAYER_ABUSE_SECRET', 'private-test-secret-which-is-at-least-32-characters');
  const request = new Request('https://example.test/api/player', { headers: {
    'x-vercel-forwarded-for': '192.0.2.17', 'x-forwarded-for': '198.51.100.4', 'x-client-platform': 'android', 'x-device-id': 'changed',
  } });
  const first = guestNetwork(request, false)!;
  request.headers.set('x-forwarded-for', '203.0.113.20');
  request.headers.set('x-device-id', 'another');
  expect(guestNetwork(request, false)).toEqual(first);
  expect(first.key).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(first)).not.toContain('192.0.2.17');
  expect(first.attested).toBe(false);
  vi.stubEnv('PLAYER_ABUSE_SECRET', 'different-private-test-secret-at-least-32-characters');
  expect(guestNetwork(request, false)?.key).not.toBe(first.key);
});

it('fails closed on missing production configuration or trusted network data', () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('PLAYER_ABUSE_SECRET', 'short');
  const request = new Request('https://example.test');
  expect(() => guestNetwork(request, false)).toThrow('configured');
  vi.stubEnv('PLAYER_ABUSE_SECRET', 'private-test-secret-which-is-at-least-32-characters');
  expect(() => guestNetwork(request, false)).toThrow('network');
  request.headers.set('x-vercel-forwarded-for', '192.0.2.1, 192.0.2.2');
  expect(() => guestNetwork(request, false)).toThrow('network');
});

it('refills a bounded request budget without resetting it at a time-window boundary', () => {
  const saved = { version: 1, tokens: 0, updatedAt: now, admissions: [], expiresAt: now + 86400000 };
  expect(takeGuestRequest(saved, now + 999, false)).toMatchObject({ allowed: false, retryAfter: 1 });
  expect(takeGuestRequest(saved, now + 1000, false)).toMatchObject({ allowed: true, record: { tokens: 0 } });
  expect(takeGuestRequest(saved, now - 1000, false)).toMatchObject({ allowed: false });
  expect(takeGuestRequest(saved, now + 86400000, false)).toMatchObject({ allowed: true, record: { tokens: 59 } });
  expect(() => takeGuestRequest({ ...saved, tokens: 'unlimited' }, now, false)).toThrow('invalid');
});

it('limits guest creation over rolling hourly and daily windows and expires only old admissions', () => {
  const recent = takeGuestRequest({ version: 1, tokens: 60, updatedAt: now, admissions: Array(12).fill(now - 1000) }, now, false);
  if (!recent.allowed) throw Error('Expected request budget');
  expect(admitGuest(recent.record, now, false)).toMatchObject({ allowed: false, retryAfter: 3599 });
  expect(admitGuest(recent.record, now, true)).toMatchObject({ allowed: true });
  const daily = takeGuestRequest({ version: 1, tokens: 60, updatedAt: now, admissions: Array(50).fill(now - 7200000) }, now, false);
  if (!daily.allowed) throw Error('Expected request budget');
  expect(admitGuest(daily.record, now, false)).toMatchObject({ allowed: false, retryAfter: 79200 });
  const expired = takeGuestRequest(daily.record, now + 86400000, false);
  if (!expired.allowed) throw Error('Expected request budget');
  expect(admitGuest(expired.record, now + 86400000, false)).toMatchObject({ allowed: true, record: { admissions: [now + 86400000] } });
});

it('cleans expired counters with an update-time precondition so an active counter cannot be erased', async () => {
  const remove = vi.fn();
  const commit = vi.fn().mockRejectedValue(new Error('Changed since query'));
  const ref = { path: 'playerAbuse/old' };
  const updateTime = { seconds: 123 };
  const get = vi.fn().mockResolvedValue({ empty: false, docs: [{ ref, updateTime }], size: 1 });
  const limit = vi.fn(() => ({ get }));
  const where = vi.fn(() => ({ limit }));
  const db = { collection: vi.fn(() => ({ where })), batch: () => ({ delete: remove, commit }) };
  await expect(removeExpiredGuestLimits(db as unknown as Firestore, now)).rejects.toThrow('Changed since query');
  expect(where).toHaveBeenCalledWith('expiresAt', '<=', now);
  expect(remove).toHaveBeenCalledExactlyOnceWith(ref, { lastUpdateTime: updateTime });
});
