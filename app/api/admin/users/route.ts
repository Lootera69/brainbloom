import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/push-send";
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
  // Fail closed: no secret = no access.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });
  }

  // Verify the caller is an admin via the invite code.
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code." }, { status: 401 });
  }

  const app = getAdminApp();
  if (!app) {
    return NextResponse.json({ ok: false, error: "Firebase Admin not configured." }, { status: 500 });
  }

  const db = getFirestore(app);

  // Verify the code is an admin code.
  try {
    const settingsSnap = await db.doc("settings/studio").get();
    if (settingsSnap.exists) {
      const codes = (settingsSnap.data()?.codes ?? []) as { code?: string; role?: string }[];
      const entry = codes.find((c) => c.code === code);
      if (!entry || entry.role !== "admin") {
        return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
      }
    } else {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }
  } catch (e) {
    console.error("Failed to verify admin code:", e);
    return NextResponse.json({ ok: false, error: "Auth verification failed." }, { status: 500 });
  }

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

    return NextResponse.json({ ok: true, users, total: users.length });
  } catch (e) {
    console.error("Failed to fetch users:", e);
    return NextResponse.json({ ok: false, error: "Failed to fetch users." }, { status: 500 });
  }
}
