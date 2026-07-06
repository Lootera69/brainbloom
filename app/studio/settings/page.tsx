"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Key, Lock, Eye, EyeOff, Shield, PenTool } from "lucide-react";
import { getInviteCodes, addInviteCode, removeInviteCode, type InviteCodeEntry } from "@/services/studio-settings";
import { getStudioSession } from "@/services/puzzle-service";
import { toast } from "sonner";

export default function StudioSettingsPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<InviteCodeEntry[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "contributor">("contributor");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInviteCodes().then((c) => {
      setCodes(c);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const c = await getInviteCodes();
    setCodes(c);
  };

  const handleAdd = async () => {
    if (!newCode.trim() || !newPassword.trim()) {
      toast.error("Fill in both code and password.");
      return;
    }
    const ok = await addInviteCode(newCode.trim(), newPassword.trim(), newRole, getStudioSession() ?? undefined);
    if (!ok) {
      toast.error("That invite code already exists.");
      return;
    }
    toast.success("Invite code added.");
    setNewCode("");
    setNewPassword("");
    setNewRole("contributor");
    await refresh();
  };

  const handleRemove = async (code: string) => {
    await removeInviteCode(code);
    toast.success("Invite code removed.");
    await refresh();
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-center text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={() => router.push("/studio")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to puzzles
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage invite codes and roles.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 space-y-3"
      >
        <h2 className="text-sm font-semibold">Invite Codes ({codes.length})</h2>

        {codes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No invite codes yet.</p>
        ) : (
          codes.map((entry) => (
            <div key={entry.code} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <Key className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{entry.code}</span>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                entry.role === "admin"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {entry.role === "admin" ? <Shield className="size-3" /> : <PenTool className="size-3" />}
                {entry.role}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => setRevealed((r) => ({ ...r, [entry.code]: !r[entry.code] }))}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  {revealed[entry.code] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <span className="font-mono text-xs text-muted-foreground">
                  {revealed[entry.code] ? entry.password : "••••••••"}
                </span>
                <button
                  onClick={() => handleRemove(entry.code)}
                  className="flex size-7 items-center justify-center rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        <div className="mt-6 rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Add New Invite Code</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 text-xs font-medium text-muted-foreground">Invite code</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. delta-2026"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 text-xs font-medium text-muted-foreground">Password</label>
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="e.g. bloom@000"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 text-xs font-medium text-muted-foreground">Role</label>
              <div className="flex gap-2">
                {(["contributor", "admin"] as const).map((r) => (
                  <button key={r} onClick={() => setNewRole(r)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      newRole === r
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}>
                    {r === "admin" ? <Shield className="mr-1 inline size-3" /> : <PenTool className="mr-1 inline size-3" />}
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAdd}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
              <Plus className="size-4" />
              Add Code
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
