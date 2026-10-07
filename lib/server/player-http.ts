import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";

export async function requirePlayer(request: Request) {
  const bearer = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") ?? "");
  if (!bearer) return { ok: false as const, response: privateJson({ error: "Sign in to earn rewards." }, 401) };
  const app = getAdminApp();
  if (!app) return { ok: false as const, response: privateJson({ error: "Rewards are unavailable." }, 503) };
  try {
    const token = await getAuth(app).verifyIdToken(bearer[1], true);
    if (token.firebase?.sign_in_provider === 'password' && token.email_verified !== true) {
      return { ok: false as const, response: privateJson({ error: 'Verify your email to earn rewards.' }, 403) };
    }
    return { ok: true as const, app, uid: token.uid, anonymous: token.firebase?.sign_in_provider === "anonymous" };
  } catch {
    return { ok: false as const, response: privateJson({ error: "Sign in again to continue." }, 401) };
  }
}

export async function smallJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("JSON required");
  if (!request.body) throw new Error("Body required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}
