import { getFirebase } from '@/services/firebase';

let pending: Promise<void> | null = null;
let requested = false;

export function refreshPublishedCatalogue(): Promise<void> {
  requested = true;
  if (pending) return pending;
  pending = (async () => {
    while (requested) {
      requested = false;
      const user = getFirebase().auth?.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/catalogue', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Published content refresh failed.');
    }
  })().catch(() => { console.error('Published content refresh failed.'); }).finally(() => { pending = null; });
  return pending;
}
