import { NextRequest } from "next/server";
import { sendPushToAll } from "@/lib/push-send";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return privateJson({ ok: false, error: "Invalid JSON body." }, 400);
  }

  if (!body || typeof body !== "object") return privateJson({ ok: false, error: "Invalid request." }, 400);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const url = typeof body.url === "string" && body.url ? body.url : "/";

  if (!title || title.length > 120 || message.length > 2000 || url.length > 2048
    || !url.startsWith("/") || url.startsWith("//") || /[\\\s]/.test(url)) {
    return privateJson({ ok: false, error: "Enter a title, a message up to 2000 characters, and an internal app path." }, 400);
  }

  const result = await sendPushToAll(title, message, url);
  return privateJson({ ok: true, ...result });
}
