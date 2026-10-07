import type { StaffRole } from "@/lib/staff-access";

export interface StudioMember {
  uid: string;
  email: string;
  role: StaffRole;
  status: "active" | "frozen" | "removed";
  createdAt: number;
}

export function canVisitStudioPath(role: StaffRole | null, pathname: string): boolean {
  if (!role) return false;
  if (role === "reviewer") return pathname === "/studio" || pathname === "/studio/review";
  if (pathname === "/studio/review" || pathname.startsWith("/studio/review/")) return role === "admin";
  const adminPaths = ["/studio/users", "/studio/ciphers", "/studio/seed"];
  if (adminPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return role === "admin";
  return true;
}

export function memberActions(member: StudioMember, actorUid: string | null, actorRole: string | null): ("freeze" | "unfreeze" | "remove")[] {
  if (actorRole !== "admin" || !actorUid || member.uid === actorUid || member.role === "admin" || member.status === "removed") return [];
  return [member.status === "frozen" ? "unfreeze" : "freeze", "remove"];
}
