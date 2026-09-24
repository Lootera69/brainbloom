"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, Search, Pencil, CheckCircle2, AlertTriangle,
  Cloud, HardDrive, Loader2, Star, Circle, HelpCircle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getStudioRole } from "@/services/puzzle-service";
import {
  getEventConfig, isPublished, saveEventConfig, clearEventConfigCache,
} from "@/services/event-service";
import {
  isActiveToday, nextOccurrence, perYearMissing, scheduleSummary,
  type EventTheme,
} from "@/lib/events/event-theme";
import { EventEditorDialog } from "@/components/studio/EventEditorDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonCard } from "@/components/ui/skeleton";

type Filter = "all" | "hero" | "accent" | "attention";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - a.getTime()) / 86_400_000);
}
function relLabel(d: Date | null): string {
  const n = daysUntil(d);
  if (n === null) return "";
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 30) return `in ${n} days`;
  const months = Math.round(n / 30);
  return `in ~${months} mo`;
}
function accentRgba(argb: number, alpha: number): string {
  const r = (argb >>> 16) & 0xff;
  const g = (argb >>> 8) & 0xff;
  const b = argb & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Events that need a person's attention before they'll fire correctly. */
function needsAttention(e: EventTheme, year: number): boolean {
  return perYearMissing(e.schedule, year) || perYearMissing(e.schedule, year + 1);
}

export default function StudioEventsPage() {
  const role = getStudioRole();
  const isAdmin = role === "admin";

  const [events, setEvents] = useState<EventTheme[]>([]);
  const [initial, setInitial] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EventTheme | null>(null);

  const year = new Date().getFullYear();

  useEffect(() => {
    let alive = true;
    (async () => {
      clearEventConfigCache();
      const [cfg, pub] = await Promise.all([getEventConfig(), isPublished()]);
      if (!alive) return;
      setEvents(cfg.events);
      setUpdatedAt(cfg.updatedAt);
      setPublished(pub);
      setInitial(JSON.stringify(cfg.events));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const dirty = useMemo(
    () => !loading && JSON.stringify(events) !== initial,
    [events, initial, loading],
  );

  // Admins can publish when there are edits to push, or when the calendar has
  // never been published yet (so the seeded 60 can go live without any edit).
  const canPublish = isAdmin && !loading && (dirty || !published);

  const sorted = useMemo(() => {
    const withNext = events.map((e) => ({ e, next: nextOccurrence(e), active: isActiveToday(e) }));
    withNext.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const an = a.next ? a.next.getTime() : Infinity;
      const bn = b.next ? b.next.getTime() : Infinity;
      return an - bn;
    });
    return withNext;
  }, [events]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(({ e }) => {
      if (filter === "hero" && e.tier !== "hero") return false;
      if (filter === "accent" && e.tier !== "accent") return false;
      if (filter === "attention" && !needsAttention(e, year)) return false;
      if (q && !(`${e.title} ${e.id} ${e.short}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [sorted, filter, query, year]);

  const heroCount = events.filter((e) => e.tier === "hero").length;
  const questionCount = events.filter((e) => e.question).length;
  const attentionCount = events.filter((e) => needsAttention(e, year)).length;

  const applyEdit = (updated: EventTheme) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditing(null);
    toast.success(`Updated “${updated.title}”. Publish to go live.`);
  };

  const doPublish = async () => {
    setSaving(true);
    const res = await saveEventConfig(events, true);
    setSaving(false);
    setConfirmOpen(false);
    if (res.ok) {
      setInitial(JSON.stringify(events));
      setPublished(true);
      setUpdatedAt(Date.now());
      toast.success("Published to all devices.");
    } else {
      toast.error(res.error ?? "Publish failed.");
    }
  };

  const FILTERS: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: events.length },
    { id: "hero", label: "Hero", count: heroCount },
    { id: "accent", label: "Accent", count: events.length - heroCount },
    { id: "attention", label: "Needs dates", count: attentionCount },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl p-4 pb-24 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#8b5cf6]">
            <CalendarDays className="size-5 text-white" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-bold">Upcoming Moments</h1>
            <p className="text-xs text-muted-foreground">
              Seasonal event themes the app surfaces on curated days.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill icon={<Star className="size-3 text-amber-500" />} label="Hero" value={heroCount} />
          <Pill icon={<HelpCircle className="size-3 text-primary" />} label="Questions" value={questionCount} />
          {attentionCount > 0 && (
            <Pill icon={<AlertTriangle className="size-3 text-destructive" />} label="Need dates" value={attentionCount} />
          )}
          <span className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}>
            {published ? <Cloud className="size-3" /> : <HardDrive className="size-3" />}
            {published
              ? `Published${updatedAt ? " · " + new Date(updatedAt).toLocaleDateString() : ""}`
              : "Not published"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id ? "bg-primary text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={cn("rounded-full px-1.5 text-[10px]", filter === f.id ? "bg-white/20" : "bg-background/60")}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search moments…"
            className="w-full rounded-xl border bg-muted/30 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 sm:w-56"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          No moments match.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ e, next, active }) => {
            const attention = needsAttention(e, year);
            const accent = e.lightPalette.accent;
            return (
              <motion.button
                key={e.id}
                layout
                onClick={() => setEditing(e)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/60 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg",
                  active && "ring-2 ring-primary/40",
                )}
                style={{ borderColor: accentRgba(accent, active ? 0.6 : 0.18) }}
              >
                {/* Accent wash */}
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-60"
                  style={{ background: `linear-gradient(to bottom, ${accentRgba(accent, 0.14)}, transparent)` }}
                />

                <div className="relative flex items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{
                      background: accentRgba(accent, 0.16),
                      border: `1px solid ${accentRgba(accent, 0.32)}`,
                    }}
                  >
                    {e.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{e.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{scheduleSummary(e.schedule)}</p>
                  </div>
                  <Pencil className="size-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                </div>

                {/* Badges */}
                <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
                  {e.tier === "hero" ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <Star className="size-2.5" /> Hero
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Circle className="size-2.5" /> Accent
                    </span>
                  )}
                  {e.question ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <HelpCircle className="size-2.5" /> Question
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground/70">
                      No question
                    </span>
                  )}
                  {attention && (
                    <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                      <AlertTriangle className="size-2.5" /> set dates
                    </span>
                  )}
                </div>

                {/* Footer date */}
                <div className="relative mt-3 flex items-center justify-between border-t pt-2.5">
                  {active ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Zap className="size-3" /> Live now
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <CalendarDays className="size-3 text-muted-foreground/50" />
                      {fmtDate(next)}
                    </span>
                  )}
                  {!active && <span className="text-[11px] text-muted-foreground">{relLabel(next)}</span>}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Publish bar */}
      {canPublish && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-xl md:left-72"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-3">
            <p className="text-xs text-muted-foreground">
              {dirty
                ? "Unpublished changes — the app won't see them until you publish."
                : `Not published yet — publish to send all ${events.length} moments (and their questions) to every device.`}
            </p>
            <div className="flex gap-2">
              {dirty && (
                <button
                  onClick={() => setEvents(JSON.parse(initial) as EventTheme[])}
                  className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Discard
                </button>
              )}
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {dirty ? "Publish changes" : "Publish moments"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {!isAdmin && (
        <p className="mt-6 rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
          You&apos;re viewing as a contributor. Only admins can edit and publish moments.
        </p>
      )}

      <EventEditorDialog
        open={!!editing}
        event={editing}
        canEdit={isAdmin}
        onClose={() => setEditing(null)}
        onSave={applyEdit}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doPublish}
        title="Publish moments?"
        description={`This writes all ${events.length} moments (and their questions) to every device. The app replaces its built-in calendar with this one.`}
        confirmLabel="Publish"
        confirmVariant="success"
        loading={saving}
      />
    </div>
  );
}

function Pill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {icon}
      <span className="font-bold text-foreground">{value}</span>
      {label}
    </span>
  );
}
