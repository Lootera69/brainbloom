import { randomInt } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { privateJson } from "@/lib/server/staff-auth";
import { requirePlayer, smallJson } from "@/lib/server/player-http";
import { executePlayerCommand, playerCommandSchema, PlayerError } from "@/lib/server/player-engine";
import { playerDatabase } from "@/lib/server/player-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const started = performance.now();
  const identity = await requirePlayer(request);
  const authenticated = performance.now();
  const timed = (response: Response, databaseStarted?: number) => {
    const finished = performance.now();
    response.headers.set("Server-Timing", [
      `auth;dur=${(authenticated - started).toFixed(1)}`,
      ...(databaseStarted === undefined ? [] : [`database;dur=${(finished - databaseStarted).toFixed(1)}`]),
      `total;dur=${(finished - started).toFixed(1)}`,
    ].join(", "));
    return response;
  };
  if (!identity.ok) return timed(identity.response);
  let command;
  try { command = playerCommandSchema.parse(await smallJson(request)); }
  catch { return timed(privateJson({ error: "Invalid player request.", code: "invalid-request" }, 400)); }
  const databaseStarted = performance.now();
  try {
    const result = await executePlayerCommand(playerDatabase(getFirestore(identity.app)), identity, command,
      Date.now(), randomInt(0, 1000000) / 1000000);
    return timed(privateJson({ ok: true, ...result }), databaseStarted);
  } catch (error) {
    if (error instanceof PlayerError) return timed(privateJson({ error: error.message, code: error.code }, error.status), databaseStarted);
    return timed(privateJson({ error: "Your reward could not be confirmed. Please retry.", code: "rewards-unavailable" }, 503), databaseStarted);
  }
}
