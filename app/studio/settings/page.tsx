"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Key, Lock, Eye, EyeOff, Shield, PenTool, BookOpen, Edit3 } from "lucide-react";
import { getInviteCodes, addInviteCode, removeInviteCode, type InviteCodeEntry } from "@/services/studio-settings";
import { getStudioSession, getStudioRole, CATEGORIES } from "@/services/puzzle-service";
import { getAllLessonGroups, addLessonGroup, removeLessonGroup, updateLessonGroup, type LessonGroupEntry } from "@/services/lesson-service";
import { toast } from "sonner";

export default function StudioSettingsPage() {
  const router = useRouter();
  const role = getStudioRole();
  const isAdmin = role === "admin";

  // Invite codes state
  const [codes, setCodes] = useState<InviteCodeEntry[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "contributor">("contributor");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const currentCode = getStudioSession();
  const [codesLoading, setCodesLoading] = useState(true);

  // Lesson groups state
  const [groups, setGroups] = useState<LessonGroupEntry[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(CATEGORIES[0]?.value ?? "");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupOrder, setNewGroupOrder] = useState("");
  const [editingGroup, setEditingGroup] = useState<{ category: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("");

  useEffect(() => {
    if (isAdmin) {
      getInviteCodes().then((c) => {
        setCodes(c);
        setCodesLoading(false);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    getAllLessonGroups().then(setGroups);
  }, []);

  const refreshGroups = async () => {
    const g = await getAllLessonGroups();
    setGroups(g);
  };

  // Invite codes handlers
  const refreshCodes = async () => {
    const c = await getInviteCodes();
    setCodes(c);
  };

  const handleAddCode = async () => {
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
    await refreshCodes();
  };

  const handleRemoveCode = async (code: string) => {
    await removeInviteCode(code);
    toast.success("Invite code removed.");
    await refreshCodes();
  };

  // Lesson group handlers
  const catGroups = groups.filter((g) => g.category === selectedCat).sort((a, b) => a.order - b.order);

  const handleAddGroup = async () => {
    if (!newGroupName.trim() || !newGroupOrder.trim()) {
      toast.error("Fill in group name and order.");
      return;
    }
    const order = parseInt(newGroupOrder, 10);
    if (isNaN(order) || order < 1) {
      toast.error("Order must be a positive number.");
      return;
    }
    const ok = await addLessonGroup(selectedCat, newGroupName.trim(), order, getStudioSession() ?? undefined);
    if (!ok) {
      toast.error("A group with that name already exists in this category.");
      return;
    }
    toast.success("Lesson group added.");
    setNewGroupName("");
    setNewGroupOrder("");
    await refreshGroups();
  };

  const handleRemoveGroup = async (name: string) => {
    await removeLessonGroup(selectedCat, name);
    toast.success("Lesson group removed.");
    await refreshGroups();
  };

  const handleEditGroup = async (oldName: string) => {
    if (!editName.trim() || !editOrder.trim()) {
      toast.error("Fill in name and order.");
      return;
    }
    const order = parseInt(editOrder, 10);
    if (isNaN(order) || order < 1) {
      toast.error("Order must be a positive number.");
      return;
    }
    await updateLessonGroup(selectedCat, oldName, editName.trim(), order);
    toast.success("Lesson group updated.");
    setEditingGroup(null);
    setEditName("");
    setEditOrder("");
    await refreshGroups();
  };

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
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Manage invite codes and lesson hierarchy." : "Manage lesson hierarchy."}
        </p>
      </motion.div>

      {/* Lesson Hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 space-y-3"
      >
        <h2 className="text-sm font-semibold">Lesson Hierarchy</h2>
        <p className="text-xs text-muted-foreground">
          Define lesson groups per category. These will appear as picklists when creating puzzles.
        </p>

        {/* Category selector */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => { setSelectedCat(c.value); setEditingGroup(null); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCat === c.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Existing groups for selected category */}
        {catGroups.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No lesson groups for this category yet.
          </p>
        ) : (
          <div className="space-y-2">
            {catGroups.map((g) => (
              <div key={g.name} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                {editingGroup?.category === selectedCat && editingGroup?.name === g.name ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                      placeholder="Group name"
                    />
                    <input
                      value={editOrder}
                      onChange={(e) => setEditOrder(e.target.value)}
                      type="number"
                      min={1}
                      max={999}
                      className="w-20 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                      placeholder="Order"
                    />
                    <button onClick={() => handleEditGroup(g.name)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:brightness-110">
                      Save
                    </button>
                    <button onClick={() => setEditingGroup(null)}
                      className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">Order {g.order}</span>
                    <button
                      onClick={() => { setEditingGroup({ category: selectedCat, name: g.name }); setEditName(g.name); setEditOrder(String(g.order)); }}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveGroup(g.name)}
                      className="flex size-7 items-center justify-center rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new group */}
        <div className="mt-4 rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Add Lesson Group</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 text-xs font-medium text-muted-foreground">Group name</label>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Counting"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div className="w-24">
              <label className="mb-1 text-xs font-medium text-muted-foreground">Order</label>
              <input value={newGroupOrder} onChange={(e) => setNewGroupOrder(e.target.value)}
                type="number" min={1} max={999}
                placeholder="1"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <button onClick={handleAddGroup}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
              <Plus className="size-4" />
              Add
            </button>
          </div>
        </div>
      </motion.div>

      {/* Invite Codes — admin only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 space-y-3"
        >
          <h2 className="text-sm font-semibold">Invite Codes ({codes.length})</h2>

          {codesLoading ? (
            <p className="text-center text-sm text-muted-foreground">Loading...</p>
          ) : codes.length === 0 ? (
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
                    onClick={() => handleRemoveCode(entry.code)}
                    disabled={entry.role === "admin"}
                    className="flex size-7 items-center justify-center rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                    title={entry.role === "admin" ? "Cannot delete admin credentials" : "Delete"}
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
              <button onClick={handleAddCode}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
                <Plus className="size-4" />
                Add Code
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}
