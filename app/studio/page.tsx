"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Plus, Edit3, Trash2, Play, Globe, Lock, Loader2, Calendar, User, AlertTriangle, X, Settings, CheckCircle2, XCircle, MessageSquare, Send, Filter, Sparkles, BarChart3, Search, ArrowUpDown, Database, Eye, Zap, LayoutGrid } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { getPuzzles, deletePuzzle, togglePublish, updatePuzzleReview, isAdmin, getStudioSession, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { type Puzzle, type ReviewStatus, type PuzzleType } from "@/types/puzzle";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { getTodayDailyPuzzleId, setDailyPuzzle } from "@/services/daily-puzzle";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { toast } from "sonner";
import { SkeletonPuzzleList, SkeletonFilterBar } from "@/components/ui/skeleton";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { ErrorFallback } from "@/components/error-fallback";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  "needs-discussion": "Discuss",
};

const STATUS_DOTS: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  pending: "bg-amber-500",
  approved: "bg-success",
  rejected: "bg-destructive",
  "needs-discussion": "bg-blue-500",
  live: "bg-emerald-500",
};

const STATUS_ACCENTS: Record<string, string> = {
  draft: "from-muted-foreground/30 to-transparent",
  pending: "from-amber-500 to-amber-500/0",
  approved: "from-success to-success/0",
  rejected: "from-destructive to-destructive/0",
  "needs-discussion": "from-blue-500 to-blue-500/0",
  live: "from-emerald-500 to-emerald-500/0",
};

const STATUS_BORDER: Record<string, string> = {
  draft: "border-l-muted-foreground/20",
  pending: "border-l-amber-500",
  approved: "border-l-success",
  rejected: "border-l-destructive",
  "needs-discussion": "border-l-blue-500",
  live: "border-l-emerald-500",
};

const STATUS_GLOW: Record<string, string> = {
  draft: "",
  pending: "shadow-amber-500/10",
  approved: "shadow-success/10",
  rejected: "shadow-destructive/10",
  "needs-discussion": "shadow-blue-500/10",
  live: "shadow-emerald-500/10",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  approved: "bg-success/10 text-success ring-success/20",
  rejected: "bg-destructive/10 text-destructive ring-destructive/20",
  "needs-discussion": "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  live: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
};

const FILTER_TABS = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "approved", label: "Approved", icon: CheckCircle2 },
  { value: "rejected", label: "Rejected", icon: XCircle },
  { value: "needs-discussion", label: "Discuss", icon: MessageSquare },
] as const;

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "multiple-choice", label: "Multiple Choice" },
  { value: "true-false", label: "True / False" },
  { value: "type-answer", label: "Type Answer" },
  { value: "crossword", label: "Crossword" },
  { value: "sudoku", label: "Sudoku" },
  { value: "riddle", label: "Riddle" },
  { value: "wonder", label: "Wonder" },
  { value: "cipher", label: "Cipher" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "updatedAt", label: "Modified" },
  { value: "title", label: "Title" },
  { value: "xpReward", label: "XP" },
  { value: "completedBy", label: "Plays" },
];

function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.8, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, motionVal, rounded]);

  return <motion.span className={className}>{display}</motion.span>;
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function typeLabel(type: string, crosswordSize?: number) {
  if (type === "true-false") return "True / False";
  if (type === "crossword") return `Crossword ${crosswordSize ? `(${crosswordSize}×${crosswordSize})` : ""}`;
  if (type === "type-answer") return "Type Answer";
  if (type === "riddle") return "Riddle";
  if (type === "sudoku") return "Sudoku";
  if (type === "wonder") return "Wonder";
  if (type === "cipher") return "Cipher";
  return "Multiple Choice";
}

