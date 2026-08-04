import { NextRequest, NextResponse } from "next/server";
import { sendPushForLocalHour, sendEveningPushForLocalHour } from "@/lib/push-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Fail closed: without a configured secret this route would let anyone
  // notify every user whose local time is 7 AM.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run the hourly push job.");
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  // The bucket is derived from the server clock, so a single scheduled job
  // (hourly, e.g. cron-job.org) covers every timezone without parameters.
  const utcHour = new Date().getUTCHours();

  // Morning: puzzle reminder for users whose local time is 7 AM
  const morning = await sendPushForLocalHour(
    utcHour,
    7,
    "Your daily puzzle is ready",
    "A fresh brain workout is waiting in BrainBloom. Keep your streak alive!",
    "/",
  );

  // Evening: streak-aware reminder for users whose local time is 7 PM.
  // ?testHour=<0-23> is a CRON_SECRET-gated override to verify delivery
  // on demand (already authenticated above) — filters by that local hour.
  const testParam = req.nextUrl.searchParams.get("testHour");
  const testHour = testParam !== null && /^\d{1,2}$/.test(testParam) ? Math.min(23, Math.max(0, Number(testParam))) : undefined;
  const evening = await sendEveningPushForLocalHour(utcHour, testHour);

  return NextResponse.json({ ok: true, morning, evening });
}
