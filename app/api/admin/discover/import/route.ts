import { getFirestore } from "firebase-admin/firestore";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { importStarterDiscoverLessons } from "@/lib/server/discover-content";
import { discoverFailure } from "@/lib/server/discover-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    return privateJson(await importStarterDiscoverLessons(getFirestore(admin.app), admin.uid));
  } catch (error) {
    return discoverFailure(error);
  }
}
