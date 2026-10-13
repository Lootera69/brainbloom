"use client";

import { staffHeaders } from "@/services/staff-session";
import type { DiscoverLesson, DiscoverLessonInput } from "@/types/discover";

const PUBLIC_CACHE_TTL = 5 * 60 * 1000;
let publicLessonsCache: { lessons: DiscoverLesson[]; ts: number } | null = null;
let publicLessonsInFlight: Promise<DiscoverLesson[]> | null = null;

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || "Discover request failed.");
  return body;
}

export async function getDiscoverLessons(options?: { forceRefresh?: boolean }): Promise<DiscoverLesson[]> {
  if (!options?.forceRefresh && publicLessonsCache && Date.now() - publicLessonsCache.ts < PUBLIC_CACHE_TTL) {
    return publicLessonsCache.lessons;
  }
  if (publicLessonsInFlight) return publicLessonsInFlight;
  publicLessonsInFlight = (async () => {
    const response = await fetch("/api/discover", { cache: "no-store" });
    const body = await readJson<{ lessons: DiscoverLesson[] }>(response);
    publicLessonsCache = { lessons: body.lessons, ts: Date.now() };
    return body.lessons;
  })();
  try { return await publicLessonsInFlight; } finally { publicLessonsInFlight = null; }
}

export async function getDiscoverLesson(id: string): Promise<DiscoverLesson | null> {
  const cache = publicLessonsCache;
  const cached = cache?.lessons.find((lesson) => lesson.id === id);
  if (cached && cache && Date.now() - cache.ts < PUBLIC_CACHE_TTL) return cached;
  const response = await fetch(`/api/discover/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  const body = await readJson<{ lesson: DiscoverLesson }>(response);
  return body.lesson;
}

export function clearDiscoverCache() {
  publicLessonsCache = null;
}

export async function getStudioDiscoverLessons(): Promise<DiscoverLesson[]> {
  const response = await fetch("/api/admin/discover", {
    cache: "no-store",
    headers: await staffHeaders(),
  });
  const body = await readJson<{ lessons: DiscoverLesson[] }>(response);
  return body.lessons;
}

export async function getStudioDiscoverLesson(id: string): Promise<DiscoverLesson | null> {
  const response = await fetch(`/api/admin/discover/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: await staffHeaders(),
  });
  if (response.status === 404) return null;
  const body = await readJson<{ lesson: DiscoverLesson }>(response);
  return body.lesson;
}

export async function saveDiscoverLesson(
  lesson: DiscoverLessonInput,
  id?: string,
  expectedUpdatedAt?: number,
): Promise<DiscoverLesson> {
  const headers = { ...(await staffHeaders()), "Content-Type": "application/json" };
  const response = await fetch(id ? `/api/admin/discover/${encodeURIComponent(id)}` : "/api/admin/discover", {
    method: id ? "PUT" : "POST",
    headers,
    body: JSON.stringify(id ? { lesson, expectedUpdatedAt } : { lesson }),
  });
  const body = await readJson<{ lesson: DiscoverLesson }>(response);
  clearDiscoverCache();
  return body.lesson;
}

export async function deleteDiscoverLesson(id: string, expectedUpdatedAt: number): Promise<void> {
  const response = await fetch(`/api/admin/discover/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...(await staffHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ expectedUpdatedAt }),
  });
  await readJson<{ ok: true }>(response);
  clearDiscoverCache();
}

export async function importStarterDiscoverLessons(): Promise<{ imported: number; skipped: number; repaired: number }> {
  const response = await fetch("/api/admin/discover/import", {
    method: "POST",
    headers: await staffHeaders(),
  });
  return readJson<{ imported: number; skipped: number; repaired: number }>(response);
}
