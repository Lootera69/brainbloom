"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Key, Lock, Eye, EyeOff } from "lucide-react";
import { getInviteCodes, addInviteCode, removeInviteCode } from "@/services/studio-settings";
import { toast } from "sonner";

export default function StudioSettingsPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [newCode, setNewCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCodes(getInviteCodes());
  }, []);

  const refresh = () => setCodes({ ...getInviteCodes() });

  const handleAdd = () => {
    if (!newCode.trim() || !newPassword.trim()) {
      toast.error("Fill in both code and password.");
      return;
    }
    const ok = addInviteCode(newCode.trim(), newPassword.trim());
    if (!ok) {
      toast.error("That invite code already exists.");
      return;
    }
    toast.success("Invite code added.");
    setNewCode("");
    setNewPassword("");
    refresh();
  };

  const handleRemove = (code: string) => {
    removeInviteCode(code);
    toast.success("Invite code removed.");
    refresh();
  };

  const entries = Object.entries(codes);

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
        <p className="text-sm text-muted-foreground">Manage invite codes and passwords.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 space-y-3"
      >
        <h2 className="text-sm font-semibold">Invite Codes ({entries.length})</h2>

        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No invite codes yet.</p>
        ) : (
          entries.map(([code, password]) => (
            <div key={code} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <Key className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 font-mono text-sm font-medium">{code}</span>
              <button
                onClick={() => setRevealed((r) => ({ ...r, [code]: !r[code] }))}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                {revealed[code] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <span className="font-mono text-xs text-muted-foreground">
                {revealed[code] ? password : "••••••••"}
              </span>
              <button
                onClick={() => handleRemove(code)}
                className="flex size-7 items-center justify-center rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}

        <div className="mt-6 flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New invite code</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g. delta-2026"
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="e.g. bloom@000"
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex h-[42px] items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>
      </motion.div>
    </main>
  );
}
