import { expect, it, vi } from 'vitest';
import { deleteVerifiedAccount } from '@/services/account-deletion';

it('deletes anonymous cloud data before signing out', async () => {
  const user = { uid: 'guest', getIdToken: async () => 'test' };
  let current: typeof user | null = user;
  const signOut = vi.fn(async () => { current = null; });
  const request = vi.fn(async () => new Response(JSON.stringify({ ok: true }))) as unknown as typeof fetch;
  expect(await deleteVerifiedAccount({ user, currentUser: () => current, session: () => 1, signOut, request })).toEqual({ success: true });
  expect(request).toHaveBeenCalledWith('/api/account', expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test' } }));
  expect(signOut).toHaveBeenCalledTimes(1);
});

it('never signs out a replacement account when a deletion response arrives late', async () => {
  const user = { uid: 'guest', getIdToken: async () => 'test' };
  let current = user;
  const signOut = vi.fn();
  const request = vi.fn(async () => { current = { ...user, uid: 'other' }; return new Response(JSON.stringify({ ok: true })); }) as unknown as typeof fetch;
  expect(await deleteVerifiedAccount({ user, currentUser: () => current, session: () => 1, signOut, request })).toMatchObject({ success: false });
  expect(signOut).not.toHaveBeenCalled();
});

it('rejects a changed session even if the same UID signs in again', async () => {
  const user = { uid: 'guest', getIdToken: async () => 'test' };
  let session = 1;
  const signOut = vi.fn();
  const request = vi.fn(async () => { session++; return new Response(JSON.stringify({ ok: true })); }) as unknown as typeof fetch;
  expect(await deleteVerifiedAccount({ user, currentUser: () => user, session: () => session, signOut, request })).toMatchObject({ success: false });
  expect(signOut).not.toHaveBeenCalled();
});

it('preserves the session on a failed cloud deletion', async () => {
  const user = { uid: 'guest', getIdToken: async () => 'test' };
  const signOut = vi.fn();
  const request = vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 503 })) as unknown as typeof fetch;
  expect(await deleteVerifiedAccount({ user, currentUser: () => user, session: () => 1, signOut, request })).toMatchObject({ success: false });
  expect(signOut).not.toHaveBeenCalled();
});
