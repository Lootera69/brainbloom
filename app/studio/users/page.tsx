"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ArrowLeft, Users, Activity, Crown, TrendingUp, Search, ArrowUpDown,
  Flame, Heart, Gem, Trophy, Zap, Globe, Clock, Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getStudioSession, isAdmin } from "@/services/puzzle-service";
import { getAvatarById } from "@/components/avatars/avatar-svgs";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLoadingTimeout } from "@/hooks/use-loading-timeout";
import { ErrorFallback } from "@/components/error-fallback";
import { cn } from "@/lib/utils";
import type { AdminUserSummary } from "@/app/api/admin/users/route";

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
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
  icon: React.ComponentType<{ className?: string }>;
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

function SkeletonUserCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/50 bg-white/60 p-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted/50" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function UserCard({
  user,
  delay = 0,
  expanded,
  onToggle,
}: {
  user: AdminUserSummary;
  delay?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const avatar = user.avatarId ? getAvatarById(user.avatarId) : null;
  const AvatarComponent = avatar?.component;
  const isPremium = user.tier === "premium";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.04] dark:border-white/[0.06] dark:bg-white/[0.03]"
    >
      {isPremium && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 opacity-70" />
      )}

      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={cn(
            "flex size-12 items-center justify-center rounded-full overflow-hidden",
            isPremium
              ? "ring-2 ring-amber-500/50 shadow-md shadow-amber-500/20"
              : "ring-2 ring-border/50",
          )}>
            {AvatarComponent ? (
              <AvatarComponent size={48} />
            ) : user.photoURL ? (
              <img src={user.photoURL} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 to-violet-500/20">
                <span className="text-lg font-bold text-primary">
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {isPremium && (
            <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
              <Crown className="size-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{user.displayName || "Anonymous"}</p>
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
              isPremium
                ? "bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-600 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
            )}>
              {isPremium ? "PRO" : "FREE"}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground/60">
            {user.email || "No email"}
          </p>
        </div>

        {/* Stats row */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <Zap className="size-3 text-primary" />
            <span className="font-medium tabular-nums">Lv.{user.level}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <Flame className="size-3 text-orange-500" />
            <span className="font-medium tabular-nums">{user.streak}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <Trophy className="size-3 text-amber-500" />
            <span className="font-medium tabular-nums">{user.puzzlesCompleted}</span>
          </div>
        </div>

        {/* Time ago */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-xs text-muted-foreground/60">{timeAgo(user.lastActiveDate)}</p>
        </div>

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-muted-foreground/40"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-4 pb-4 pt-3 dark:border-white/[0.06]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DetailStat icon={Zap} label="XP" value={fmtNum(user.xp)} color="text-primary" />
                <DetailStat icon={Flame} label="Streak" value={`${user.streak} days`} color="text-orange-500" />
                <DetailStat icon={Heart} label="Hearts" value={`${user.hearts}`} color="text-rose-500" />
                <DetailStat icon={Gem} label="Gems" value={fmtNum(user.gems)} color="text-cyan-500" />
                <DetailStat icon={Trophy} label="Puzzles" value={`${user.puzzlesCompleted}`} color="text-amber-500" />
                <DetailStat icon={TrendingUp} label="Weekly XP" value={fmtNum(user.weeklyXp)} color="text-emerald-500" />
                <DetailStat icon={Activity} label="Active Days" value={`${user.activeDaysCount}`} color="text-blue-500" />
                <DetailStat icon={Globe} label="Timezone" value={user.timeZone?.split("/").pop()?.replace("_", " ") ?? "Unknown"} color="text-violet-500" />
              </div>
              {user.dailyPuzzleStreak > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
                  <Flame className="size-3.5" />
                  <span className="font-medium">Daily puzzle streak: {user.dailyPuzzleStreak} days</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
      <Icon className={`size-3.5 ${color}`} />
      <div>
        <p className="text-[10px] text-muted-foreground/50">{label}</p>
        <p className="text-xs font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

type SortKey = "xp" | "level" | "streak" | "lastActive" | "puzzlesCompleted";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "xp", label: "XP" },
  { value: "level", label: "Level" },
  { value: "streak", label: "Streak" },
  { value: "lastActive", label: "Last Active" },
  { value: "puzzlesCompleted", label: "Puzzles" },
];

function UsersContent() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "premium">("all");
  const [sortKey, setSortKey] = useState<SortKey>("xp");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const timedOut = useLoadingTimeout(10000);

  useEffect(() => {
    const code = getStudioSession();
    if (!code || !isAdmin()) {
      router.replace("/studio");
      return;
    }

    fetch(`/api/admin/users?code=${encodeURIComponent(code)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!data.ok) throw new Error(data.error || "Failed to load");
        setUsers(data.users);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.displayName.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
      );
    }

    if (tierFilter !== "all") {
      result = result.filter((u) => u.tier === tierFilter);
    }

    result = [...result].sort((a, b) => {
      if (sortKey === "lastActive") {
        const aTime = a.lastActiveDate ? new Date(a.lastActiveDate).getTime() : 0;
        const bTime = b.lastActiveDate ? new Date(b.lastActiveDate).getTime() : 0;
        return sortAsc ? aTime - bTime : bTime - aTime;
      }
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [users, search, tierFilter, sortKey, sortAsc]);

  const totalXP = users.reduce((s, u) => s + u.xp, 0);
  const activeToday = users.filter((u) => u.lastActiveDate === today).length;
  const premiumCount = users.filter((u) => u.tier === "premium").length;
  const avgXP = users.length ? Math.round(totalXP / users.length) : 0;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonUserCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4">
        <ErrorFallback
          error={new Error(error)}
          onRetry={() => { setError(null); setLoading(true); window.location.reload(); }}
        />
      </div>
    );
  }

  if (timedOut && users.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4">
        <ErrorFallback
          error={new Error("Timed out loading users.")}
          onRetry={() => { setLoading(true); window.location.reload(); }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-4">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => router.push("/studio")}
          className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-violet-500 opacity-15 blur-md" />
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/20 dark:shadow-primary/10">
            <Users className="size-4 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-bold">Users</h1>
          <p className="text-xs text-muted-foreground/60">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Total" value={users.length} gradient="from-indigo-500 to-violet-500" delay={0.1} />
        <StatCard icon={Activity} label="Active Today" value={activeToday} gradient="from-emerald-500 to-teal-500" delay={0.15} />
        <StatCard icon={Crown} label="Premium" value={premiumCount} gradient="from-amber-500 to-orange-500" delay={0.2} />
        <StatCard icon={TrendingUp} label="Avg XP" value={avgXP} sub={`Total: ${fmtNum(totalXP)}`} gradient="from-rose-500 to-pink-500" delay={0.25} />
      </div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center gap-2"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-border/50 bg-white/60 pl-9 pr-3 text-sm backdrop-blur-xl placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 dark:border-white/[0.06] dark:bg-white/[0.03]"
          />
        </div>

        {/* Tier filter */}
        <div className="flex rounded-xl bg-muted/50 p-0.5">
          {(["all", "free", "premium"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                tierFilter === t
                  ? "bg-card text-foreground shadow-sm shadow-primary/5"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : t === "premium" ? "Pro" : "Free"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-0.5">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-7 rounded-lg bg-transparent px-2 text-xs font-medium text-muted-foreground focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <ArrowUpDown className="size-3.5" />
          </button>
        </div>
      </motion.div>

      {/* User list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
                <Users className="size-7 text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground/60">
                {users.length === 0 ? "No users yet" : "No users match your filters"}
              </p>
            </motion.div>
          ) : (
            filtered.map((user, i) => (
              <UserCard
                key={user.uid}
                user={user}
                delay={Math.min(0.05 * i, 0.4)}
                expanded={expandedUid === user.uid}
                onToggle={() => setExpandedUid(expandedUid === user.uid ? null : user.uid)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground/40"
        >
          Showing {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
        </motion.p>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export default function UsersPage() {
  return (
    <ErrorBoundary>
      <UsersContent />
    </ErrorBoundary>
  );
}
