import { getFirestore } from 'firebase-admin/firestore';
import { privateJson, requireAdmin } from '@/lib/server/staff-auth';
import { invalidatePublishedCatalogue } from '@/lib/server/puzzle-catalogue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    invalidatePublishedCatalogue(getFirestore(admin.app), admin.app.options.projectId!);
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: 'Published content refresh is temporarily unavailable.' }, 503);
  }
}
