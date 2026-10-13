import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";
import { DiscoverError } from "@/lib/server/discover-content";

export function discoverPublicDatabase() {
  const app = getAdminApp();
  if (app) return getFirestore(app);
  // Missing production credentials must not masquerade as an empty catalogue.
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new DiscoverError("Discover is temporarily unavailable. Please try again.", 503);
  }
  return null;
}

export function discoverFailure(error: unknown) {
  if (error instanceof DiscoverError) return privateJson({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return privateJson({ error: error.issues[0]?.message ?? "Check the lesson content.", issues: error.issues.map(({ path, message }) => ({ path, message })) }, 400);
  return privateJson({ error: "Discover is temporarily unavailable. Please try again." }, 503);
}

export async function discoverJson(request: Request): Promise<unknown> {
  if (!request.body || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new DiscoverError("Send the lesson as JSON.", 400);
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 262144) {
        await reader.cancel();
        throw new DiscoverError("This lesson is too large. Use image URLs instead of embedded images.", 413);
      }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new DiscoverError("The lesson JSON is invalid.", 400); }
  } finally { reader.releaseLock(); }
}
