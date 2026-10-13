import { getFirestore } from "firebase-admin/firestore";
import { discoverDeleteSchema, discoverIdSchema, discoverUpdateSchema } from "@/lib/discover/validation";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { readDiscoverDocument, removeDiscoverLesson, writeDiscoverLesson } from "@/lib/server/discover-content";
import { discoverFailure, discoverJson } from "@/lib/server/discover-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const id = discoverIdSchema.parse((await context.params).id);
    const snapshot = await getFirestore(admin.app).doc(`discover/${id}`).get();
    const lesson = snapshot.exists ? readDiscoverDocument(snapshot) : null;
    return lesson ? privateJson({ lesson }) : privateJson({ error: "This Discover lesson could not be found." }, 404);
  } catch (error) { return discoverFailure(error); }
}

export async function PUT(request: Request, context: Context) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const id = discoverIdSchema.parse((await context.params).id);
    const { lesson, expectedUpdatedAt } = discoverUpdateSchema.parse(await discoverJson(request));
    return privateJson({ lesson: await writeDiscoverLesson(getFirestore(admin.app), lesson, admin.uid, { id, expectedUpdatedAt }) });
  } catch (error) { return discoverFailure(error); }
}

export async function DELETE(request: Request, context: Context) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const id = discoverIdSchema.parse((await context.params).id);
    const { expectedUpdatedAt } = discoverDeleteSchema.parse(await discoverJson(request));
    await removeDiscoverLesson(getFirestore(admin.app), id, expectedUpdatedAt);
    return privateJson({ ok: true });
  } catch (error) { return discoverFailure(error); }
}
