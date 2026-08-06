import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/push-send";

export const maxDuration = 60;

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarId: string | null;
  photoURL: string | null;
  weeklyXp: number;
  level: number;
  tier: "free" | "premium";
}

const FETCH_LIMIT = 200;
const TOP_N = 10;

// Monday 00:00 UTC — matches the client's weekly reset boundary (getWeekStart in user-store).
function currentWeekStartUtc(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.getTime();
}

export async function GET(request: NextRequest) {
  const app = getAdminApp();
  if (!app) {
    return NextResponse.json({ leaders: [], rank: null, unavailable: true });
  }

  const params = request.nextUrl.searchParams;
  const uid = params.get("uid");
  const myXp = Number(params.get("xp") ?? 0) || 0;
  const weekStart = currentWeekStartUtc();

  const db = getFirestore(app);
  const usersRef = db.collection("users");

  try {
    // Single-field query (automatic index) — no composite index required.
    const snap = await usersRef.orderBy("weeklyXp", "desc").limit(FETCH_LIMIT).get();

    const leaders: LeaderboardEntry[] = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const wxp = typeof d.weeklyXp === "number" ? d.weeklyXp : 0;
      const ws = typeof d.weeklyStartDate === "number" ? d.weeklyStartDate : 0;
      // Skip inactive weeks and empty scores.
      if (wxp <= 0 || ws < weekStart) continue;

      leaders.push({
        uid: doc.id,
        displayName: typeof d.displayName === "string" && d.displayName.trim() ? d.displayName : "Anonymous",
        avatarId: typeof d.avatarId === "string" ? d.avatarId : null,
        photoURL: typeof d.photoURL === "string" ? d.photoURL : null,
        weeklyXp: wxp,
        level: typeof d.level === "number" ? d.level : 1,
        tier: d.tier === "premium" ? "premium" : "free",
      });
      if (leaders.length >= TOP_N) break;
    }

    let rank: number | null = null;
    if (uid) {
      // Count of users with strictly more XP this week (single-field count query).
      const higher = await usersRef.where("weeklyXp", ">", myXp).count().get();
      rank = higher.data().count + 1;
    }

    return NextResponse.json({ leaders, rank });
  } catch (e) {
    console.error("Leaderboard query failed:", e);
    return NextResponse.json({ leaders: [], rank: null, unavailable: true });
  }
}
