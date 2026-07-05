import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

function initFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return { app, auth };
}

export async function signInWithGoogle(): Promise<User | null> {
  const { auth: fbAuth } = initFirebase();
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(fbAuth!, provider);
    return result.user;
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  const { auth: fbAuth } = initFirebase();
  await firebaseSignOut(fbAuth!);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  const { auth: fbAuth } = initFirebase();
  return fbAuth!.onAuthStateChanged(callback);
}
