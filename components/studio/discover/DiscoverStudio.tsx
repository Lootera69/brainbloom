"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Clock3, Compass, Download, Eye, EyeOff, FileText, Globe2, Layers3, Loader2, Pencil, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDiscoverLesson, getStudioDiscoverLessons, importStarterDiscoverLessons, saveDiscoverLesson } from "@/services/discover-service";
import { discoverLessonInputSchema, isDiscoverImageUrl } from "@/lib/discover/validation";
import type { DiscoverLesson } from "@/types/discover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { accentClasses, inputClass, primaryButton, secondaryButton, StudioDiscoverError, StudioDiscoverLoading } from "./discover-studio-ui";

type Filter = "all" | "published" | "draft";

export function DiscoverStudio() {
  const [lessons, setLessons] = useState<DiscoverLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<DiscoverLesson | null>(null);

  useEffect(() => {
    let active = true;
    getStudioDiscoverLessons().then((data) => { if (active) { setLessons(data); setLoading(false); } }).catch((err) => {
      if (active) { setError(err instanceof Error ? err.message : "Your lessons could not be loaded."); setLoading(false); }
    });
    return () => { active = false; };
  }, [attempt]);

  const published = lessons.filter((lesson) => lesson.published).length;
  const visible = useMemo(() => lessons.filter((lesson) => {
    if (filter === "published" && !lesson.published) return false;
    if (filter === "draft" && lesson.published) return false;
    return `${lesson.title} ${lesson.summary} ${lesson.category}`.toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => b.updatedAt - a.updatedAt), [lessons, query, filter]);

  async function togglePublished(lesson: DiscoverLesson) {
    const { id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = lesson;
    const result = discoverLessonInputSchema.safeParse({ ...input, published: !lesson.published });
    if (!result.success) { toast.error(`Finish this lesson in the editor before publishing. ${result.error.issues[0]?.message ?? ""}`); return; }
    setBusyId(id);
    try {
      const saved = await saveDiscoverLesson(result.data, id, lesson.updatedAt);
      setLessons((current) => current.map((item) => item.id === id ? saved : item));
      toast.success(saved.published ? "Lesson published to Discover" : "Lesson moved to drafts");
    } catch (err) { toast.error(err instanceof Error ? err.message : "The lesson could not be updated."); }
    finally { setBusyId(null); }
  }

  async function removeLesson() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteDiscoverLesson(deleting.id, deleting.updatedAt);
      setLessons((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null); toast.success("Lesson deleted");
    } catch (err) { toast.error(err instanceof Error ? err.message : "The lesson could not be deleted."); }
    finally { setBusyId(null); }
  }

  async function importStarters() {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importStarterDiscoverLessons();
      toast.success(result.imported || result.repaired ? `Added ${result.imported}, repaired ${result.repaired} starter lessons` : "All starter lessons are already in Studio");
      setAttempt((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The starter lessons could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <StudioDiscoverLoading />;
  if (error) return <StudioDiscoverError message={error} onRetry={() => { setError(""); setLoading(true); setAttempt((n) => n + 1); }} />;

  return <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-8 sm:pt-9">
    <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" /> Studio <span className="mx-1 text-border">/</span> Discover</div>
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-primary/10 bg-gradient-to-br from-indigo-600/[0.10] via-sky-500/[0.05] to-card p-6 sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 size-[420px] rounded-full border border-primary/10 p-14"><div className="size-full rounded-full border border-primary/10 p-14"><div className="size-full rounded-full bg-primary/5" /></div></div>
      <div className="relative max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary"><Compass className="size-3.5" /> The art of explaining</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Turn curiosity into<br /><span className="text-primary">understanding.</span></h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">Build visual journeys through the ideas behind everyday things. One image, one clear explanation, one discovery at a time.</p>
         <div className="mt-6 flex flex-wrap gap-3">
           <Link href="/studio/discover/create" className={cn(primaryButton)}><Plus className="size-4" /> Create a lesson <ArrowRight className="ml-2 size-4" /></Link>
           <button type="button" onClick={() => void importStarters()} disabled={importing} className={cn(secondaryButton, "min-h-11")}><Download className="size-4" /> {importing ? "Importing…" : "Sync starter catalogue"}</button>
         </div>
      </div>
      <div className="relative mt-8 flex flex-wrap gap-5 border-t border-primary/10 pt-5 text-sm sm:gap-8">
        {[{ icon: BookOpen, value: lessons.length, label: "lessons" }, { icon: Globe2, value: published, label: "published" }, { icon: FileText, value: lessons.length - published, label: "drafts" }].map(({ icon: Icon, value, label }) => <div key={label} className="flex items-center gap-2"><Icon className="size-4 text-primary/70" /><span className="font-semibold tabular-nums">{value}</span><span className="text-muted-foreground">{label}</span></div>)}
      </div>
    </section>

    <div className="mb-6 mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-fit rounded-xl border border-border/60 bg-muted/50 p-1" role="group" aria-label="Filter lessons">
        {(["all", "published", "draft"] as const).map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn("min-h-10 rounded-lg px-4 text-xs font-semibold capitalize transition", filter === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{value === "all" ? "All lessons" : value === "draft" ? "Drafts" : "Published"}</button>)}
      </div>
      <div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><input aria-label="Search Discover lessons" placeholder="Search your collection…" value={query} onChange={(e) => setQuery(e.target.value)} className={cn(inputClass, "pl-10")} /></div>
    </div>

    {visible.length === 0 ? <div className="rounded-3xl border border-dashed border-primary/20 bg-card/50 px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10"><Sparkles className="size-7 text-primary" /></div>
      <h2 className="font-heading text-xl font-semibold">{lessons.length ? "No lessons match just yet" : "Your first discovery starts here"}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{lessons.length ? "Try another search or view the full collection." : "Explain a fascinating concept with a sequence of images and short, thoughtful chapters."}</p>
       {lessons.length ? <button className={cn(secondaryButton, "mt-6")} onClick={() => { setFilter("all"); setQuery(""); }}>Clear filters</button> : <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/studio/discover/create" className={cn(primaryButton)}><Plus className="size-4" /> Create your first lesson</Link><button type="button" onClick={() => void importStarters()} disabled={importing} className={cn(secondaryButton, "min-h-11")}><Download className="size-4" /> {importing ? "Importing…" : "Sync starter catalogue"}</button></div>}
    </div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((lesson) => <article key={lesson.id} className="group overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm transition hover:border-primary/25 hover:shadow-lg hover:shadow-primary/[0.04]">
        <Link href={`/studio/discover/${lesson.id}`} aria-label={`Edit ${lesson.title}`} className={cn("relative block aspect-[16/9] overflow-hidden bg-gradient-to-br", accentClasses[lesson.accent])}>
          {lesson.coverImageUrl && isDiscoverImageUrl(lesson.coverImageUrl) ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lesson.coverImageUrl} alt={lesson.coverImageAlt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          </> : <div className="flex h-full items-center justify-center"><Compass className="size-16 text-primary/25" /></div>}
          <div className="absolute left-4 top-4 flex gap-2"><span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md", lesson.published ? "border-emerald-300/30 bg-emerald-950/85 text-emerald-100" : "border-white/20 bg-slate-950/70 text-white")}><span className={cn("size-1.5 rounded-full", lesson.published ? "bg-emerald-400" : "bg-amber-300")} />{lesson.published ? "Published" : "Draft"}</span>{lesson.featured && <span className="flex items-center rounded-full border border-white/20 bg-slate-950/70 px-2 text-amber-300" aria-label="Featured"><Star className="size-3 fill-current" /></span>}</div>
        </Link>
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{lesson.category || "Uncategorized"}</p>
          <Link href={`/studio/discover/${lesson.id}`} className="mt-2 block font-heading text-lg font-semibold leading-snug tracking-tight hover:text-primary">{lesson.title}</Link>
          <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{lesson.summary || "Your story is taking shape. Add a short introduction to invite readers in."}</p>
          <div className="mt-4 flex gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{lesson.durationMinutes} min</span><span className="flex items-center gap-1.5"><Layers3 className="size-3.5" />{lesson.steps.length} chapters</span></div>
          <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
            <Link href={`/studio/discover/${lesson.id}`} className={cn(secondaryButton, "min-h-10 flex-1 px-3 text-xs")}><Pencil className="size-3.5" /> Edit lesson</Link>
            <button disabled={!!busyId} onClick={() => void togglePublished(lesson)} title={lesson.published ? "Move to drafts" : "Publish lesson"} aria-label={`${lesson.published ? "Unpublish" : "Publish"} ${lesson.title}`} className={cn(secondaryButton, "size-10 min-h-10 p-0")}>{busyId === lesson.id ? <Loader2 className="size-4 animate-spin" /> : lesson.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            <button disabled={!!busyId} onClick={() => setDeleting(lesson)} aria-label={`Delete ${lesson.title}`} className={cn(secondaryButton, "size-10 min-h-10 border-transparent p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}><Trash2 className="size-4" /></button>
          </div>
        </div>
      </article>)}
    </div>}
    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5 text-primary" /> Only published lessons appear in Discover.</div>

    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busyId) setDeleting(null); }}>
      <DialogContent showCloseButton={!busyId} className="rounded-3xl p-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Trash2 className="size-5" /></div>
        <DialogTitle className="font-heading text-xl font-semibold">Delete this lesson?</DialogTitle>
        <DialogDescription>“{deleting?.title}” and its chapters will be removed from your collection. This cannot be undone.</DialogDescription>
        <div className="flex justify-end gap-3"><button className={secondaryButton} disabled={!!busyId} onClick={() => setDeleting(null)}>Keep lesson</button><button disabled={!!busyId} className={cn(primaryButton, "bg-destructive text-white shadow-none")} onClick={() => void removeLesson()}>{busyId && <Loader2 className="size-4 animate-spin" />} Delete lesson</button></div>
      </DialogContent>
    </Dialog>
  </main>;
}
