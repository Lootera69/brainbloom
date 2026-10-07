import { signInAnonymously } from 'firebase/auth';
import { getFirebase } from '@/services/firebase';
import { getUserSessionVersion, useUserStore } from '@/store/user-store';
import { loadUserData } from '@/services/user-service';
import { preserveGuestHistory } from '@/services/guest-history';

let readySession = -1;
let readyUid: string | null = null;
let pending: Promise<void> | null = null;

export function ensureGuestSession(explicit = false): Promise<void> {
  if (pending) return pending;
  pending = connect(explicit).finally(() => { pending = null; });
  return pending;
}

async function connect(explicit: boolean) {
  const auth = getFirebase().auth;
  if (!auth) throw new Error('Connect to the internet to start guest play.');
  const session = getUserSessionVersion();
  await auth.authStateReady();
  if (getUserSessionVersion() !== session) throw new Error('Your sign-in changed. Please retry.');
  const state = useUserStore.getState();
  if (!explicit && !state.isGuest) return;
  if (!explicit && auth.currentUser && !auth.currentUser.isAnonymous) throw new Error('Finish signing in to continue.');
  const user = auth.currentUser?.isAnonymous ? auth.currentUser : (await signInAnonymously(auth)).user;
  if (getUserSessionVersion() !== session) throw new Error('Your sign-in changed. Please retry.');
  if (state.userId === user.uid && readyUid === user.uid && readySession === session) return;
  const cloud = await loadUserData(user.uid);
  if (getUserSessionVersion() !== session || auth.currentUser?.uid !== user.uid) throw new Error('Your sign-in changed. Please retry.');
  const migrating = state.userId !== user.uid;
  if (migrating) preserveGuestHistory();
  useUserStore.getState().setUser({ uid: user.uid, displayName: state.displayName || 'Guest',
    email: null, photoURL: null, isAnonymous: true }, { cloudData: cloud as Record<string, unknown> });
  readyUid = user.uid;
  readySession = getUserSessionVersion();
  if (migrating) {
    useUserStore.setState({ avatarId: state.avatarId, soundEnabled: state.soundEnabled,
      hapticsEnabled: state.hapticsEnabled, theme: state.theme });
    useUserStore.getState().syncToFirestore();
  }
}
