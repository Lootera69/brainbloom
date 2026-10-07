import { NextRequest, NextResponse } from "next/server";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
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

const TOP_N = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function currentWeekStartUtc(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.getTime();
}

function respond(data: { leaders: LeaderboardEntry[]; rank: number | null; unavailable?: boolean }) {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const app = getAdminApp();
  if (!app) return respond({ leaders: [], rank: null, unavailable: true });

  const requestedUid = request.nextUrl.searchParams.get("uid");
  const uid = requestedUid && requestedUid.length <= 128 && !requestedUid.includes("/")
    ? requestedUid : null;
  const weekStart = currentWeekStartUtc();
  const weekEnd = weekStart + WEEK_MS;
  const usersRef = getFirestore(app).collection("users");

  try {
    const currentWeek = usersRef
      .where("weeklyStartDate", ">=", weekStart)
      .where("weeklyStartDate", "<", weekEnd)
      .where("weeklyXp", ">", 0)
      .orderBy("weeklyXp", "desc")
      .orderBy("weeklyStartDate", "asc")
      .orderBy(FieldPath.documentId(), "asc");

    const [snap, own] = await Promise.all([
      currentWeek.limit(TOP_N).select("displayName", "avatarId", "photoURL", "weeklyXp", "level", "tier").get(),
      uid ? usersRef.doc(uid).get() : null,
    ]);
    const leaders: LeaderboardEntry[] = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        displayName: typeof d.displayName === "string" && d.displayName.trim() ? d.displayName : "Anonymous",
        avatarId: typeof d.avatarId === "string" ? d.avatarId : null,
        photoURL: typeof d.photoURL === "string" ? d.photoURL : null,
        weeklyXp: d.weeklyXp,
        level: typeof d.level === "number" && Number.isFinite(d.level) ? d.level : 1,
        tier: d.tier === "premium" ? "premium" : "free",
      };
    });

    let rank: number | null = null;
    const listedIndex = leaders.findIndex((entry) => entry.uid === uid);
    if (listedIndex !== -1) {
      rank = listedIndex + 1;
    } else if (own?.exists) {
      const data = own.data();
      if (typeof data?.weeklyXp === "number" && Number.isFinite(data.weeklyXp) && data.weeklyXp > 0
        && typeof data.weeklyStartDate === "number" && data.weeklyStartDate >= weekStart && data.weeklyStartDate < weekEnd) {
        const ahead = await currentWeek.endBefore(own).count().get();
        rank = ahead.data().count + 1;
      }
    }

    return respond({ leaders, rank });
  } catch (e) {
    console.error("Leaderboard query failed:", e);
    return respond({ leaders: [], rank: null, unavailable: true });
  }
}
