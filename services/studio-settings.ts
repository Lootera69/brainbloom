"use client";

import { getFirebase } from "@/services/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

export interface InviteCodeEntry {
  code: string;
  password: string;
  role: "admin" | "contributor";
  createdAt?: number;
  createdBy?: string;
}

const CODES_KEY = "brainbloom-invite-codes";

const DEFAULT_CODES: InviteCodeEntry[] = [
  { code: "alpha-2026", password: "bloom@123", role: "admin" },
  { code: "beta-2026", password: "bloom@456", role: "contributor" },
  { code: "gamma-2026", password: "bloom@789", role: "contributor" },
];

function isFirestoreAvailable() {
  const { db } = getFirebase();
  return !!db;
}

function getLocalCodes(): InviteCodeEntry[] {
  if (typeof window === "undefined") return [...DEFAULT_CODES];
  try {
    const raw = localStorage.getItem(CODES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Handle legacy object format { code: password }
      if (!Array.isArray(parsed)) {
        const defaultMap = new Map(DEFAULT_CODES.map((d) => [d.code, d.role]));
        const migrated: InviteCodeEntry[] = Object.entries(parsed).map(([code, password]) => ({
          code,
          password: password as string,
          role: (defaultMap.get(code) ?? "contributor") as "admin" | "contributor",
        }));
        saveLocalCodes(migrated);
        return migrated;
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_CODES];
}

function saveLocalCodes(codes: InviteCodeEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

async function getFirestoreCodes(): Promise<InviteCodeEntry[]> {
  const { db } = getFirebase();
  if (!db) return [];
  try {
    const ref = doc(db, "settings", "studio");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { codes: InviteCodeEntry[] };
      const codes = data.codes ?? [];
      const defaultMap = new Map(DEFAULT_CODES.map((d) => [d.code, d.role]));
      return codes.map((c) => ({
        ...c,
        role: (c.role ?? defaultMap.get(c.code) ?? "contributor") as "admin" | "contributor",
      }));
    }
    // Seed defaults on first access
    await setDoc(ref, {
      codes: DEFAULT_CODES,
      createdAt: Timestamp.now(),
    });
    return [...DEFAULT_CODES];
  } catch (e) {
    console.error("Firestore getFirestoreCodes failed:", e);
    return [];
  }
}

async function saveFirestoreCodes(codes: InviteCodeEntry[]) {
  const { db } = getFirebase();
  if (!db) return;
  try {
    const ref = doc(db, "settings", "studio");
    await setDoc(ref, { codes }, { merge: true });
  } catch (e) {
    console.error("Firestore saveFirestoreCodes failed:", e);
  }
}

export async function getInviteCodes(): Promise<InviteCodeEntry[]> {
  if (isFirestoreAvailable()) {
    const fs = await getFirestoreCodes();
    // Merge local overrides on top of Firestore (local wins for dev)
    const local = getLocalCodes();
    const merged = [...fs];
    for (const lc of local) {
      const idx = merged.findIndex((m) => m.code === lc.code);
      if (idx >= 0) {
        merged[idx] = lc;
      } else {
        merged.push(lc);
      }
    }
    // Sync merged back to localStorage
    saveLocalCodes(merged);
    return merged;
  }
  return getLocalCodes();
}

export async function addInviteCode(code: string, password: string, role: "admin" | "contributor", createdBy?: string): Promise<boolean> {
  const codes = await getInviteCodes();
  if (codes.some((c) => c.code === code)) return false;
  const entry: InviteCodeEntry = {
    code,
    password,
    role,
    createdAt: Date.now(),
    createdBy,
  };
  codes.push(entry);
  if (isFirestoreAvailable()) {
    await saveFirestoreCodes(codes);
  }
  saveLocalCodes(codes);
  return true;
}

export async function removeInviteCode(code: string) {
  let codes = await getInviteCodes();
  codes = codes.filter((c) => c.code !== code);
  if (isFirestoreAvailable()) {
    await saveFirestoreCodes(codes);
  }
  saveLocalCodes(codes);
}

export async function verifyStudioCredentials(code: string, password: string): Promise<InviteCodeEntry | null> {
  const codes = await getInviteCodes();
  return codes.find((c) => c.code === code && c.password === password) ?? null;
}

export function isAdminRole(role: string): boolean {
  return role === "admin";
}
