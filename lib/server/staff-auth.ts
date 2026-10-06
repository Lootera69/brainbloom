import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/push-send";
import { normalizedEmail, staffRole } from "@/lib/staff-access";

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function requireVerifiedUser(request: Request) {
  const bearer = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") ?? "");
  if (!bearer) return { ok: false as const, response: privateJson({ ok: false, error: "Sign in required." }, 401) };
  const app = getAdminApp();
  if (!app) return { ok: false as const, response: privateJson({ ok: false, error: "Authentication unavailable." }, 503) };
  try {
    const token = await getAuth(app).verifyIdToken(bearer[1], true);
    if (token.email_verified !== true || !token.email) {
      return { ok: false as const, response: privateJson({ ok: false, error: "A verified email is required." }, 403) };
    }
    return { ok: true as const, app, uid: token.uid, email: normalizedEmail(token.email) };
  } catch {
    return { ok: false as const, response: privateJson({ ok: false, error: "Sign in again." }, 401) };
  }
}

export async function requireAdmin(request: Request) {
  const user = await requireVerifiedUser(request);
  if (!user.ok) return user;
  try {
    if ((await getFirestore(user.app).doc(`accountDeletions/${user.uid}`).get()).exists) {
      return { ok: false as const, response: privateJson({ ok: false, error: "Account deletion is in progress." }, 403) };
    }
    const access = await getFirestore(user.app).doc(`staffAccess/${user.uid}`).get();
    if (staffRole(access.data()) !== "admin") {
      return { ok: false as const, response: privateJson({ ok: false, error: "Administrator access required." }, 403) };
    }
    return user;
  } catch {
    return { ok: false as const, response: privateJson({ ok: false, error: "Authorization unavailable." }, 503) };
  }
}
