"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Puzzle, Globe, Trophy, Layers, ArrowLeft, TrendingUp, Clock, BookOpen,
  Loader2, Eye, ListOrdered, ChevronDown, BarChart3, Sparkles, Activity,
  CheckCircle2, AlertCircle, Crown, Users, DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAnalytics, type AnalyticsData } from "@/services/analytics-service";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { ErrorFallback } from "@/components/error-fallback";


const TYPE_LABELS: Record<string, string> = {
  "multiple-choice": "Multiple Choice",
  "true-false": "True / False",
  crossword: "Crossword",
  "type-answer": "Type Answer",
  sudoku: "Sudoku",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  "needs-discussion": "Needs Discussion",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  "needs-discussion": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
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

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const from = ref.current;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      ref.current = current;
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);

  return <>{fmtNum(display)}{suffix}</>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  trend,
  suffix,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  gradient: string;
  trend?: { up: boolean; label: string };
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              <AnimatedNumber value={value} />
            </p>
            {sub && <p className="text-xs text-muted-foreground/80">{sub}</p>}
          </div>
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className={`${trend.up ? "text-emerald-500" : "text-red-500"}`}>
              {trend.up ? "↑" : "↓"}
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: any;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  data,
  valueKey,
  labelFormatter,
  valueFormatter,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, any>;
  valueKey: string;
  labelFormatter?: (key: string) => string;
  valueFormatter?: (v: number) => string;
  emptyMessage?: string;
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => (b as any)[valueKey] - (a as any)[valueKey]);
  const maxVal = Math.max(...entries.map(([, v]) => (v as any)[valueKey]), 1);

  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6">
        <SectionHeader icon={BarChart3} title={title} subtitle={subtitle} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">{emptyMessage || "No data available."}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 transition-all hover:shadow-md hover:shadow-primary/5">
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
                  <span className={`size-2 rounded-full ${CHART_COLORS[colorIdx].replace("from-", "bg-").split(" ")[0]}`} />
                  {label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold tabular-nums">{valueFormatter ? valueFormatter(v) : fmtNum(v)}</span>
                  <span className="text-muted-foreground/60 w-8 text-right">{Math.round(pct)}%</span>
                </div>
              </div>
              <div className="relative h-3 overflow-hidden rounded-lg bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                  className={`absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r ${CHART_COLORS[colorIdx]} shadow-sm`}
                >
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/10 rounded-r-lg" />
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
        className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6">
        <SectionHeader icon={Activity} title={title} subtitle={subtitle} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No data available.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 transition-all hover:shadow-md hover:shadow-primary/5">
      <SectionHeader icon={Activity} title={title} subtitle={subtitle} />
      <div className="space-y-3">
        {entries.map(([key, val], i) => {
          const pct = total > 0 ? (val / total) * 100 : 0;
          const statusColor = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{STATUS_LABELS[key] || key}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{val}</span>
                  <span className="text-muted-foreground w-10 text-right tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${statusColor} shadow-sm`}
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
      className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 transition-all hover:shadow-md hover:shadow-primary/5">
      <SectionHeader icon={TrendingUp} title="Top Puzzles" subtitle="Most completed" />
      {puzzles.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No completions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {puzzles.map((p, i) => {
            const pct = maxCompletions > 0 ? ((p.completedBy || 0) / maxCompletions) * 100 : 0;
            return (
              <div key={p.id}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  i === 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                  i === 1 ? "bg-slate-400/15 text-slate-500 dark:text-slate-300" :
                  i === 2 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{fmtNum(p.completedBy || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">plays</p>
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
      className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 transition-all hover:shadow-md hover:shadow-primary/5">
      <SectionHeader icon={Clock} title="Recent Puzzles" subtitle="Latest additions" />
      {puzzles.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No puzzles created yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {puzzles.map((p) => (
            <div key={p.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50">
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                STATUS_BADGE[p.reviewStatus] || STATUS_BADGE.draft
              }`}>
                {STATUS_LABELS[p.reviewStatus] || p.reviewStatus}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</p>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
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
      className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 transition-all hover:shadow-md hover:shadow-primary/5">
      <SectionHeader icon={BookOpen} title="Category Breakdown" subtitle="Performance across puzzle categories" />
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted/50 text-left text-xs text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Category</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Total</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Published</th>
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Completions</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Avg. Plays</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([cat, info]) => {
                const pct = maxCompletions > 0 ? (info.completions / maxCompletions) * 100 : 0;
                return (
                  <tr key={cat} className="group border-b border-muted/30 text-muted-foreground transition-colors hover:bg-muted/20 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1 font-medium text-foreground">{cat}</div>
                      </div>
                      <div className="mt-1 h-1 max-w-40 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary/40 to-primary transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{info.count}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        info.published === info.count ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {info.published}/{info.count}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-semibold tabular-nums text-foreground">{fmtNum(info.completions)}</td>
                    <td className="py-3 tabular-nums">{info.count > 0 ? (info.completions / info.count).toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
        </div>
        <div className="size-11 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 animate-pulse">
      <div className="mb-5 flex items-center gap-3">
        <div className="size-9 rounded-xl bg-muted" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="mb-1.5 flex justify-between">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
            <div className="h-3 rounded-lg bg-muted" />
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
      <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: "85%" }}>
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
    <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: "85%" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/studio")}
            className="flex size-10 items-center justify-center rounded-xl border text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.97]">
            <ArrowLeft className="size-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">Analytics</h1>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Studio
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Overview of your puzzle studio performance
              {timeAgo && <span className="ml-2 text-xs text-muted-foreground/60">· Updated {timeAgo}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
          {(["all", "30d", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                timeRange === range
                  ? "bg-card text-foreground shadow-sm shadow-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range === "all" ? "All Time" : range === "30d" ? "30 Days" : "7 Days"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : data ? (
          <>
            <StatCard icon={Puzzle} label="Total Puzzles" value={data.totalPuzzles}
              gradient="from-violet-600 to-violet-500 shadow-violet-500/25"
              sub={data.totalPuzzles === 1 ? "1 puzzle created" : `${data.totalPuzzles} puzzles created`} />
            <StatCard icon={Globe} label="Published" value={data.publishedPuzzles}
              gradient="from-emerald-600 to-emerald-500 shadow-emerald-500/25"
              sub={data.totalPuzzles > 0 ? `${Math.round((data.publishedPuzzles / data.totalPuzzles) * 100)}% of total` : "No puzzles yet"}
              trend={data.totalPuzzles > 0 ? { up: data.publishedPuzzles / data.totalPuzzles >= 0.5, label: `${data.totalPuzzles - data.publishedPuzzles} unpublished` } : undefined} />
            <StatCard icon={Trophy} label="Total Completions" value={data.totalCompletions}
              gradient="from-amber-600 to-amber-500 shadow-amber-500/25"
              sub={data.totalPuzzles > 0 ? `${data.totalPuzzles > 0 ? (data.totalCompletions / data.totalPuzzles).toFixed(1) : 0} avg per puzzle` : "No plays yet"} />
            <StatCard icon={Layers} label="Categories" value={data.categories.length}
              gradient="from-sky-600 to-sky-500 shadow-sky-500/25"
              sub={data.categories.length === 1 ? "1 category" : `${data.categories.length} categories`} />
            <StatCard icon={Crown} label="Premium Members" value={data.premiumUsers}
              gradient="from-amber-600 to-amber-500 shadow-amber-500/25"
              sub={data.premiumUsers > 0 ? `${(data.premiumConversionRate * 100).toFixed(1)}% conversion` : "No premium users yet"} />
          </>
        ) : null}
      </div>

      {/* Premium Revenue */}
      {!loading && data && data.premiumUsers > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3">
          <StatCard icon={DollarSign} label="Est. Monthly Revenue" value={data.estimatedMonthlyRevenue}
            gradient="from-emerald-600 to-emerald-500 shadow-emerald-500/25"
            sub="Based on current premium members" />
          <StatCard icon={Users} label="Premium Conversion" value={Math.round(data.premiumConversionRate * 100)}
            gradient="from-amber-600 to-amber-500 shadow-amber-500/25"
            sub={`${data.premiumUsers} premium · ${(data.premiumConversionRate * 100).toFixed(0)}% of users`} />
        </div>
      )}

      {/* Charts Row */}
      <div className="mb-8 grid gap-5 md:grid-cols-2">
        {loading ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : data ? (
          <>
            <ChartCard title="Puzzles by Type" subtitle="Distribution across puzzle formats"
              data={data.byType} valueKey="count"
              labelFormatter={(k) => TYPE_LABELS[k] || k} />
            <StatusPieCard title="Puzzle Status" subtitle="Review workflow breakdown"
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
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
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
