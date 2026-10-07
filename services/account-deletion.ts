export interface DeletionIdentity { uid: string; getIdToken(): Promise<string>; }

export async function deleteVerifiedAccount(options: {
  user: DeletionIdentity;
  currentUser: () => DeletionIdentity | null;
  session: () => number;
  signOut: () => Promise<void>;
  request?: typeof fetch;
}) {
  const revision = options.session();
  const current = () => options.currentUser()?.uid === options.user.uid && options.session() === revision;
  const changed = { success: false, error: 'Your sign-in changed. Please retry.' };
  if (!current()) return changed;
  try {
    const token = await options.user.getIdToken();
    if (!current()) return changed;
    const response = await (options.request ?? fetch)('/api/account', {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    if (!current()) return changed;
    if (!response.ok || result.ok !== true) return { success: false, needsReauth: result.needsReauth === true,
      error: typeof result.error === 'string' ? result.error : 'Account deletion failed. Please retry.' };
    await options.signOut();
    if (options.session() !== revision || options.currentUser() !== null) return changed;
    return { success: true };
  } catch {
    return { success: false, error: 'Account deletion failed. Please retry.' };
  }
}
