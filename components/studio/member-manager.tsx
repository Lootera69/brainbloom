"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Shield, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { memberActions, type StudioMember } from "@/lib/studio-ui-access";
import { changeStudioMember, loadStudioMembers } from "@/services/studio-members";
import { getStudioRole, getStudioSession } from "@/services/puzzle-service";

export function MemberManager() {
  const [members, setMembers] = useState<StudioMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [removeTarget, setRemoveTarget] = useState<StudioMember | null>(null);
  const actorUid = getStudioSession();
  const actorRole = getStudioRole();

  useEffect(() => {
    let active = true;
    loadStudioMembers().then((data) => { if (active) setMembers(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load Studio members."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    if (loading || busy) return;
    setLoading(true); setError("");
    try { setMembers(await loadStudioMembers()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load Studio members."); }
    finally { setLoading(false); }
  }

  async function change(member: StudioMember, action: "freeze" | "unfreeze" | "remove") {
    if (busy || !memberActions(member, actorUid, actorRole).includes(action)) return;
    setBusy(member.uid); setError(""); setNotice("");
    try {
      await changeStudioMember(member.uid, action);
      const status = action === "remove" ? "removed" : action === "freeze" ? "frozen" : "active";
      setMembers((current) => current.map((entry) => entry.uid === member.uid ? { ...entry, status } : entry));
      setNotice(`${member.email}: Studio access ${status === "active" ? "restored" : status}.`);
      if (action === "remove") setRemoveTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update Studio access."); }
    finally { setBusy(null); }
  }

  return <section className="mt-6 space-y-4 rounded-2xl border bg-card/60 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4 text-primary" />Studio members</h2>
      <button type="button" onClick={refresh} disabled={loading || !!busy} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</button>
    </div>
    <p className="text-sm text-muted-foreground">Freeze access temporarily or remove someone from Studio. Their player account and progress are preserved. Removed members need a new invitation to return.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading members…</p> :
      members.length === 0 ? <p className="text-sm text-muted-foreground">No Studio members found.</p> :
      <ul className="divide-y">{members.map((member) => {
        const actions = memberActions(member, actorUid, actorRole);
        return <li key={member.uid} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div className="min-w-0"><p className="break-all font-medium">{member.email || "Email unavailable"}{member.uid === actorUid && <span className="ml-2 text-xs text-muted-foreground">You</span>}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span className="capitalize">{member.role === "admin" ? "Administrator" : member.role}</span><span className={`rounded-full px-2 py-0.5 capitalize ${member.status === "active" ? "bg-success/10 text-success" : member.status === "frozen" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>{member.status}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">{actions.includes("freeze") && <button disabled={!!busy} onClick={() => change(member, "freeze")} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50">Freeze access</button>}
            {actions.includes("unfreeze") && <button disabled={!!busy} onClick={() => change(member, "unfreeze")} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50">Unfreeze access</button>}
            {actions.includes("remove") && <button disabled={!!busy} onClick={() => { setError(""); setRemoveTarget(member); }} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive disabled:opacity-50">Remove from Studio</button>}
            {member.role === "admin" && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Shield className="size-3.5" />Protected administrator</span>}
            {member.status === "removed" && <span className="text-xs text-muted-foreground">New invitation required</span>}
          </div>
        </li>;
      })}</ul>}
    <ConfirmDialog open={!!removeTarget} onClose={() => { if (!busy) setRemoveTarget(null); }} onConfirm={() => { if (removeTarget) void change(removeTarget, "remove"); }}
      title="Remove Studio access?" description={`${removeTarget?.email ?? "This member"} will lose Studio access immediately and need a new invitation to return. Their app account, progress and authored puzzles will be preserved.`}
      confirmLabel="Remove from Studio" loading={!!busy}>
      {error && removeTarget && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </ConfirmDialog>
  </section>;
}
