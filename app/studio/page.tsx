"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, Globe, Lock, Loader2, Calendar, User, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getPuzzles, deletePuzzle, togglePublish, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { useUserStore } from "@/store/user-store";
import { type Puzzle } from "@/types/puzzle";
import { toast } from "sonner";

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function StudioPage() {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Puzzle | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);

  const load = async () => {
    setLoading(true);
    const data = await getPuzzles();
    setPuzzles(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget || confirmText !== deleteTarget.title) return;
    setDeleting(true);
    await deletePuzzle(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    setConfirmText("");
    load();
  };

  const handleTogglePublish = async (id: string) => {
    await togglePublish(id);
    load();
  };

  const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
  const diffLabel = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.label ?? v;
  const completedCount = (puzzle: Puzzle) => completedPuzzleIds.filter((id) => id === puzzle.id).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Puzzles</h1>
          <p className="text-sm text-muted-foreground">
            {puzzles.length} total &middot; {puzzles.filter((p) => p.published).length} published
          </p>
        </div>
        <button
          onClick={() => router.push("/studio/create")}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus className="size-4" />
          New Puzzle
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : puzzles.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-20 text-center">
          <p className="text-sm text-muted-foreground">No puzzles yet.</p>
          <button
            onClick={() => router.push("/studio/create")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Create your first puzzle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {puzzles.map((puzzle, i) => (
            <motion.div
              key={puzzle.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{puzzle.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                    puzzle.published
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {puzzle.published ? "Live" : "Draft"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{catLabel(puzzle.category)}</span>
                  <span>&middot;</span>
                  <span>{diffLabel(puzzle.difficulty)}</span>
                  <span>&middot;</span>
                  <span>{puzzle.type === "true-false" ? "True/False" : "Multiple Choice"}</span>
                  <span>&middot;</span>
                  <span>{puzzle.xpReward} XP</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    Created by {puzzle.createdBy || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {puzzle.createdAt ? fmtDate(puzzle.createdAt) : "—"}
                  </span>
                  {puzzle.updatedAt !== puzzle.createdAt && (
                    <>
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        Modified by {puzzle.lastModifiedBy || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {puzzle.updatedAt ? fmtDate(puzzle.updatedAt) : "—"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleTogglePublish(puzzle.id)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={puzzle.published ? "Unpublish" : "Publish"}
                >
                  {puzzle.published ? <Globe className="size-4" /> : <Lock className="size-4" />}
                </button>
                <button
                  onClick={() => router.push(`/studio/edit/${puzzle.id}`)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Edit"
                >
                  <Edit3 className="size-4" />
                </button>
                <button
                  onClick={() => { setDeleteTarget(puzzle); setConfirmText(""); }}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold">Delete puzzle</h2>
                <button
                  onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="mb-1 text-sm">
                Are you sure you want to delete <span className="font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span>?
              </p>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>

              {completedCount(deleteTarget) > 0 && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Completed by users</p>
                    <p className="text-xs text-muted-foreground">
                      This puzzle has been completed {completedCount(deleteTarget)} time{completedCount(deleteTarget) !== 1 ? "s" : ""}.
                      Consider editing it instead to keep progress intact.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4" onCopy={(e) => e.preventDefault()}>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Type the puzzle title to confirm deletion:
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onPaste={(e) => { e.preventDefault(); toast.error("Pasting is prohibited. Please type manually."); }}
                  onCopy={(e) => { e.preventDefault(); toast.error("Copying is prohibited. Please type manually."); }}
                  onCut={(e) => { e.preventDefault(); toast.error("Cutting is prohibited. Please type manually."); }}
                  placeholder={deleteTarget?.title || "Type the puzzle title"}
                  className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-destructive"
                  autoComplete="off"
                />
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!deleteTarget || confirmText !== deleteTarget.title || deleting}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
