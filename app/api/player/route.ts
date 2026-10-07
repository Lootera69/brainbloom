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
  const identity = await requirePlayer(request);
  if (!identity.ok) return identity.response;
  let command;
  try { command = playerCommandSchema.parse(await smallJson(request)); }
  catch { return privateJson({ error: "Invalid player request.", code: "invalid-request" }, 400); }
  try {
    const result = await executePlayerCommand(playerDatabase(getFirestore(identity.app)), identity, command,
      Date.now(), randomInt(0, 1000000) / 1000000);
    return privateJson({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PlayerError) return privateJson({ error: error.message, code: error.code }, error.status);
    return privateJson({ error: "Your reward could not be confirmed. Please retry.", code: "rewards-unavailable" }, 503);
  }
}
