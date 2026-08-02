import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Fail closed: without a configured secret this route would let anyone
  // notify every user on demand.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run the daily push job.");
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await sendPushToAll(
    "Your daily puzzle is ready",
    "A fresh brain workout is waiting in BrainBloom. Keep your streak alive!",
    "/",
  );
  return NextResponse.json({ ok: true, ...result });
}
