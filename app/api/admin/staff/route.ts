import { getFirestore } from "firebase-admin/firestore";
import { privateJson, requireAdmin } from "@/lib/server/staff-auth";
import { staffRole } from "@/lib/staff-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const snapshot = await getFirestore(admin.app).collection("staffAccess").orderBy("createdAt", "desc").limit(200).get();
    const members = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { uid: doc.id, email: data.email, role: data.role,
        status: data.status === "removed" ? "removed" : staffRole(data) ? "active" : "frozen",
        createdAt: data.createdAt };
    });
    return privateJson({ ok: true, members });
  } catch { return privateJson({ ok: false, error: "Could not load Studio members." }, 503); }
}

async function changeMembership(request: Request, uid: unknown, action: string) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  if (typeof uid !== "string" || !uid || uid.length > 128 || /[\/\x00-\x1f]/.test(uid)
    || !["freeze", "unfreeze", "remove"].includes(action)) {
    return privateJson({ ok: false, error: "Choose a valid member and action." }, 400);
  }
  if (uid === admin.uid) return privateJson({ ok: false, error: "You cannot change your own Studio access." }, 403);
  try {
    const db = getFirestore(admin.app);
    const target = db.doc(`staffAccess/${uid}`);
    const result = await db.runTransaction(async (transaction) => {
      const [actor, member, deletion, actorDeletion] = await Promise.all([
        transaction.get(db.doc(`staffAccess/${admin.uid}`)), transaction.get(target),
        transaction.get(db.doc(`accountDeletions/${uid}`)),
        transaction.get(db.doc(`accountDeletions/${admin.uid}`)),
      ]);
      if (actorDeletion.exists || staffRole(actor.data()) !== "admin") return { status: 403, error: "Administrator access required." };
      const data = member.data();
      if (!member.exists) return { status: 404, error: "Studio member not found." };
      if (!data || !["contributor", "reviewer"].includes(data.role)) {
        return { status: 403, error: "Administrator accounts cannot be changed here." };
      }
      if (deletion.exists) return { status: 409, error: "Account deletion is already in progress." };
      if (data.status === "removed") {
        return action === "remove" ? { status: 200 } : { status: 409, error: "Removed members need a new invitation." };
      }
      const now = Date.now();
      transaction.update(target, action === "remove"
        ? { enabled: false, status: "removed", removedAt: now, updatedAt: now, updatedBy: admin.uid }
        : { enabled: action === "unfreeze", status: action === "unfreeze" ? "active" : "frozen", updatedAt: now, updatedBy: admin.uid });
      return { status: 200 };
    });
    return result.status === 200 ? privateJson({ ok: true }) : privateJson({ ok: false, error: result.error }, result.status);
  } catch { return privateJson({ ok: false, error: "Could not update Studio access. Please retry." }, 503); }
}

export async function PATCH(request: Request) {
  let body;
  try { body = await request.json(); } catch { return privateJson({ ok: false, error: "Invalid request." }, 400); }
  return changeMembership(request, body?.uid, body?.action);
}

export async function DELETE(request: Request) {
  return changeMembership(request, new URL(request.url).searchParams.get("uid"), "remove");
}
