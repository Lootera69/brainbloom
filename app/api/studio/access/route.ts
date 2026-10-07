import { getFirestore } from "firebase-admin/firestore";
import { privateJson, requireVerifiedUser } from "@/lib/server/staff-auth";
import { canJoinMembership, canRedeemInvite, inviteId } from "@/lib/server/staff-invites";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireVerifiedUser(request);
  if (!user.ok) return user.response;
  let code: unknown;
  try { code = (await request.json())?.code; } catch { return privateJson({ ok: false, error: "Invalid request." }, 400); }
  if (typeof code !== "string" || code.trim().length < 16 || code.length > 256) {
    return privateJson({ ok: false, error: "This invitation is not valid for your account." }, 403);
  }
  const db = getFirestore(user.app);
  const invitation = db.doc(`staffInvites/${inviteId(code)}`);
  const access = db.doc(`staffAccess/${user.uid}`);
  try {
    const accepted = await db.runTransaction(async (tx) => {
      const [invite, member, deletion] = await Promise.all([
        tx.get(invitation), tx.get(access), tx.get(db.doc(`accountDeletions/${user.uid}`)),
      ]);
      const data = invite.data();
      if (deletion.exists || !canRedeemInvite(data, user.email, user.uid)
        || !canJoinMembership(member.data(), data)) return false;
      tx.set(access, { email: user.email, role: data!.role, enabled: true, status: "active", inviteId: invitation.id, createdAt: Date.now() });
      tx.update(invitation, { enabled: false, redeemedBy: user.uid, redeemedAt: Date.now() });
      return true;
    });
    return accepted ? privateJson({ ok: true })
      : privateJson({ ok: false, error: "This invitation is not valid for your account." }, 403);
  } catch {
    return privateJson({ ok: false, error: "Could not verify the invitation. Try again." }, 503);
  }
}
