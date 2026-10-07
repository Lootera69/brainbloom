import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";
import { authoredEventConfig } from "@/lib/server/event-config";
import { publicEventConfig } from "@/lib/events/public-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const app = getAdminApp();
  if (!app) return privateJson({ error: "Moments are temporarily unavailable." }, 503);
  try {
    const snap = await getFirestore(app).doc("settings/events").get();
    return privateJson(publicEventConfig(authoredEventConfig(snap.data())));
  } catch { return privateJson({ error: "Moments are temporarily unavailable." }, 503); }
}
