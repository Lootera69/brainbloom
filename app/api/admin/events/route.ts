import { getFirestore } from "firebase-admin/firestore";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { authoredEventConfig } from "@/lib/server/event-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const snap = await getFirestore(admin.app).doc("settings/events").get();
    return privateJson({ ...authoredEventConfig(snap.data()), published: snap.exists });
  } catch { return privateJson({ error: "Could not load Moments." }, 503); }
}
