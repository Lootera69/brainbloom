"use client";

import { staffHeaders } from "@/services/staff-session";
import type { StudioMember } from "@/lib/studio-ui-access";

export async function loadStudioMembers(): Promise<StudioMember[]> {
  const response = await fetch("/api/admin/staff", { headers: await staffHeaders(), cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not load Studio members.");
  return data.members;
}

export async function changeStudioMember(uid: string, action: "freeze" | "unfreeze" | "remove"): Promise<void> {
  const headers = await staffHeaders();
  const response = action === "remove"
    ? await fetch(`/api/admin/staff?uid=${encodeURIComponent(uid)}`, { method: "DELETE", headers })
    : await fetch("/api/admin/staff", { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ uid, action }) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not update Studio access.");
}
