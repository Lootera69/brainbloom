import { OAuth2Client } from "google-auth-library";
import { BillingError } from "@/lib/server/store-contract";
import type { BillingConfig } from "@/lib/server/store-config";
import { privateJson } from "@/lib/server/staff-auth";

const pushAuth = new OAuth2Client();

export function billingFailure(error: unknown) {
  if (error instanceof BillingError) {
    const response = privateJson({ ok: false, error: error.message, code: error.code }, error.status);
    if (error.status === 429) response.headers.set("Retry-After", "600");
    return response;
  }
  return privateJson({ ok: false, error: "Purchases are temporarily unavailable. Please retry.", code: "billing-unavailable" }, 503);
}

export async function notificationJson(request: Request): Promise<unknown> {
  if (!request.body || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new BillingError("invalid-notification", "Invalid notification.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); throw new BillingError("invalid-notification", "Notification too large.", 413); }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new BillingError("invalid-notification", "Invalid notification.", 400); }
  } finally { reader.releaseLock(); }
}

export async function authenticatePlayPush(request: Request, config: BillingConfig) {
  const bearer = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") ?? "");
  if (!config.google?.audience || !config.google.pushEmail || !config.google.subscription) throw new BillingError("billing-configuration", "Notifications are unavailable.", 503);
  if (!bearer) throw new BillingError("invalid-notification", "Unauthorized notification.", 401);
  try {
    const ticket = await pushAuth.verifyIdToken({ idToken: bearer[1], audience: config.google.audience });
    const payload = ticket.getPayload();
    if (payload?.email !== config.google.pushEmail || payload.email_verified !== true) throw new Error();
  } catch { throw new BillingError("invalid-notification", "Unauthorized notification.", 401); }
}
