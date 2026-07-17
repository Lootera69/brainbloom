"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, Play, Globe, Lock, Loader2, Calendar, User, AlertTriangle, X, Settings, CheckCircle2, XCircle, MessageSquare, Send, Filter, Sparkles, BarChart3, Search, ChevronDown, ArrowUpDown, Database } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { getPuzzles, deletePuzzle, togglePublish, updatePuzzleReview, isAdmin, getStudioSession, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { type Puzzle, type ReviewStatus, type PuzzleType } from "@/types/puzzle";
import { EmptyState } from "@/components/ui/empty-state";
import { getTodayDailyPuzzleId, setDailyPuzzle } from "@/services/daily-puzzle";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { toast } from "sonner";
import { SkeletonPuzzleList, SkeletonFilterBar } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { ErrorFallback } from "@/components/error-fallback";

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

const STATUS_ACCENTS: Record<string, string> = {
  draft: "bg-muted-foreground/30",
  pending: "bg-amber-500",
  approved: "bg-success",
  rejected: "bg-destructive",
  "needs-discussion": "bg-blue-500",
  live: "bg-emerald-500",
};

const STATUS_DOTS: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  pending: "bg-amber-500",
  approved: "bg-success",
  rejected: "bg-destructive",
  "needs-discussion": "bg-blue-500",
  live: "bg-emerald-500",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [dailyPuzzleId, setDailyPuzzleId] = useState<string | null>(null);
  const [settingDaily, setSettingDaily] = useState(false);
  const admin = isAdmin();
  const { timedOut: loadTimedOut, reset: resetLoadTimeout } = useLoadingTimeout(6000);

  const load = async () => {
    setLoading(true);
    resetLoadTimeout();
    const [data, dailyId] = await Promise.all([getPuzzles(), getTodayDailyPuzzleId()]);
    setPuzzles(data);
    setDailyPuzzleId(dailyId);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filtered = puzzles
    .filter((p) => {
      if (filterTab !== "all" && p.reviewStatus !== filterTab) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (searchQuery.trim() && !p.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortBy === "title") return dir * a.title.localeCompare(b.title);
      if (sortBy === "xpReward") return dir * ((a.xpReward ?? 0) - (b.xpReward ?? 0));
      if (sortBy === "completedBy") return dir * ((a.completedBy ?? 0) - (b.completedBy ?? 0));
      if (sortBy === "updatedAt") return dir * ((a.updatedAt ?? a.createdAt ?? 0) - (b.updatedAt ?? b.createdAt ?? 0));
      return dir * ((a.createdAt ?? 0) - (b.createdAt ?? 0));
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
    <ErrorBoundary>
    <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: "85%" }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">Puzzles</h1>
        <button onClick={() => router.push("/studio/create")}
          className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] px-4 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]">
          <Plus className="size-4" />
          New Puzzle
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Total", value: puzzles.length, color: "from-primary/20 to-primary/5", text: "text-primary" },
          { label: "Published", value: puzzles.filter((p) => p.published).length, color: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-500" },
          { label: "Pending", value: pendingCount, color: "from-amber-500/20 to-amber-500/5", text: "text-amber-500" },
          { label: "Discuss", value: discussCount, color: "from-blue-500/20 to-blue-500/5", text: "text-blue-500" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border bg-card/50 backdrop-blur-sm p-4 transition-all hover:border-primary/20 hover:shadow-sm`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button key={tab.value} onClick={() => setFilterTab(tab.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterTab === tab.value
                ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                : "text-muted-foreground hover:bg-muted/80"
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

      {/* Search + type filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            className="h-9 w-full rounded-xl border bg-card/80 backdrop-blur-sm pl-9 pr-3 text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 appearance-none rounded-xl border bg-card/80 backdrop-blur-sm pl-3 pr-8 text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
            <option value="all">All types</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="true-false">True / False</option>
            <option value="type-answer">Type Answer</option>
            <option value="crossword">Crossword</option>
            <option value="sudoku">Sudoku</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
        </div>
        <div className="relative">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="h-9 appearance-none rounded-xl border bg-card/80 backdrop-blur-sm pl-3 pr-8 text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
            <option value="createdAt">Newest</option>
            <option value="updatedAt">Last modified</option>
            <option value="title">Title A-Z</option>
            <option value="xpReward">XP</option>
            <option value="completedBy">Most completed</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
        </div>
        <button onClick={() => setSortAsc(!sortAsc)}
          className={`flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-medium transition-all ${
            sortAsc ? "border-primary/30 bg-primary/10 text-primary shadow-sm shadow-primary/10" : "text-muted-foreground hover:bg-muted/80"
          }`}
          title={sortAsc ? "Ascending" : "Descending"}>
          <ArrowUpDown className="size-3.5" />
        </button>
        {(searchQuery || typeFilter !== "all") && (
          <button onClick={() => { setSearchQuery(""); setTypeFilter("all"); }}
            className="h-9 rounded-xl border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
            Clear
          </button>
        )}
      </div>

      {loading && loadTimedOut ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <ErrorFallback
            title="Taking longer than expected"
            description="The puzzle list is taking a while to load. Please try again."
            onRetry={load}
            fullPage={false}
          />
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <SkeletonFilterBar />
          <SkeletonPuzzleList count={6} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="size-5" />}
          title={puzzles.length === 0 ? "No puzzles yet." : "No puzzles match this filter."}
          description={puzzles.length === 0 ? "Create your first puzzle to get started." : undefined}
          action={puzzles.length === 0 ? { label: "Create your first puzzle", onClick: () => router.push("/studio/create") } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((puzzle, i) => {
            const statusKey = puzzle.published ? "live" : puzzle.reviewStatus ?? "draft";
            return (
            <motion.div key={puzzle.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group relative flex flex-col gap-3 rounded-xl border bg-card px-4 py-3.5 transition-all hover:border-primary/20 hover:shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${STATUS_DOTS[statusKey]}`} />
                    <span className="text-[11px] font-medium text-muted-foreground/70">{puzzle.published ? "Live" : STATUS_LABELS[puzzle.reviewStatus ?? "draft"]}</span>
                  </span>
                  {dailyPuzzleId === puzzle.id && (
                    <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                      <Sparkles className="size-3" />
                      Daily
                    </span>
                  )}
                  <h3 className="truncate text-sm font-semibold">{puzzle.title}</h3>
                  {!puzzle.published && puzzle.reviewNote && (
                    <span className="flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60" title={puzzle.reviewNote}>
                      <MessageSquare className="size-3" />
                      Note
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground/70">
                  <span>{catLabel(puzzle.category)}</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>{diffLabel(puzzle.difficulty)}</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>{puzzle.type === "true-false" ? "True/False" : puzzle.type === "crossword" ? `Crossword (${puzzle.crosswordData?.size}×${puzzle.crosswordData?.size})` : puzzle.type === "type-answer" ? "Type Answer" : puzzle.type === "riddle" ? "Riddle" : puzzle.type === "sudoku" ? "Sudoku" : puzzle.type === "wonder" ? "Wonder" : "Multiple Choice"}</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>{puzzle.xpReward} XP</span>
                  {(puzzle.completedBy ?? 0) > 0 && (
                    <>
                      <span className="text-muted-foreground/20">|</span>
                      <span className="text-success">{puzzle.completedBy} plays</span>
                    </>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                  <span className="flex items-center gap-1"><User className="size-3" />{puzzle.createdBy || "—"}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{puzzle.createdAt ? fmtDate(puzzle.createdAt) : "—"}</span>
                  {!puzzle.published && puzzle.reviewedBy && (
                    <span className="flex items-center gap-1"><MessageSquare className="size-3" />Reviewed by {puzzle.reviewedBy}</span>
                  )}
                </div>
                {!puzzle.published && puzzle.reviewNote && (
                  <p className="mt-1.5 border-l-2 border-muted-foreground/15 pl-2 text-[11px] italic text-muted-foreground/50">&ldquo;{puzzle.reviewNote}&rdquo;</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setTestPuzzle(puzzle)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-primary/10 hover:text-primary" title="Test">
                  <Play className="size-4" />
                </button>
                <button onClick={() => router.push(`/studio/edit/${puzzle.id}`)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-primary/10 hover:text-primary" title="Edit">
                  <Edit3 className="size-4" />
                </button>
                <button onClick={() => { setDeleteTarget(puzzle); setConfirmText(""); }}
                  disabled={!admin && puzzle.published}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-20"
                  title={!admin && puzzle.published ? "Cannot delete live puzzles" : "Delete"}>
                  <Trash2 className="size-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-border/50" />

                {!puzzle.published && admin && puzzle.reviewStatus === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => handleQuickReview(puzzle.id, "approved")}
                      className="flex size-8 items-center justify-center rounded-lg text-success/70 transition-all hover:bg-success/15 hover:text-success" title="Approve">
                      <CheckCircle2 className="size-4" />
                    </button>
                    <button onClick={() => handleQuickReview(puzzle.id, "rejected")}
                      className="flex size-8 items-center justify-center rounded-lg text-destructive/70 transition-all hover:bg-destructive/15 hover:text-destructive" title="Reject">
                      <XCircle className="size-4" />
                    </button>
                  </div>
                )}

                {!puzzle.published && !admin && (puzzle.reviewStatus === "draft" || puzzle.reviewStatus === "rejected" || puzzle.reviewStatus === "needs-discussion") && (
                  <button onClick={async () => { await updatePuzzleReview(puzzle.id, "pending"); toast.success("Submitted for approval."); load(); }}
                    className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all active:scale-[0.98] bg-gradient-to-r from-amber-500/15 to-amber-500/10 text-amber-600 hover:from-amber-500/25 hover:to-amber-500/15 dark:text-amber-400">
                    <Send className="size-3" />
                    Submit
                  </button>
                )}

                {(puzzle.published || puzzle.reviewStatus === "approved") && admin && (
                  <button onClick={() => setPublishTarget(puzzle)}
                    className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all active:scale-[0.98] ${
                      puzzle.published
                        ? "bg-muted/60 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                        : "bg-gradient-to-r from-success/15 to-success/10 text-success hover:from-success/25 hover:to-success/15"
                    }`}>
                    {puzzle.published ? <Lock className="size-3" /> : <Globe className="size-3" />}
                    {puzzle.published ? "Unpublish" : "Go Live"}
                  </button>
                )}
                {admin && puzzle.published && (
                  <button onClick={() => handleSetDaily(puzzle.id)} disabled={settingDaily}
                    title="Set as today's daily puzzle"
                    className={`flex size-8 items-center justify-center rounded-lg transition-all disabled:opacity-40 ${
                      dailyPuzzleId === puzzle.id
                        ? "bg-amber-500/15 text-amber-500 shadow-sm shadow-amber-500/20"
                        : "text-muted-foreground/60 hover:bg-amber-500/10 hover:text-amber-500"
                    }`}>
                    <Sparkles className="size-4" />
                  </button>
                )}
              </div>
            </motion.div>
            );
          })}
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
    </ErrorBoundary>
  );
}
