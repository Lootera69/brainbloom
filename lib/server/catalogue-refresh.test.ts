import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/admin/catalogue/route';

const mock = vi.hoisted(() => ({ admin: vi.fn(), invalidate: vi.fn(), db: { projectId: 'demo-catalogue' } }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => mock.db }));
vi.mock('@/lib/server/staff-auth', () => ({ requireAdmin: mock.admin, privateJson: (body: unknown, status = 200) => Response.json(body, { status }) }));
vi.mock('@/lib/server/puzzle-catalogue', () => ({ invalidatePublishedCatalogue: mock.invalidate }));
beforeEach(() => vi.clearAllMocks());

it('does not let unauthenticated or non-admin callers evict the shared catalogue', async () => {
  for (const status of [401, 403]) {
    mock.admin.mockResolvedValue({ ok: false, response: Response.json({}, { status }) });
    expect((await POST(new Request('https://example.test/api/admin/catalogue', { method: 'POST' }))).status).toBe(status);
  }
  expect(mock.invalidate).not.toHaveBeenCalled();
});

it('invalidates cached published content only after current administrator authorization', async () => {
  mock.admin.mockResolvedValue({ ok: true, app: { options: { projectId: 'demo-catalogue' } }, uid: 'admin' });
  expect((await POST(new Request('https://example.test/api/admin/catalogue', { method: 'POST' }))).status).toBe(200);
  expect(mock.invalidate).toHaveBeenCalledExactlyOnceWith(mock.db, 'demo-catalogue');
});
