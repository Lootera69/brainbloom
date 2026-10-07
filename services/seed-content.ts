"use client";

import { getFirebase } from "@/services/firebase";
import type { IdentifiedSeedPuzzle, SeedData } from "@/scripts/seed-data/importer";
import type { SeedMetadata } from "@/types/seed-content";

async function readSeed<T>(query = ""): Promise<T> {
  const user = getFirebase().auth?.currentUser;
  if (!user) throw new Error("Sign in to load seed data.");
  const token = await user.getIdToken();
  const response = await fetch(`/api/admin/seed${query}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (getFirebase().auth?.currentUser?.uid !== user.uid) throw new Error("Your sign-in changed. Please reload seed data.");
  if (!response.ok) throw new Error(data.error ?? "Seed data could not be loaded.");
  return data as T;
}

export const getSeedMetadata = () => readSeed<SeedMetadata>();

export async function getCipherSeeds(): Promise<IdentifiedSeedPuzzle[]> {
  return (await getSeedData("ciphers")).puzzles.map((puzzle) => {
    if (!("id" in puzzle) || typeof puzzle.id !== "string" || !puzzle.id) throw new Error("Cipher data is missing a stable ID.");
    return { ...puzzle, id: puzzle.id };
  });
}

export async function getSeedData(source: "legacy" | "forge" | "ciphers"): Promise<SeedData> {
  const userId = getFirebase().auth?.currentUser?.uid;
  const data: SeedData = { lessonGroups: [], puzzles: [] };
  let pages = 1;
  for (let page = 0; page < pages; page++) {
    const next = await readSeed<SeedData & { page: number; pages: number }>(`?source=${source}&page=${page}`);
    if (getFirebase().auth?.currentUser?.uid !== userId) throw new Error("Your sign-in changed. Please reload seed data.");
    if (next.page !== page || !Number.isInteger(next.pages) || next.pages < 1 || next.pages > 100
      || !Array.isArray(next.puzzles) || !Array.isArray(next.lessonGroups)) throw new Error("Seed data is invalid.");
    if (page > 0 && pages !== next.pages) throw new Error("Seed data changed during download. Please retry.");
    pages = next.pages;
    data.lessonGroups = next.lessonGroups;
    data.puzzles.push(...next.puzzles);
  }
  if (data.puzzles.length === 0) throw new Error("Seed data is empty.");
  return data;
}
