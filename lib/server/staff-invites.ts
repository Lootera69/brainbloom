import { createHash, randomBytes } from "node:crypto";
import { normalizedEmail, type StaffRole } from "@/lib/staff-access";

export function inviteId(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function newInvite(email: string, role: StaffRole, createdBy: string, now = Date.now()) {
  const code = randomBytes(24).toString("base64url");
  return {
    code,
    id: inviteId(code),
    data: { email: normalizedEmail(email), role, enabled: true, createdBy, createdAt: now, expiresAt: now + 7 * 86400000 },
  };
}

export function canRedeemInvite(data: Record<string, unknown> | undefined, email: string, uid: string, now = Date.now()) {
  return uid.length > 0 && data?.enabled === true
    && (data.role === "admin" || data.role === "contributor" || data.role === "reviewer")
    && data.email === normalizedEmail(email)
    && typeof data.expiresAt === "number" && data.expiresAt > now
    && data.redeemedBy === undefined;
}

export function canJoinMembership(member: Record<string, unknown> | undefined, invite: Record<string, unknown> | undefined): boolean {
  if (!member) return true;
  return member.status === "removed" && member.enabled === false
    && typeof member.removedAt === "number" && typeof invite?.createdAt === "number"
    && invite.createdAt > member.removedAt && invite.redeemedBy === undefined;
}
