"use client";

import { getFirebase } from "@/services/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

export interface LessonGroupEntry {
  category: string;
  name: string;
  order: number;
  createdAt?: number;
  createdBy?: string;
}

const STORAGE_KEY = "brainbloom-lesson-groups";

function isFirestoreAvailable() {
  const { db } = getFirebase();
  return !!db;
}

function getLocalGroups(): LessonGroupEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGroups(groups: LessonGroupEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

async function getFirestoreGroups(): Promise<LessonGroupEntry[]> {
  const { db } = getFirebase();
  if (!db) return [];
  try {
    const ref = doc(db, "settings", "lesson-groups");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { groups: LessonGroupEntry[] };
      return data.groups ?? [];
    }
    return [];
  } catch (e) {
    console.error("Firestore getFirestoreGroups failed:", e);
    return [];
  }
}

async function saveFirestoreGroups(groups: LessonGroupEntry[]) {
  const { db } = getFirebase();
  if (!db) return;
  try {
    const ref = doc(db, "settings", "lesson-groups");
    await setDoc(ref, { groups }, { merge: true });
  } catch (e) {
    console.error("Firestore saveFirestoreGroups failed:", e);
  }
}

export async function getAllLessonGroups(): Promise<LessonGroupEntry[]> {
  if (isFirestoreAvailable()) {
    const fs = await getFirestoreGroups();
    const local = getLocalGroups();
    const merged = [...fs];
    for (const lg of local) {
      const idx = merged.findIndex((m) => m.category === lg.category && m.name === lg.name);
      if (idx >= 0) {
        merged[idx] = lg;
      } else {
        merged.push(lg);
      }
    }
    saveLocalGroups(merged);
    return merged;
  }
  return getLocalGroups();
}

export async function getLessonGroups(category: string): Promise<LessonGroupEntry[]> {
  const all = await getAllLessonGroups();
  return all.filter((g) => g.category === category).sort((a, b) => a.order - b.order);
}

export async function addLessonGroup(category: string, name: string, order: number, createdBy?: string): Promise<boolean> {
  const groups = await getAllLessonGroups();
  if (groups.some((g) => g.category === category && g.name === name)) return false;
  const entry: LessonGroupEntry = {
    category,
    name,
    order,
    createdAt: Date.now(),
    createdBy,
  };
  groups.push(entry);
  if (isFirestoreAvailable()) {
    await saveFirestoreGroups(groups);
  }
  saveLocalGroups(groups);
  return true;
}

export async function removeLessonGroup(category: string, name: string) {
  const groups = await getAllLessonGroups();
  const filtered = groups.filter((g) => !(g.category === category && g.name === name));
  if (isFirestoreAvailable()) {
    await saveFirestoreGroups(filtered);
  }
  saveLocalGroups(filtered);
}

export async function updateLessonGroup(category: string, oldName: string, newName: string, newOrder: number) {
  const groups = await getAllLessonGroups();
  const idx = groups.findIndex((g) => g.category === category && g.name === oldName);
  if (idx === -1) return;
  groups[idx] = { ...groups[idx], name: newName, order: newOrder };
  if (isFirestoreAvailable()) {
    await saveFirestoreGroups(groups);
  }
  saveLocalGroups(groups);
}

export async function reorderLessonGroups(category: string, orderedNames: string[]) {
  const groups = await getAllLessonGroups();
  const catGroups = groups.filter((g) => g.category === category);
  const otherGroups = groups.filter((g) => g.category !== category);
  const reordered = orderedNames.map((name, i) => {
    const found = catGroups.find((g) => g.name === name);
    return found ? { ...found, order: i + 1 } : null;
  }).filter(Boolean) as LessonGroupEntry[];
  const merged = [...otherGroups, ...reordered];
  if (isFirestoreAvailable()) {
    await saveFirestoreGroups(merged);
  }
  saveLocalGroups(merged);
}
