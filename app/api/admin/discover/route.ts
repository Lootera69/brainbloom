import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { discoverLessonInputSchema } from "@/lib/discover/validation";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { studioDiscoverLessons, writeDiscoverLesson } from "@/lib/server/discover-content";
import { discoverFailure, discoverJson } from "@/lib/server/discover-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try { return privateJson({ lessons: await studioDiscoverLessons(getFirestore(admin.app)) }); }
  catch (error) { return discoverFailure(error); }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const { lesson } = z.object({ lesson: discoverLessonInputSchema }).parse(await discoverJson(request));
    return privateJson({ lesson: await writeDiscoverLesson(getFirestore(admin.app), lesson, admin.uid) }, 201);
  } catch (error) { return discoverFailure(error); }
}
