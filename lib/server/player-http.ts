import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";
import { guestNetwork } from "@/lib/server/player-abuse";

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
    const proof = request.headers.get('x-firebase-appcheck');
    const mode = process.env.PLAYER_APP_CHECK_MODE ?? 'compatible';
    if (!['compatible', 'required'].includes(mode)) {
      return { ok: false as const, response: privateJson({ error: 'Request verification is unavailable.', code: 'verification-unavailable' }, 503) };
    }
    if (!proof && mode === 'required') {
      return { ok: false as const, response: privateJson({ error: 'Update or refresh the app to verify this request.', code: 'app-verification-required' }, 403) };
    }
    let attested = false;
    if (proof) {
      try {
        if (proof.length > 8192 || /\s/.test(proof)) throw new Error();
        await getAppCheck(app).verifyToken(proof);
        attested = true;
      } catch {
        return { ok: false as const, response: privateJson({ error: 'App verification failed. Refresh or reopen the app and retry.', code: 'app-verification-failed' }, 403) };
      }
    }
    const anonymous = token.firebase?.sign_in_provider === 'anonymous';
    try {
      return { ok: true as const, app, uid: token.uid, anonymous, network: anonymous ? guestNetwork(request, attested) : undefined };
    } catch {
      return { ok: false as const, response: privateJson({ error: 'Guest protection is temporarily unavailable. Please retry.', code: 'guest-protection-unavailable' }, 503) };
    }
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
