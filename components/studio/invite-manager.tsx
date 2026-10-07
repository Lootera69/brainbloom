"use client";

import { useEffect, useState } from "react";
import { staffHeaders } from "@/services/staff-session";
import type { StaffRole } from "@/lib/staff-access";
import { MemberManager } from "@/components/studio/member-manager";

interface Invite { id: string; email: string; role: StaffRole; enabled: boolean; expiresAt: number; redeemed: boolean }

async function loadInvites(): Promise<{ invites: Invite[]; now: number }> {
  const response = await fetch("/api/admin/invites", { headers: await staffHeaders(), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return { invites: data.invites, now: Date.now() };
}

export function InviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("contributor");
  const [code, setCode] = useState<{ code: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const data = await loadInvites();
    setInvites(data.invites);
    setNow(data.now);
  }

  useEffect(() => {
    let active = true;
    loadInvites().then((data) => {
      if (active) { setInvites(data.invites); setNow(data.now); }
    }).catch(() => { if (active) setError("Could not load invitations."); });
    return () => { active = false; };
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setCode(null);
    try {
      const response = await fetch("/api/admin/invites", { method: "POST",
        headers: { ...await staffHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCode({ code: data.code, email: data.email });
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the invitation."); }
    finally { setBusy(false); }
  }

  async function cancel(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/invites?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: await staffHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not cancel the invitation."); }
    finally { setBusy(false); }
  }

  return <><MemberManager /><section className="mt-6 space-y-4 rounded-2xl border bg-card/60 p-5">
    <h2 className="font-semibold">Studio invitations</h2>
    <p className="text-sm text-muted-foreground">Invite a specific email address. Each code expires in seven days and is disabled automatically after one use. Existing members sign in with their approved account.</p>
    <form onSubmit={create} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm">Email
        <input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2" />
      </label>
      <label className="text-sm">Role
        <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="mt-1 block rounded-lg border bg-background p-2">
          <option value="contributor">Contributor</option><option value="reviewer">Reviewer</option><option value="admin">Administrator</option>
        </select>
      </label>
      <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Create invitation</button>
    </form>
    <p className="text-xs text-muted-foreground">Contributors create and submit puzzles. Reviewers review submissions without editing or publishing. Administrators manage content, members and invitations.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {code && <div className="rounded-lg border p-3 text-sm"><p>Share this code privately with {code.email}. It is shown only once.</p><code className="mt-2 block break-all select-all">{code.code}</code></div>}
    <ul className="divide-y">{invites.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <div><p className="break-all">{invite.email}</p><p className="text-muted-foreground">{invite.role} · {invite.redeemed ? "Used · Disabled" : !invite.enabled ? "Cancelled" : invite.expiresAt <= now ? "Expired" : "Pending"}</p></div>
      {!invite.redeemed && invite.enabled && <button disabled={busy} onClick={() => cancel(invite.id)} className="rounded-lg border px-3 py-1">Cancel invitation</button>}
    </li>)}</ul>
  </section></>;
}
