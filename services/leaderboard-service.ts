"use client";

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarId: string | null;
  photoURL: string | null;
  weeklyXp: number;
  level: number;
  tier: "free" | "premium";
}

export interface LeaderboardResult {
  leaders: LeaderboardEntry[];
  rank: number | null;
  unavailable: boolean;
}

const EMPTY: LeaderboardResult = { leaders: [], rank: null, unavailable: false };

export async function getWeeklyLeaderboard(uid: string | null, weeklyXp: number): Promise<LeaderboardResult> {
  try {
    const params = new URLSearchParams();
    if (uid) {
      params.set("uid", uid);
      params.set("xp", String(weeklyXp));
    }

    const res = await fetch(`/api/leaderboard${params.toString() ? `?${params}` : ""}`, {
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;

    const data = (await res.json()) as Partial<LeaderboardResult>;
    if (!Array.isArray(data.leaders)) return EMPTY;

    return {
      leaders: data.leaders as LeaderboardEntry[],
      rank: typeof data.rank === "number" ? data.rank : null,
      unavailable: data.unavailable === true,
    };
  } catch {
    return EMPTY;
  }
}