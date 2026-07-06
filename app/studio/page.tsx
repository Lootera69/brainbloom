"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, Play, Globe, Lock, Loader2, Calendar, User, AlertTriangle, X, Settings, CheckCircle2, XCircle, MessageSquare, Send, Filter, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { getPuzzles, deletePuzzle, togglePublish, updatePuzzleReview, isAdmin, getStudioSession, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { getTodayDailyPuzzleId, setDailyPuzzle } from "@/services/daily-puzzle";
import { type Puzzle, type ReviewStatus } from "@/types/puzzle";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { toast } from "sonner";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  "needs-discussion": "Discuss",
};

const STATUS_COLORS: Record<ReviewStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  "needs-discussion": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "needs-discussion", label: "Discuss" },
] as const;

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
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [testPuzzle, setTestPuzzle] = useState<Puzzle | null>(null);
  const [publishTarget, setPublishTarget] = useState<Puzzle | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [filterTab, setFilterTab] = useState<string>("all");
  const [dailyPuzzleId, setDailyPuzzleId] = useState<string | null>(null);
  const [settingDaily, setSettingDaily] = useState(false);
  const admin = isAdmin();

  const load = async () => {
    setLoading(true);
    const [data, dailyId] = await Promise.all([getPuzzles(), getTodayDailyPuzzleId()]);
    setPuzzles(data);
    setDailyPuzzleId(dailyId);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (deleteTarget) {
      setDeleteCountdown(5);
      deleteIntervalRef.current = setInterval(() => {
        setDeleteCountdown((prev) => {
          if (prev <= 1) {
            if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
      setDeleteCountdown(5);
    }
    return () => {
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
    };
  }, [deleteTarget]);

  const filtered = puzzles.filter((p) => {
    if (filterTab === "all") return true;
    return p.reviewStatus === filterTab;
  });

  const handleSetDaily = async (puzzleId: string) => {
    setSettingDaily(true);
    const success = await setDailyPuzzle(puzzleId, getStudioSession() ?? undefined);
    if (success) {
      setDailyPuzzleId(puzzleId);
      toast.success("Set as today's daily puzzle!");
    } else {
      toast.error("Puzzle must be published to set as daily.");
    }
    setSettingDaily(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || confirmText !== deleteTarget.title) return;
    setDeleting(true);
    await deletePuzzle(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    setConfirmText("");
    load();
  };

  const handleTogglePublish = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    await togglePublish(publishTarget.id);
    setPublishing(false);
    setPublishTarget(null);
    load();
  };

  const handleQuickReview = async (id: string, status: ReviewStatus) => {
    await updatePuzzleReview(id, status);
    toast.success(`Marked as "${STATUS_LABELS[status]}".`);
    load();
  };

  const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
  const diffLabel = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.label ?? v;

  const pendingCount = puzzles.filter((p) => p.reviewStatus === "pending").length;
  const discussCount = puzzles.filter((p) => p.reviewStatus === "needs-discussion").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Puzzles</h1>
          <p className="text-sm text-muted-foreground">
            {puzzles.length} total &middot; {puzzles.filter((p) => p.published).length} published
            {pendingCount > 0 && <span className="text-amber-600 dark:text-amber-400"> &middot; {pendingCount} pending</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {admin && (
            <button onClick={() => router.push("/studio/settings")}
              className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]">
              <Settings className="size-4" />
            </button>
          )}
          <button onClick={() => router.push("/studio/create")}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
            <Plus className="size-4" />
            New Puzzle
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button key={tab.value} onClick={() => setFilterTab(tab.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterTab === tab.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}>
            {tab.label}
            {tab.value === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-600 dark:text-amber-400">{pendingCount}</span>
            )}
            {tab.value === "needs-discussion" && discussCount > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-500/20 px-1.5 text-[10px] text-blue-600 dark:text-blue-400">{discussCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-20 text-center">
          <p className="text-sm text-muted-foreground">
            {puzzles.length === 0 ? "No puzzles yet." : "No puzzles match this filter."}
          </p>
          {puzzles.length === 0 && (
            <button onClick={() => router.push("/studio/create")}
              className="mt-3 text-sm font-medium text-primary hover:underline">
              Create your first puzzle
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((puzzle, i) => (
            <motion.div key={puzzle.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{puzzle.title}</h3>
                  {dailyPuzzleId === puzzle.id && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-500 flex items-center gap-1">
                      <Sparkles className="size-3" />
                      Daily
                    </span>
                  )}
                  {puzzle.published ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">Live</span>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[puzzle.reviewStatus ?? "draft"]}`}>
                      {STATUS_LABELS[puzzle.reviewStatus ?? "draft"]}
                    </span>
                  )}
                  {!puzzle.published && puzzle.reviewNote && (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground" title={puzzle.reviewNote}>
                      <MessageSquare className="size-3" />
                      Note
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{catLabel(puzzle.category)}</span>
                  <span>&middot;</span>
                  <span>{diffLabel(puzzle.difficulty)}</span>
                  <span>&middot;</span>
                  <span>{puzzle.type === "true-false" ? "True/False" : puzzle.type === "crossword" ? `Crossword (${puzzle.crosswordData?.size}×${puzzle.crosswordData?.size})` : puzzle.type === "type-answer" ? "Type Answer" : "Multiple Choice"}</span>
                  <span>&middot;</span>
                  <span>{puzzle.xpReward} XP</span>
                  {(puzzle.completedBy ?? 0) > 0 && (
                    <>
                      <span>&middot;</span>
                      <span className="text-success">{puzzle.completedBy} completed</span>
                    </>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
                  <span className="flex items-center gap-1"><User className="size-3" />{puzzle.createdBy || "—"}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{puzzle.createdAt ? fmtDate(puzzle.createdAt) : "—"}</span>
                  {!puzzle.published && puzzle.reviewedBy && (
                    <span className="flex items-center gap-1"><MessageSquare className="size-3" />Reviewed by {puzzle.reviewedBy}</span>
                  )}
                </div>
                {!puzzle.published && puzzle.reviewNote && (
                  <p className="mt-1 text-[11px] italic text-muted-foreground/60">&ldquo;{puzzle.reviewNote}&rdquo;</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button onClick={() => setTestPuzzle(puzzle)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Test">
                  <Play className="size-4" />
                </button>
                <button onClick={() => router.push(`/studio/edit/${puzzle.id}`)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Edit">
                  <Edit3 className="size-4" />
                </button>
                <button onClick={() => { setDeleteTarget(puzzle); setConfirmText(""); }}
                  disabled={!admin && puzzle.published}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                  title={!admin && puzzle.published ? "Cannot delete live puzzles" : "Delete"}>
                  <Trash2 className="size-4" />
                </button>

                {!puzzle.published && admin && puzzle.reviewStatus === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => handleQuickReview(puzzle.id, "approved")}
                      className="flex size-8 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10" title="Approve">
                      <CheckCircle2 className="size-4" />
                    </button>
                    <button onClick={() => handleQuickReview(puzzle.id, "rejected")}
                      className="flex size-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10" title="Reject">
                      <XCircle className="size-4" />
                    </button>
                  </div>
                )}

                {!puzzle.published && !admin && (puzzle.reviewStatus === "draft" || puzzle.reviewStatus === "rejected" || puzzle.reviewStatus === "needs-discussion") && (
                  <button onClick={async () => { await updatePuzzleReview(puzzle.id, "pending"); toast.success("Submitted for approval."); load(); }}
                    className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all active:scale-[0.98] bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400">
                    <Send className="size-3.5" />
                    Submit
                  </button>
                )}

                {(puzzle.published || puzzle.reviewStatus === "approved") && admin && (
                  <button onClick={() => setPublishTarget(puzzle)}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all active:scale-[0.98] ${
                      puzzle.published
                        ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "bg-success/10 text-success hover:bg-success/20"
                    }`}>
                    {puzzle.published ? <Lock className="size-3.5" /> : <Globe className="size-3.5" />}
                    {puzzle.published ? "Unpublish" : "Go Live"}
                  </button>
                )}
                {admin && puzzle.published && (
                  <button onClick={() => handleSetDaily(puzzle.id)} disabled={settingDaily}
                    title="Set as today's daily puzzle"
                    className={`flex size-8 items-center justify-center rounded-lg transition-all disabled:opacity-40 ${
                      dailyPuzzleId === puzzle.id
                        ? "bg-amber-500/15 text-amber-500"
                        : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"
                    }`}>
                    <Sparkles className="size-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Publish confirmation dialog */}
      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => { setPublishTarget(null); setPublishing(false); }}
        onConfirm={handleTogglePublish}
        title={publishTarget?.published ? "Unpublish Puzzle" : "Go Live"}
        description={
          publishTarget?.published
            ? "This puzzle will be hidden from players. Are you sure you want to unpublish?"
            : "This puzzle will be visible to all players immediately. Please make sure everything is correct before proceeding."
        }
        confirmLabel={publishTarget?.published ? "Unpublish" : "Go Live"}
        confirmVariant={publishTarget?.published ? "danger" : "success"}
        loading={publishing}
      />

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => { setDeleteTarget(null); setConfirmText(""); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold">Delete puzzle</h2>
                <button onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
              </div>
              <p className="mb-1 text-sm">Delete <span className="font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span>?</p>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              {(deleteTarget.completedBy ?? 0) > 0 && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Completed by users</p>
                    <p className="text-xs text-muted-foreground">Completed {(deleteTarget.completedBy ?? 0)} time{(deleteTarget.completedBy ?? 0) !== 1 ? "s" : ""}.</p>
                  </div>
                </div>
              )}
              <div className="mt-4" onCopy={(e) => e.preventDefault()}>
                <p className="mb-1.5 text-xs text-muted-foreground">Type the puzzle title to confirm:</p>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                  onPaste={(e) => { e.preventDefault(); toast.error("Please type manually."); }}
                  onCopy={(e) => { e.preventDefault(); toast.error("Please type manually."); }}
                  onCut={(e) => { e.preventDefault(); toast.error("Please type manually."); }}
                  placeholder={deleteTarget?.title || "Type the puzzle title"}
                  className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-destructive" autoComplete="off" />
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted">Cancel</button>
                <button onClick={handleDelete} disabled={!deleteTarget || confirmText !== deleteTarget.title || deleting || deleteCountdown > 0}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40">
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  {deleteCountdown > 0 ? `Delete (${deleteCountdown}s)` : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test modal */}
      <AnimatePresence>
        {testPuzzle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setTestPuzzle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
              <button onClick={() => setTestPuzzle(null)}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
              <PuzzlePlay puzzle={testPuzzle} onComplete={() => setTestPuzzle(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