const TYPE_ICONS: Record<string, string> = {
  "multiple-choice": "📋",
  "true-false": "⚖️",
  "type-answer": "⌨️",
  "crossword": "✏️",
  "sudoku": "🔢",
  "riddle": "🤔",
  "wonder": "💡",
  "cipher": "🔐",
};

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

  const filtered = useMemo(() => puzzles
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
    }), [puzzles, filterTab, typeFilter, searchQuery, sortBy, sortAsc]);

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
  const liveCount = puzzles.filter((p) => p.published).length;
  const totalPlays = puzzles.reduce((sum, p) => sum + (p.completedBy ?? 0), 0);

  const stats = [
    { label: "Total", value: puzzles.length, gradient: "from-indigo-500 to-violet-500", icon: Database },
    { label: "Live", value: liveCount, gradient: "from-emerald-500 to-teal-500", icon: Globe },
    { label: "Pending", value: pendingCount, gradient: "from-amber-500 to-orange-500", icon: Clock },
    { label: "Plays", value: totalPlays, gradient: "from-rose-500 to-pink-500", icon: Eye },
  ];

  return (
    <ErrorBoundary>
    <main className="relative mx-auto min-h-screen w-full px-3 pb-12 pt-6 sm:px-4" style={{ maxWidth: "min(90%, 1100px)" }}>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="absolute bottom-20 right-1/4 size-72 rounded-full bg-emerald-500/[0.02] blur-3xl" />
      </div>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-border/50 bg-white/70 p-6 backdrop-blur-2xl dark:border-white/[0.06] dark:bg-white/[0.03] sm:p-8"
      >
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-gradient-to-br from-emerald-500/8 to-teal-500/8 blur-2xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-violet-500 opacity-20 blur-lg" />
              <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-xl shadow-primary/25 sm:size-14 dark:shadow-primary/15">
                <Database className="size-5 text-white sm:size-7" />
              </div>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">Puzzle </span>
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Studio</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {puzzles.length} puzzles · {liveCount} live · {totalPlays} total plays
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/studio/analytics")}
              className="group flex h-11 items-center gap-2 rounded-xl border border-border/50 bg-white/60 px-3 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:bg-primary/5 hover:text-foreground hover:shadow-md hover:shadow-primary/5 sm:px-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <BarChart3 className="size-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <ThemeSwitcher />
            <button onClick={() => router.push("/studio/create")}
              className="group relative flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-violet-500 px-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35 hover:brightness-110 active:scale-[0.98] sm:px-5 dark:shadow-primary/15">
              <span className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <Plus className="size-4 relative transition-transform duration-300 group-hover:rotate-90" />
              <span className="relative hidden sm:inline">New Puzzle</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="relative mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-5 backdrop-blur-xl transition-all duration-500 hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-0.5 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:shadow-white/[0.03]"
            >
              <div className={`absolute -top-10 -right-10 size-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.07] blur-2xl transition-transform duration-700 group-hover:scale-150 group-hover:opacity-[0.12]`} />
              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${s.gradient} opacity-50`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">{s.label}</p>
                  <AnimatedNumber value={s.value} className={`mt-2 block text-4xl font-bold tabular-nums tracking-tight bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`} />
                </div>
                <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg`}>
                  <Icon className="size-5 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative z-30 mb-6 space-y-3"
      >
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/50 bg-white/60 p-1.5 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = filterTab === tab.value;
            const count = tab.value === "pending" ? pendingCount : tab.value === "needs-discussion" ? discussCount : undefined;
            return (
                <button key={tab.value} onClick={() => setFilterTab(tab.value)}
                className={cn(
                  "relative flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-300 sm:gap-1.5 sm:px-3.5",
                  active
                    ? "bg-gradient-to-r from-primary/15 to-violet-500/10 text-primary shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Icon className="size-3.5" />
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>{count}</span>
                )}
              </button>
            );
          })}

          <div className="mx-1 h-5 w-px bg-border/50 dark:bg-white/10" />

          {/* Search */}
          <div className="relative min-w-[120px] flex-1 sm:min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search puzzles..."
              className="h-9 w-full rounded-xl border-0 bg-transparent pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground/40" />
          </div>

          <div className="mx-1 h-5 w-px bg-border/50 dark:bg-white/10" />

          {/* Type filter */}
          <SelectDropdown
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_FILTER_OPTIONS}
            ariaLabel="Filter by puzzle type"
          />

          {/* Sort */}
          <SelectDropdown
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            ariaLabel="Sort puzzles"
          />

          <button onClick={() => setSortAsc(!sortAsc)}
            className={cn(
              "flex size-9 items-center justify-center rounded-xl transition-all duration-200",
              sortAsc ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            title={sortAsc ? "Ascending" : "Descending"}>
            <ArrowUpDown className="size-3.5" />
          </button>

          {(searchQuery || typeFilter !== "all") && (
            <button onClick={() => { setSearchQuery(""); setTypeFilter("all"); }}
              className="flex h-9 items-center gap-1 rounded-xl bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition-all duration-200 hover:bg-destructive/15">
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-white/60 p-12 text-center backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]"
        >
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-40 rounded-full bg-primary/[0.05] blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10">
              <Filter className="size-7 text-primary/60" />
            </div>
            <h3 className="font-heading text-lg font-bold">
              {puzzles.length === 0 ? "No puzzles yet" : "No puzzles match"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground/60">
              {puzzles.length === 0
                ? "Create your first puzzle to get started with the studio."
                : "Try adjusting your filters or search query."}
            </p>
            {puzzles.length === 0 && (
              <button onClick={() => router.push("/studio/create")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]">
                <Plus className="size-4" />
                Create first puzzle
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((puzzle, i) => {
            const statusKey = puzzle.published ? "live" : puzzle.reviewStatus ?? "draft";
            return (
            <motion.div key={puzzle.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
              className="group relative overflow-hidden rounded-2xl border border-border/50 border-l-[3px] bg-white/60 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-px dark:border-white/[0.06] dark:border-l-[3px] dark:bg-white/[0.03] dark:hover:shadow-white/[0.03]"
              style={{ borderLeftColor: `var(--status-color)` }}
            >
              {/* Top accent gradient */}
              <div className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r ${STATUS_ACCENTS[statusKey]}`} />

              {/* Hover glow */}
              <div className={`absolute -top-16 -right-16 size-48 rounded-full bg-gradient-to-br ${STATUS_ACCENTS[statusKey]} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100`} />

              <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-4">
                {/* Left: Type icon + Title area */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {/* Type icon */}
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-muted">
                      {TYPE_ICONS[puzzle.type] || "📋"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 gap-y-1 sm:gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                          STATUS_BADGE[statusKey]
                        )}>
                          <span className={`size-1.5 rounded-full ${STATUS_DOTS[statusKey]}`} />
                          {puzzle.published ? "Live" : STATUS_LABELS[puzzle.reviewStatus ?? "draft"]}
                        </span>
                        {dailyPuzzleId === puzzle.id && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                            <Sparkles className="size-2.5" />
                            Daily
                          </span>
                        )}
                        {!puzzle.published && (puzzle.reviewComments?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border/50" title={puzzle.reviewComments?.[puzzle.reviewComments.length - 1]?.text.replace(/<[^>]*>/g, '') ?? ""}>
                            <MessageSquare className="size-2.5" />
                            {puzzle.reviewComments?.length} {puzzle.reviewComments?.length === 1 ? "Note" : "Notes"}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{puzzle.title}</h3>
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/60 sm:gap-x-3 sm:pl-[52px]">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-sm">{TYPE_ICONS[puzzle.type] || "📋"}</span>
                      {typeLabel(puzzle.type, puzzle.crosswordData?.size)}
                    </span>
                    <span className="text-muted-foreground/20">·</span>
                    <span>{catLabel(puzzle.category)}</span>
                    <span className="text-muted-foreground/20">·</span>
                    <span className="capitalize">{diffLabel(puzzle.difficulty)}</span>
                    <span className="text-muted-foreground/20">·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary/70">
                      <Zap className="size-3" />
                      {puzzle.xpReward} XP
                    </span>
                    {(puzzle.completedBy ?? 0) > 0 && (
                      <>
                        <span className="text-muted-foreground/20">·</span>
                        <span className="inline-flex items-center gap-1 text-success/80">
                          <Eye className="size-3" />
                          {puzzle.completedBy} plays
                        </span>
                      </>
                    )}
                  </div>

                  {/* Creator + date + review note */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/45 sm:gap-x-3 sm:pl-[52px]">
                    <span className="inline-flex items-center gap-1"><User className="size-3" />{puzzle.createdBy || "Unknown"}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="size-3" />{puzzle.createdAt ? fmtDate(puzzle.createdAt) : "—"}</span>
                    {!puzzle.published && puzzle.reviewedBy && (
                      <span className="inline-flex items-center gap-1"><MessageSquare className="size-3" />Reviewed by {puzzle.reviewedBy}</span>
                    )}
                  </div>
                  {!puzzle.published && (puzzle.reviewComments?.length ?? 0) > 0 && (
                    <div className="mt-1.5 sm:ml-[52px]">
                      {(() => {
                        const latest = puzzle.reviewComments![puzzle.reviewComments!.length - 1];
                        return (
                          <div className="rounded-lg border-l-2 border-muted-foreground/15 bg-muted/30 px-3 py-1.5">
                            <span className="text-[10px] font-semibold text-foreground/70">{latest.author}</span>
                            <span className="ml-1.5 text-[10px] text-muted-foreground/40">
                              {new Date(latest.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                            <div className="mt-0.5 text-[11px] italic text-muted-foreground/50 [&_p]:mb-1 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4" dangerouslySetInnerHTML={{ __html: latest.text }} />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex shrink-0 flex-wrap items-center gap-1 sm:flex-nowrap sm:pl-0">
                  <button onClick={() => setTestPuzzle(puzzle)}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground/50 transition-all duration-200 hover:bg-primary/10 hover:text-primary" title="Test">
                    <Play className="size-4" />
                  </button>
                  <button onClick={() => router.push(`/studio/edit/${puzzle.id}`)}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground/50 transition-all duration-200 hover:bg-primary/10 hover:text-primary" title="Edit">
                    <Edit3 className="size-4" />
                  </button>
                  <button onClick={() => { setDeleteTarget(puzzle); setConfirmText(""); }}
                    disabled={!admin && puzzle.published}
                    className="flex size-9 items-center justify-center rounded-xl text-muted-foreground/50 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-20"
                    title={!admin && puzzle.published ? "Cannot delete live puzzles" : "Delete"}>
                    <Trash2 className="size-4" />
                  </button>

                  <div className="mx-1 h-5 w-px bg-border/40 dark:bg-white/[0.08]" />

                  {/* Contextual review actions */}
                  {!puzzle.published && admin && puzzle.reviewStatus === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => handleQuickReview(puzzle.id, "approved")}
                        className="flex h-8 items-center gap-1.5 rounded-xl bg-success/10 px-3 text-[11px] font-semibold text-success ring-1 ring-inset ring-success/20 transition-all duration-200 hover:bg-success/20 hover:shadow-sm hover:shadow-success/10 active:scale-[0.97]"
                        title="Approve">
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </button>
                      <button onClick={() => handleQuickReview(puzzle.id, "rejected")}
                        className="flex h-8 items-center gap-1.5 rounded-xl bg-destructive/10 px-3 text-[11px] font-semibold text-destructive ring-1 ring-inset ring-destructive/20 transition-all duration-200 hover:bg-destructive/20 hover:shadow-sm hover:shadow-destructive/10 active:scale-[0.97]"
                        title="Reject">
                        <XCircle className="size-3.5" />
                        Reject
                      </button>
                      <button onClick={() => handleQuickReview(puzzle.id, "needs-discussion")}
                        className="flex h-8 items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 text-[11px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-500/20 transition-all duration-200 hover:bg-blue-500/20 hover:shadow-sm hover:shadow-blue-500/10 active:scale-[0.97] dark:text-blue-400"
                        title="Needs Discussion">
                        <MessageSquare className="size-3.5" />
                        Discuss
                      </button>
                    </div>
                  )}

                  {!puzzle.published && !admin && (puzzle.reviewStatus === "draft" || puzzle.reviewStatus === "rejected" || puzzle.reviewStatus === "needs-discussion") && (
                    <button onClick={async () => { await updatePuzzleReview(puzzle.id, "pending"); toast.success("Submitted for approval."); load(); }}
                      className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-3 text-[11px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20 transition-all duration-200 hover:from-amber-500/25 hover:to-orange-500/15 hover:shadow-sm hover:shadow-amber-500/10 active:scale-[0.97] dark:text-amber-400">
                      <Send className="size-3" />
                      Submit
                    </button>
                  )}

                  {(puzzle.published || puzzle.reviewStatus === "approved") && admin && (
                    <button onClick={() => setPublishTarget(puzzle)}
                      className={cn(
                        "flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition-all duration-200 active:scale-[0.97] ring-1 ring-inset",
                        puzzle.published
                          ? "bg-muted/40 text-muted-foreground/70 ring-border/50 hover:bg-destructive/10 hover:text-destructive hover:ring-destructive/20 hover:shadow-sm hover:shadow-destructive/10"
                          : "bg-success/10 text-success ring-success/20 hover:bg-success/20 hover:shadow-sm hover:shadow-success/10"
                      )}>
                      {puzzle.published ? <Lock className="size-3" /> : <Globe className="size-3" />}
                      {puzzle.published ? "Unpublish" : "Go Live"}
                    </button>
                  )}

                  {admin && puzzle.published && (
                    <button onClick={() => handleSetDaily(puzzle.id)} disabled={settingDaily}
                      title="Set as today's daily puzzle"
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-40",
                        dailyPuzzleId === puzzle.id
                          ? "bg-amber-500/15 text-amber-500 shadow-md shadow-amber-500/20"
                          : "text-muted-foreground/50 hover:bg-amber-500/10 hover:text-amber-500 hover:shadow-sm hover:shadow-amber-500/10"
                      )}>
                      <Sparkles className="size-4" />
                    </button>
                  )}
                </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
            onClick={() => { setDeleteTarget(null); setConfirmText(""); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.06]">
              {/* Red gradient top accent */}
              <div className="h-1 bg-gradient-to-r from-destructive via-red-500 to-orange-500" />

              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
                      <Trash2 className="size-5 text-destructive" />
                    </div>
                    <h2 className="font-heading text-lg font-bold">Delete puzzle</h2>
                  </div>
                  <button onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
                    className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60"><X className="size-4" /></button>
                </div>

                <p className="text-sm text-muted-foreground">Delete <span className="font-semibold text-foreground">&ldquo;{deleteTarget.title}&rdquo;</span>?</p>
                <p className="mt-1 text-xs text-muted-foreground/60">This action cannot be undone.</p>

                {(deleteTarget.completedBy ?? 0) > 0 && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Completed by users</p>
                      <p className="text-xs text-muted-foreground/60">Completed {(deleteTarget.completedBy ?? 0)} time{(deleteTarget.completedBy ?? 0) !== 1 ? "s" : ""}.</p>
                    </div>
                  </div>
                )}

                <div className="mt-5" onCopy={(e) => e.preventDefault()}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground/60">Type the puzzle title to confirm:</p>
                  <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                    onPaste={(e) => { e.preventDefault(); toast.error("Please type manually."); }}
                    onCopy={(e) => { e.preventDefault(); toast.error("Please type manually."); }}
                    onCut={(e) => { e.preventDefault(); toast.error("Please type manually."); }}
                    placeholder={deleteTarget?.title || "Type the puzzle title"}
                    className="w-full rounded-xl border border-border/50 bg-white/60 px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/30 focus:border-destructive focus:ring-2 focus:ring-destructive/10 dark:border-white/[0.06] dark:bg-white/[0.03]" autoComplete="off" />
                </div>

                <div className="mt-5 flex gap-3">
                  <button onClick={() => { setDeleteTarget(null); setConfirmText(""); }}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border/50 text-sm font-medium transition-all duration-200 hover:bg-muted/50 dark:border-white/[0.06]">Cancel</button>
                  <button onClick={handleDelete} disabled={!deleteTarget || confirmText !== deleteTarget.title || deleting || deleteCountdown > 0}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-destructive to-red-600 text-sm font-semibold text-white shadow-lg shadow-destructive/25 transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:shadow-destructive/30 active:scale-[0.98] disabled:opacity-40 dark:shadow-destructive/15">
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    {deleteCountdown > 0 ? `Delete (${deleteCountdown}s)` : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test modal */}
      <AnimatePresence>
        {testPuzzle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
            onClick={() => setTestPuzzle(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border/50 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.06]">
              <div className="h-1 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />
              <div className="relative p-6">
                <button onClick={() => setTestPuzzle(null)}
                  className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60"><X className="size-4" /></button>
                <PuzzlePlay puzzle={testPuzzle} onComplete={() => setTestPuzzle(null)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    </ErrorBoundary>
  );
}
