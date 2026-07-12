import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 0;

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: Firestore | null = null;
let appCheck: AppCheck | null = null;

const recaptchaSiteKey =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    : undefined;

function initFirebase() {
  if (!app && firebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    if (recaptchaSiteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
  return { app, auth, db, appCheck };
}

export function getFirebase() {
  return initFirebase();
}

export async function signInWithGoogle(): Promise<User | null> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return null;
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(fbAuth, provider);
    return result.user;
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return;
  await firebaseSignOut(fbAuth);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return () => {};
  return fbAuth.onAuthStateChanged(callback);
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return null;
  try {
    const result = await signInWithEmailAndPassword(fbAuth, email, password);
    return result.user;
  } catch {
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<User | null> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return null;
  try {
    const result = await createUserWithEmailAndPassword(fbAuth, email, password);
    return result.user;
  } catch {
    return null;
  }
}

export async function signUpWithEmailFull(
  email: string,
  password: string,
  displayName: string,
): Promise<{ user: User | null; error?: string }> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return { user: null, error: "Firebase not configured" };
  try {
    const result = await createUserWithEmailAndPassword(fbAuth, email, password);
    await updateProfile(result.user, { displayName });
    return { user: result.user };
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "auth/email-already-in-use") return { user: null, error: "An account with this email already exists" };
    if (code === "auth/weak-password") return { user: null, error: "Password must be at least 6 characters" };
    if (code === "auth/invalid-email") return { user: null, error: "Invalid email address" };
    if (code === "auth/too-many-requests") return { user: null, error: "Too many attempts. Try again later" };
    return { user: null, error: "Something went wrong. Please try again" };
  }
}

export async function signInWithEmailFull(
  email: string,
  password: string,
): Promise<{ user: User | null; error?: string }> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return { user: null, error: "Firebase not configured" };
  try {
    const result = await signInWithEmailAndPassword(fbAuth, email, password);
    return { user: result.user };
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return { user: null, error: "Invalid email or password" };
    }
    if (code === "auth/invalid-email") return { user: null, error: "Invalid email address" };
    if (code === "auth/too-many-requests") return { user: null, error: "Too many attempts. Try again later" };
    if (code === "auth/user-disabled") return { user: null, error: "This account has been disabled" };
    return { user: null, error: "Something went wrong. Please try again" };
  }
}

export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const { auth: fbAuth } = initFirebase();
  if (!fbAuth) return { success: false, error: "Firebase not configured" };
  try {
    await sendPasswordResetEmail(fbAuth, email);
    return { success: true };
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "auth/user-not-found") return { success: false, error: "No account found with this email" };
    if (code === "auth/invalid-email") return { success: false, error: "Invalid email address" };
    if (code === "auth/too-many-requests") return { success: false, error: "Too many attempts. Try again later" };
    return { success: false, error: "Something went wrong. Please try again" };
  }
}
