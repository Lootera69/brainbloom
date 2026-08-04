import { NextRequest, NextResponse } from "next/server";
import { sendPushForLocalHour, sendEveningPushForLocalHour } from "@/lib/push-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Evening: streak-aware reminder for users whose local time is 7 PM
  const evening = await sendEveningPushForLocalHour(utcHour);

  return NextResponse.json({ ok: true, morning, evening });
}
