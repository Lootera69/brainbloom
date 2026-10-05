import { NextRequest } from "next/server";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AdminUserSummary {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  avatarId: string | null;
  tier: "free" | "premium";
  subscriptionExpiry: number | null;
  xp: number;
  level: number;
  streak: number;
  hearts: number;
  gems: number;
  puzzlesCompleted: number;
  achievementsCount: number;
  lastActiveDate: string | null;
  activeDaysCount: number;
  dailyPuzzleStreak: number;
  weeklyXp: number;
  timeZone: string | null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  const db = getFirestore(admin.app);

  // Fetch all user documents.
  try {
    const usersSnap = await db.collection("users").get();
    const users: AdminUserSummary[] = [];

    usersSnap.forEach((doc) => {
      const d = doc.data();
      const completed = Array.isArray(d.completedPuzzleIds) ? d.completedPuzzleIds.length : 0;
      const achievements = Array.isArray(d.achievements) ? d.achievements.length : 0;
      const activeDays = Array.isArray(d.activeDates) ? d.activeDates.length : 0;

      users.push({
        uid: doc.id,
        displayName: (d.displayName as string) ?? "",
        email: (d.email as string) ?? null,
        photoURL: (d.photoURL as string) ?? null,
        avatarId: (d.avatarId as string) ?? null,
        tier: (d.tier as "free" | "premium") ?? "free",
        subscriptionExpiry: (d.subscriptionExpiry as number) ?? null,
        xp: (d.xp as number) ?? 0,
        level: (d.level as number) ?? 1,
        streak: (d.streak as number) ?? 0,
        hearts: (d.hearts as number) ?? 5,
        gems: (d.gems as number) ?? 0,
        puzzlesCompleted: completed,
        achievementsCount: achievements,
        lastActiveDate: (d.lastActiveDate as string) ?? null,
        activeDaysCount: activeDays,
        dailyPuzzleStreak: (d.dailyPuzzleStreak as number) ?? 0,
        weeklyXp: (d.weeklyXp as number) ?? 0,
        timeZone: (d.timeZone as string) ?? null,
      });
    });

    return privateJson({ ok: true, users, total: users.length });
  } catch (e) {
    console.error("Failed to fetch users:", e);
    return privateJson({ ok: false, error: "Failed to fetch users." }, 500);
  }
}
