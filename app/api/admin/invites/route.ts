import { getFirestore } from "firebase-admin/firestore";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { newInvite } from "@/lib/server/staff-invites";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const snap = await getFirestore(admin.app).collection("staffInvites").orderBy("createdAt", "desc").limit(100).get();
    return privateJson({ ok: true, invites: snap.docs.map((doc) => {
      const d = doc.data();
      return { id: doc.id, email: d.email, role: d.role, enabled: d.enabled === true, expiresAt: d.expiresAt, redeemed: !!d.redeemedBy };
    }) });
  } catch { return privateJson({ ok: false, error: "Could not load invitations." }, 503); }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  let body;
  try { body = await request.json(); } catch { return privateJson({ ok: false, error: "Invalid request." }, 400); }
  if (body && typeof body === "object" && body.role === undefined) body.role = "contributor";
  if (!body || typeof body.email !== "string" || body.email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    || !["admin", "contributor"].includes(body.role)) {
    return privateJson({ ok: false, error: "Enter an email and a valid role." }, 400);
  }
  try {
    const invite = newInvite(body.email, body.role, admin.uid);
    await getFirestore(admin.app).doc(`staffInvites/${invite.id}`).create(invite.data);
    return privateJson({ ok: true, code: invite.code, email: invite.data.email, expiresAt: invite.data.expiresAt });
  } catch { return privateJson({ ok: false, error: "Could not create the invitation." }, 503); }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return privateJson({ ok: false, error: "Invalid invitation." }, 400);
  try {
    const db = getFirestore(admin.app);
    const invitation = db.doc(`staffInvites/${id}`);
    const disabled = await db.runTransaction(async (tx) => {
      const snap = await tx.get(invitation);
      if (!snap.exists || snap.data()?.redeemedBy) return false;
      tx.update(invitation, { enabled: false });
      return true;
    });
    return disabled ? privateJson({ ok: true }) : privateJson({ ok: false, error: "Only unused invitations can be cancelled." }, 409);
  } catch { return privateJson({ ok: false, error: "Could not cancel the invitation." }, 503); }
}
