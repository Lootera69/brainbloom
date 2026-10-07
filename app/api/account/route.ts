import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(request: Request) {
  const bearer = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") ?? "");
  if (!bearer) return privateJson({ ok: false, error: "Sign in required." }, 401);
  const app = getAdminApp();
  if (!app) return privateJson({ ok: false, error: "Account service unavailable." }, 503);
  const auth = getAuth(app);
  let token;
  try {
    token = await auth.verifyIdToken(bearer[1]);
  } catch {
    return privateJson({ ok: false, error: "Sign in again." }, 401);
  }
  const db = getFirestore(app);
  const marker = db.doc(`accountDeletions/${token.uid}`);
  try {
    const previous = await marker.get();
    try {
      await auth.verifyIdToken(bearer[1], true);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found" || !previous.exists) {
        return privateJson({ ok: false, error: "Sign in again." }, 401);
      }
    }
    if (!previous.exists && token.firebase?.sign_in_provider !== 'anonymous' && (!Number.isFinite(token.auth_time) ||
        Date.now() / 1000 - token.auth_time > 300 || token.auth_time > Date.now() / 1000 + 60)) {
      return privateJson({ ok: false, needsReauth: true, error: "Please sign in again to confirm account deletion." }, 401);
    }
    if (previous.data()?.status === "complete") return privateJson({ ok: true });
    await db.runTransaction(async (transaction) => {
      if (!(await transaction.get(marker)).exists) {
        transaction.create(marker, { status: "pending", startedAt: Date.now() });
      }
    });
    await db.recursiveDelete(db.doc(`users/${token.uid}`));
    await db.recursiveDelete(db.doc(`playerProgress/${token.uid}`));
    await db.doc(`staffAccess/${token.uid}`).delete();
    if (token.email && token.email_verified === true) {
      const invitations = await db.collection("staffInvites")
        .where("email", "==", token.email.trim().toLowerCase()).get();
      for (const invitation of invitations.docs) await invitation.ref.delete();
    }
    try {
      await auth.deleteUser(token.uid);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }
    await marker.set({ status: "complete", completedAt: Date.now() });
    return privateJson({ ok: true });
  } catch {
    return privateJson({ ok: false, error: "Account deletion could not finish. Please retry to complete it." }, 503);
  }
}
