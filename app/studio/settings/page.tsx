"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Key, Lock, Eye, EyeOff, Shield, PenTool, BookOpen, Edit3, Layers, Users, GripVertical, AlertTriangle } from "lucide-react";
import { getInviteCodes, addInviteCode, removeInviteCode, type InviteCodeEntry } from "@/services/studio-settings";
import { getStudioSession, getStudioRole, CATEGORIES } from "@/services/puzzle-service";
import { getAllLessonGroups, addLessonGroup, removeLessonGroup, updateLessonGroup, type LessonGroupEntry } from "@/services/lesson-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonLessonGroup } from "@/components/ui/skeleton";

type SettingsTab = "lessons" | "invites";

const TABS: { id: SettingsTab; label: string; icon: typeof Layers; adminOnly?: boolean }[] = [
  { id: "lessons", label: "Lesson Hierarchy", icon: Layers },
  { id: "invites", label: "Invite Codes", icon: Key, adminOnly: true },
];

export default function StudioSettingsPage() {
  const router = useRouter();
  const role = getStudioRole();
  const isAdmin = role === "admin";
  const [activeTab, setActiveTab] = useState<SettingsTab>("lessons");

  // Invite codes state
  const [codes, setCodes] = useState<InviteCodeEntry[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "contributor">("contributor");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const currentCode = getStudioSession();
  const [codesLoading, setCodesLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<InviteCodeEntry | null>(null);

  // Lesson groups state
  const [groups, setGroups] = useState<LessonGroupEntry[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
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
    getAllLessonGroups().then((g) => { setGroups(g); setGroupsLoading(false); });
  }, []);

  // Auto-switch tab if admin-only tab is inaccessible
  useEffect(() => {
    if (activeTab === "invites" && !isAdmin) {
      setActiveTab("lessons");
    }
  }, [activeTab, isAdmin]);

  const refreshGroups = async () => {
    const g = await getAllLessonGroups();
    setGroups(g);
  };

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
    setDeleteTarget(null);
    await refreshCodes();
  };

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

  const availableTabs = TABS.filter((t) => !t.adminOnly || (t.adminOnly && isAdmin));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <button
        onClick={() => router.push("/studio")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to puzzles
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Studio Settings</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Manage invite codes and lesson hierarchy." : "Manage lesson hierarchy."}
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-1 rounded-xl bg-muted/50 p-1">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Lesson Hierarchy Tab */}
        {activeTab === "lessons" && (
          <motion.div
            key="lessons"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-6 space-y-5"
          >
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Layers className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Lesson Groups</h2>
                  <p className="text-xs text-muted-foreground">
                    Define lesson groups per category. These appear as picklists when creating puzzles.
                  </p>
                </div>
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setSelectedCat(c.value); setEditingGroup(null); }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedCat === c.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Existing groups */}
            {groupsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <SkeletonLessonGroup key={i} />)}
              </div>
            ) : catGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center">
                <Layers className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No lesson groups for <span className="font-semibold text-foreground">{selectedCat}</span> yet.
                </p>
                <p className="text-xs text-muted-foreground/60">Add one using the form below.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {catGroups.map((g, gi) => (
                  <motion.div
                    key={g.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.03 }}
                    className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/20"
                  >
                    <GripVertical className="size-3.5 shrink-0 text-muted-foreground/30" />
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                      <BookOpen className="size-4 text-primary" />
                    </div>

                    {editingGroup?.category === selectedCat && editingGroup?.name === g.name ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                          placeholder="Group name"
                        />
                        <input
                          value={editOrder}
                          onChange={(e) => setEditOrder(e.target.value)}
                          type="number"
                          min={1}
                          max={999}
                          className="w-16 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                          placeholder="#"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => handleEditGroup(g.name)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110">
                            Save
                          </button>
                          <button onClick={() => setEditingGroup(null)}
                            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{g.name}</span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          #{g.order}
                        </span>
                        <button
                          onClick={() => { setEditingGroup({ category: selectedCat, name: g.name }); setEditName(g.name); setEditOrder(String(g.order)); }}
                          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-muted group-hover:opacity-100"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveGroup(g.name)}
                          className="flex size-7 items-center justify-center rounded-lg text-destructive/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Add new group */}
            <GlassCard className="p-5" intensity="light">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Plus className="size-4 text-primary" />
                Add Lesson Group
              </h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 text-xs font-medium text-muted-foreground">Group name</label>
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Counting"
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 text-xs font-medium text-muted-foreground">Order</label>
                  <input
                    value={newGroupOrder}
                    onChange={(e) => setNewGroupOrder(e.target.value)}
                    type="number"
                    min={1}
                    max={999}
                    placeholder="1"
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleAddGroup}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Plus className="size-4" />
                  Add
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Invite Codes Tab */}
        {activeTab === "invites" && isAdmin && (
          <motion.div
            key="invites"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-6 space-y-5"
          >
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Invite Codes ({codes.length})</h2>
                  <p className="text-xs text-muted-foreground">
                    Manage who can access the Puzzle Studio.
                  </p>
                </div>
              </div>

              {codesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : codes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-10 text-center">
                  <Key className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No invite codes yet.</p>
                  <p className="text-xs text-muted-foreground/60">Add one below to grant studio access.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {codes.map((entry, i) => (
                    <motion.div
                      key={entry.code}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/20"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                        <Key className="size-4 text-primary" />
                      </div>
                      <span className="font-mono text-sm font-medium">{entry.code}</span>
                      <span className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        entry.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}>
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
                          onClick={() => setDeleteTarget(entry)}
                          disabled={entry.role === "admin"}
                          className="flex size-7 items-center justify-center rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                          title={entry.role === "admin" ? "Cannot delete admin credentials" : "Delete"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5" intensity="light">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Plus className="size-4 text-primary" />
                Add New Invite Code
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 text-xs font-medium text-muted-foreground">Invite code</label>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. delta-2026"
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 text-xs font-medium text-muted-foreground">Password</label>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. bloom@000"
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 text-xs font-medium text-muted-foreground">Role</label>
                  <div className="flex gap-2">
                    {(["contributor", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setNewRole(r)}
                        className={cn(
                          "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                          newRole === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        {r === "admin" ? <Shield className="mr-1 inline size-3" /> : <PenTool className="mr-1 inline size-3" />}
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddCode}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Plus className="size-4" />
                  Add Code
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete invite code confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleRemoveCode(deleteTarget!.code)}
        title="Delete Invite Code"
        description={`Are you sure you want to delete the invite code "${deleteTarget?.code}"? Users with this code will no longer be able to access the studio.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </main>
  );
}
