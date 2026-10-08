import { getToken } from 'firebase/app-check';
import { getFirebase } from '@/services/firebase';

let pending: Promise<string | null> | null = null;

export async function requestVerification(): Promise<string | null> {
  const { appCheck } = getFirebase();
  if (!appCheck) return null;
  pending ??= getToken(appCheck).then(({ token }) => token || null).catch(() => null).finally(() => { pending = null; });
  const current = pending;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 150);
    current.then((token) => { clearTimeout(timer); resolve(token); });
  });
}
