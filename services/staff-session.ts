"use client";

import { GoogleAuthProvider, onIdTokenChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getFirebase } from "@/services/firebase";
import { staffRole, type StaffRole } from "@/lib/staff-access";

export interface StaffSession { uid: string; role: StaffRole; displayName: string }

function staffName(user: User) {
  return user.displayName?.trim() || user.email?.trim() || "Studio member";
}

export function staffSignInError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code ?? "")) {
    return "Email or password is incorrect. If you joined with Google, choose Continue with Google.";
  }
  if (code === "auth/invalid-email") return "Enter a valid account email, or choose Continue with Google.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was closed. Please try again.";
  if (code === "auth/too-many-requests") return "Too many sign-in attempts. Please wait a moment and try again.";
  if (code?.startsWith("auth/")) return "Sign-in could not finish. Please try again.";
  return error instanceof Error ? error.message : "Sign-in failed. Try again.";
}

export async function staffHeaders(): Promise<Record<string, string>> {
  const user = getFirebase().auth?.currentUser;
  if (!user?.emailVerified) throw new Error("Sign in with a verified email first.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function enterStudio(user: User, code: string): Promise<StaffSession> {
  const { db } = getFirebase();
  if (!db || !user.emailVerified) throw new Error("Verify your email before entering Studio.");
  const existing = await getDoc(doc(db, "staffAccess", user.uid));
  const role = staffRole(existing.data());
  if (role) return { uid: user.uid, role, displayName: staffName(user) };
  if (existing.exists()) throw new Error("Studio access is disabled. Contact the administrator.");
  if (!code.trim()) throw new Error("An invitation code is required to join Studio.");
  const response = await fetch("/api/studio/access", {
    method: "POST", headers: { ...await staffHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not verify your invitation.");
  const accepted = staffRole((await getDoc(doc(db, "staffAccess", user.uid))).data());
  if (!accepted) throw new Error("Studio access could not be confirmed.");
  return { uid: user.uid, role: accepted, displayName: staffName(user) };
}

export async function signInStaff(email: string, password: string, code: string) {
  const { auth } = getFirebase();
  if (!auth) throw new Error("Sign-in is unavailable.");
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return enterStudio(result.user, code);
}

export async function signInStaffWithGoogle(code: string) {
  const { auth } = getFirebase();
  if (!auth) throw new Error("Sign-in is unavailable.");
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return enterStudio(result.user, code);
}

export function watchStaffSession(callback: (session: StaffSession | null) => void) {
  const { auth, db } = getFirebase();
  if (!auth || !db) { callback(null); return () => {}; }
  let unsubscribeAccess = () => {};
  const unsubscribeAuth = onIdTokenChanged(auth, (user) => {
    unsubscribeAccess();
    callback(null);
    if (!user?.emailVerified) return;
    unsubscribeAccess = onSnapshot(doc(db, "staffAccess", user.uid), (snap) => {
      if (auth.currentUser?.uid !== user.uid) return;
      const role = staffRole(snap.data());
      callback(role ? { uid: user.uid, role, displayName: staffName(user) } : null);
    }, () => callback(null));
  });
  return () => { unsubscribeAuth(); unsubscribeAccess(); };
}

export async function signOutStaff() {
  const { auth } = getFirebase();
  if (auth) await signOut(auth);
}
