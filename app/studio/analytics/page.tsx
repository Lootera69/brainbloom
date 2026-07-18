"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Puzzle, Globe, Trophy, Layers, ArrowLeft, TrendingUp, Clock, BookOpen,
  Loader2, Eye, ListOrdered, ChevronDown, BarChart3, Sparkles, Activity,
  CheckCircle2, AlertCircle, Crown, Users, DollarSign, ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAnalytics, type AnalyticsData } from "@/services/analytics-service";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { ErrorFallback } from "@/components/error-fallback";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  "multiple-choice": "Multiple Choice",
  "true-false": "True / False",
  crossword: "Crossword",
  "type-answer": "Type Answer",
  sudoku: "Sudoku",
};

const TYPE_ICONS: Record<string, string> = {
  "multiple-choice": "📋",
  "true-false": "⚖️",
  "crossword": "✏️",
  "type-answer": "⌨️",
  sudoku: "🔢",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  "needs-discussion": "Needs Discussion",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  "needs-discussion": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const CHART_COLORS = [
  "from-violet-500 to-violet-400",
  "from-emerald-500 to-emerald-400",
  "from-amber-500 to-amber-400",
  "from-rose-500 to-rose-400",
  "from-sky-500 to-sky-400",
  "from-indigo-500 to-indigo-400",
  "from-teal-500 to-teal-400",
  "from-orange-500 to-orange-400",
  "from-pink-500 to-pink-400",
  "from-cyan-500 to-cyan-400",
];

const CHART_BG = [
  "bg-violet-500/10",
  "bg-emerald-500/10",
  "bg-amber-500/10",
  "bg-rose-500/10",
  "bg-sky-500/10",
  "bg-indigo-500/10",
  "bg-teal-500/10",
  "bg-orange-500/10",
  "bg-pink-500/10",
  "bg-cyan-500/10",
];

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  return <motion.span className={className}>{fmtNum(display)}</motion.span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-5 backdrop-blur-xl transition-all duration-500 hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-0.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
    >
      <div className={`absolute -top-10 -right-10 size-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] blur-2xl transition-transform duration-700 group-hover:scale-150 group-hover:opacity-[0.12]`} />
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${gradient} opacity-50`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">{label}</p>
          <AnimatedNumber value={value} className={`mt-2 block text-4xl font-bold tabular-nums tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`} />
          {sub && <p className="mt-1 text-xs text-muted-foreground/60">{sub}</p>}
        </div>
        <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="size-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-violet-500 opacity-15 blur-md" />
        <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/20 dark:shadow-primary/10">
          <Icon className="size-4 text-white" />
        </div>
      </div>
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground/60">{subtitle}</p>}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  data,
  valueKey,
  labelFormatter,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, any>;
  valueKey: string;
  labelFormatter?: (key: string) => string;
  emptyMessage?: string;
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => (b as any)[valueKey] - (a as any)[valueKey]);
  const maxVal = Math.max(...entries.map(([, v]) => (v as any)[valueKey]), 1);

  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]">
        <SectionHeader icon={BarChart3} title={title} subtitle={subtitle} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground/60">{emptyMessage || "No data available."}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03] dark:border-white/[0.06] dark:bg-white/[0.03]">
      <SectionHeader icon={BarChart3} title={title} subtitle={subtitle} />
      <div className="space-y-4">
        {entries.map(([key, val], i) => {
          const v = (val as any)[valueKey];
          const label = labelFormatter ? labelFormatter(key) : key;
          const pct = maxVal > 0 ? (v / maxVal) * 100 : 0;
          const colorIdx = i % CHART_COLORS.length;
          return (
            <div key={key} className="group/chart">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium truncate flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full bg-gradient-to-r ${CHART_COLORS[colorIdx]}`} />
                  {label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold tabular-nums">{fmtNum(v)}</span>
                  <span className="text-muted-foreground/50 w-8 text-right text-[10px]">{Math.round(pct)}%</span>
                </div>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${CHART_COLORS[colorIdx]}`}
                >
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/15 rounded-r-full" />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StatusPieCard({ title, subtitle, data }: {
  title: string;
  subtitle?: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]">
        <SectionHeader icon={Activity} title={title} subtitle={subtitle} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground/60">No data available.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03] dark:border-white/[0.06] dark:bg-white/[0.03]">
      <SectionHeader icon={Activity} title={title} subtitle={subtitle} />
      <div className="space-y-3">
        {entries.map(([key, val], i) => {
          const pct = total > 0 ? (val / total) * 100 : 0;
          const colorIdx = i % CHART_COLORS.length;
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium">{STATUS_LABELS[key] || key}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{val}</span>
                  <span className="text-muted-foreground/50 w-10 text-right tabular-nums text-[10px]">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${CHART_COLORS[colorIdx]}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function TopPuzzlesCard({ puzzles }: { puzzles: { id: string; title: string; completedBy: number }[] }) {
  const maxCompletions = Math.max(...puzzles.map((p) => p.completedBy || 0), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03] dark:border-white/[0.06] dark:bg-white/[0.03]">
      <SectionHeader icon={TrendingUp} title="Top Puzzles" subtitle="Most completed" />
      {puzzles.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground/60">No completions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {puzzles.map((p, i) => {
            const pct = maxCompletions > 0 ? ((p.completedBy || 0) / maxCompletions) * 100 : 0;
            return (
              <div key={p.id}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-muted/40">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm ${
                  i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-500/25" :
                  i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-400/25" :
                  i === 2 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-orange-500/25" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                    />
                  </div>
                </div>
                <span className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{fmtNum(p.completedBy || 0)}</p>
                  <p className="text-[10px] text-muted-foreground/50">plays</p>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function RecentPuzzlesCard({ puzzles }: { puzzles: { id: string; title: string; reviewStatus: string; createdAt: number }[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03] dark:border-white/[0.06] dark:bg-white/[0.03]">
      <SectionHeader icon={Clock} title="Recent Puzzles" subtitle="Latest additions" />
      {puzzles.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground/60">No puzzles created yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {puzzles.map((p) => (
            <div key={p.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-muted/40">
              <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[p.reviewStatus] || STATUS_STYLE.draft}`}>
                {STATUS_LABELS[p.reviewStatus] || p.reviewStatus}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{p.title}</p>
              <span className="shrink-0 text-xs text-muted-foreground/50 tabular-nums">
                {fmtDate(p.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CategoryTable({ data }: { data: Record<string, { count: number; published: number; completions: number }> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b.completions - a.completions);
  const maxCompletions = Math.max(...entries.map(([, v]) => v.completions), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.03] dark:border-white/[0.06] dark:bg-white/[0.03]">
      <SectionHeader icon={BookOpen} title="Category Breakdown" subtitle="Performance across puzzle categories" />
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground/60">No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(([cat, info], i) => {
            const pct = maxCompletions > 0 ? (info.completions / maxCompletions) * 100 : 0;
            const colorIdx = i % CHART_COLORS.length;
            return (
              <div key={cat} className="group rounded-xl border border-border/30 bg-white/40 p-3 transition-all duration-200 hover:border-border/50 hover:bg-white/60 sm:p-4 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full bg-gradient-to-r ${CHART_COLORS[colorIdx]}`} />
                    <span className="text-sm font-semibold">{cat}</span>
                    <span className="inline-flex items-center rounded-lg bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {info.published}/{info.count} live
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-6 text-xs sm:pl-0">
                    <span className="tabular-nums text-muted-foreground/60">{fmtNum(info.completions)} plays</span>
                    <span className="font-semibold tabular-nums text-foreground">{info.count > 0 ? (info.completions / info.count).toFixed(1) : "—"} avg</span>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06 }}
                    className={`h-full rounded-full bg-gradient-to-r ${CHART_COLORS[colorIdx]}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/50 bg-white/60 p-5 backdrop-blur-xl animate-pulse dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <div className="h-2.5 w-16 rounded bg-muted/60" />
          <div className="h-9 w-20 rounded bg-muted/60" />
        </div>
        <div className="size-10 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-border/50 bg-white/60 p-6 backdrop-blur-xl animate-pulse dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-3">
        <div className="size-9 rounded-xl bg-muted/60" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="h-2.5 w-20 rounded bg-muted/60" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="mb-1.5 flex justify-between">
              <div className="h-3 w-24 rounded bg-muted/60" />
              <div className="h-3 w-12 rounded bg-muted/60" />
            </div>
            <div className="h-2.5 rounded-full bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const { timedOut: loadTimedOut, reset: resetLoadTimeout } = useLoadingTimeout(6000);

  useEffect(() => {
    setLoading(true);
    resetLoadTimeout();
    getAnalytics(timeRange).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const [timeAgo, setTimeAgo] = useState("");
  useEffect(() => {
    if (data) {
      const update = () => setTimeAgo(fmtDate(Date.now()));
      update();
      const interval = setInterval(update, 30000);
      return () => clearInterval(interval);
    }
  }, [data]);

  if (loadTimedOut && loading) {
    return (
      <main className="relative mx-auto min-h-screen w-full px-3 pb-12 pt-6 sm:px-4" style={{ maxWidth: "min(90%, 1100px)" }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-primary/[0.03] blur-3xl" />
          <div className="absolute top-1/3 -left-32 size-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
        </div>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <ErrorFallback
            title="Taking longer than expected"
            description="Analytics data is taking a while to load. Please try again."
            onRetry={() => { resetLoadTimeout(); setLoading(true); getAnalytics(timeRange).then((r) => { setData(r); setLoading(false); }); }}
            fullPage={false}
          />
        </div>
      </main>
    );
  }

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
            <button onClick={() => router.push("/studio")}
              className="flex size-11 items-center justify-center rounded-xl border border-border/50 bg-white/60 text-muted-foreground backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:bg-primary/5 hover:text-foreground hover:shadow-md dark:border-white/[0.06] dark:bg-white/[0.03]">
              <ArrowLeft className="size-4" />
            </button>
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-violet-500 opacity-20 blur-lg" />
              <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-xl shadow-primary/25 sm:size-14 dark:shadow-primary/15">
                <BarChart3 className="size-5 text-white sm:size-7" />
              </div>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">Analytics </span>
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Puzzle studio performance overview
                {timeAgo && <span className="ml-2 text-xs text-muted-foreground/40">· Updated {timeAgo}</span>}
              </p>
            </div>
          </div>

          <div className="flex gap-1 rounded-2xl border border-border/50 bg-white/60 p-1 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]">
            {(["all", "30d", "7d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 sm:px-4",
                  timeRange === range
                    ? "bg-gradient-to-r from-primary/15 to-violet-500/10 text-primary shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                {range === "all" ? "All" : range === "30d" ? "30d" : "7d"}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : data ? (
          <>
            <StatCard icon={Puzzle} label="Total Puzzles" value={data.totalPuzzles}
              gradient="from-violet-500 to-purple-500"
              sub={`${data.totalPuzzles} created`}
              delay={0.1} />
            <StatCard icon={Globe} label="Published" value={data.publishedPuzzles}
              gradient="from-emerald-500 to-teal-500"
              sub={data.totalPuzzles > 0 ? `${Math.round((data.publishedPuzzles / data.totalPuzzles) * 100)}% of total` : "—"}
              delay={0.15} />
            <StatCard icon={Trophy} label="Completions" value={data.totalCompletions}
              gradient="from-amber-500 to-orange-500"
              sub={data.totalPuzzles > 0 ? `${(data.totalCompletions / data.totalPuzzles).toFixed(1)} avg` : "—"}
              delay={0.2} />
            <StatCard icon={Layers} label="Categories" value={data.categories.length}
              gradient="from-sky-500 to-cyan-500"
              sub={`${data.categories.length} active`}
              delay={0.25} />
            <StatCard icon={Crown} label="Premium" value={data.premiumUsers}
              gradient="from-rose-500 to-pink-500"
              sub={data.premiumUsers > 0 ? `${(data.premiumConversionRate * 100).toFixed(1)}%` : "—"}
              delay={0.3} />
          </>
        ) : null}
      </motion.div>

      {/* Premium Revenue */}
      {!loading && data && data.premiumUsers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mb-8 grid grid-cols-2 gap-3"
        >
          <StatCard icon={DollarSign} label="Est. Monthly Revenue" value={data.estimatedMonthlyRevenue}
            gradient="from-emerald-500 to-teal-500"
            sub="Based on premium members"
            delay={0.35} />
          <StatCard icon={Users} label="Conversion Rate" value={Math.round(data.premiumConversionRate * 100)}
            gradient="from-amber-500 to-orange-500"
            sub={`${data.premiumUsers} premium users`}
            delay={0.4} />
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="mb-8 grid gap-5 md:grid-cols-2">
        {loading ? (
          <><SkeletonChart /><SkeletonChart /></>
        ) : data ? (
          <>
            <ChartCard title="Puzzles by Type" subtitle="Distribution across formats"
              data={data.byType} valueKey="count"
              labelFormatter={(k) => `${TYPE_ICONS[k] || "📋"} ${TYPE_LABELS[k] || k}`} />
            <StatusPieCard title="Puzzle Status" subtitle="Review workflow"
              data={data.byStatus} />
          </>
        ) : null}
      </div>

      {/* Completions by Category */}
      {!loading && data && (
        <div className="mb-8">
          <ChartCard title="Completions by Category" subtitle="Total plays per category"
            data={data.byCategory} valueKey="completions" />
        </div>
      )}

      {/* Top & Recent */}
      <div className="mb-8 grid gap-5 md:grid-cols-2">
        {loading ? (
          <><SkeletonChart /><SkeletonChart /></>
        ) : data ? (
          <>
            <TopPuzzlesCard puzzles={data.topPuzzles} />
            <RecentPuzzlesCard puzzles={data.recentPuzzles} />
          </>
        ) : null}
      </div>

      {/* Category Table */}
      {!loading && data && (
        <div className="mb-8">
          <CategoryTable data={data.byCategory} />
        </div>
      )}
    </main>
    </ErrorBoundary>
  );
}
