import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, sendPushToAll } from "@/lib/push-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const url = typeof body.url === "string" && body.url ? body.url : "/";

  if (!code || !password || !title) {
    return NextResponse.json({ ok: false, error: "code, password and title are required." }, { status: 400 });
  }

  const isAdmin = await verifyAdminCredentials(code, password);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Admin credentials required." }, { status: 403 });
  }

  const result = await sendPushToAll(title, message, url);
  return NextResponse.json({ ok: true, ...result });
}
