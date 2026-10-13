"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Bookmark, Check, Clock3, Compass, Layers3, Search, Sparkles, X } from "lucide-react";
import { getDiscoverLessons } from "@/services/discover-service";
import { useUserStore } from "@/store/user-store";
import { EMPTY_DISCOVER_PROGRESS, useDiscoverStore } from "@/store/discover-store";
import { DiscoverImage } from "./DiscoverImage";
import { discoverAccent } from "./discover-theme";
import { cn } from "@/lib/utils";
import type { DiscoverLesson } from "@/types/discover";

export function DiscoverLibrary() {
  const [lessons, setLessons] = useState<DiscoverLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All topics");
  const [savedOnly, setSavedOnly] = useState(false);
  const reader = useUserStore((state) => state.userId) || "guest";
  const progress = useDiscoverStore((state) => state.readers[reader]);
  const update = useDiscoverStore((state) => state.update);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    getDiscoverLessons().then((data) => {
      if (!cancelled) { setLessons(data); setLoading(false); }
    }).catch((cause: unknown) => {
      if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not load Discover."); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [retry]);

  const categories = ["All topics", ...Array.from(new Set(lessons.map((lesson) => lesson.category)))];
  const featured = lessons.find((lesson) => lesson.featured) ?? lessons[0];
  const query = search.trim().toLowerCase();
  const filtered = lessons.filter((lesson) =>
    (category === "All topics" || lesson.category === category) &&
    (!savedOnly || progress?.[lesson.id]?.bookmarked) &&
    (!query || `${lesson.title} ${lesson.summary} ${lesson.category}`.toLowerCase().includes(query)),
  );
  const showFeatured = featured && category === "All topics" && !query && !savedOnly;

  return (
    <div className="mx-auto min-w-0 max-w-7xl px-4 py-7 [overflow-wrap:anywhere] sm:px-7 sm:py-10 lg:px-10">
      <motion.header initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.23em] text-primary sm:text-xs">
            <Compass className="size-4" aria-hidden="true" /> Feed your curiosity
          </p>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Discover<span className="text-primary">.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Big ideas. Beautifully explained. See how the world works, one discovery at a time.</p>
        </div>
        <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 lg:flex">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span>
          <div><p className="text-xs font-semibold">A little wiser, every day</p><p className="mt-1 text-[11px] text-muted-foreground">Made for your curious side</p></div>
        </div>
      </motion.header>

      {loading ? <DiscoverLoading /> : error ? (
        <div role="alert" className="rounded-3xl border border-border bg-card p-8 text-center">
          <Compass className="mx-auto mb-4 size-9 text-primary" /><h2 className="text-xl font-semibold">A small detour</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button onClick={() => { setLoading(true); setError(null); setRetry((value) => value + 1); }} className="mt-5 min-h-11 min-w-11 max-w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Try again</button>
        </div>
      ) : (
        <>
          {showFeatured && (
            <motion.section initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }} aria-label="Featured discovery"
              className="group relative mb-9 overflow-hidden rounded-[2rem] border border-primary/15 bg-card shadow-xl shadow-primary/5">
              <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                <div className="relative z-10 flex min-w-0 flex-col items-start p-6 sm:p-9 lg:pr-5">
                  <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> In the spotlight</span>
                  <p className="mb-2 min-w-0 max-w-full text-xs font-medium text-muted-foreground">{featured.category} <span className="mx-1.5 opacity-40">/</span> A visual exploration</p>
                  <h2 className="w-full min-w-0 max-w-md font-heading text-3xl font-bold leading-[1.13] tracking-tight sm:text-4xl xl:text-[2.8rem]">{featured.title}</h2>
                  <p className="mt-4 w-full min-w-0 max-w-sm text-sm leading-7 text-muted-foreground">{featured.summary}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {featured.durationMinutes} min</span><span className="flex items-center gap-1.5"><Layers3 className="size-3.5" /> {featured.steps.length} visual steps</span><span>{featured.difficulty === "intermediate" ? "Deep Dive" : "Beginner"}</span></div>
                  <Link href={`/discover/${featured.id}`} className="mt-7 inline-flex min-h-12 min-w-11 max-w-full items-center gap-5 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                    <span className="min-w-0">{progress?.[featured.id]?.completed ? "Explore again" : progress?.[featured.id]?.stepIndex ? "Continue exploring" : "Let's explore"}</span><ArrowRight className="size-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-1" />
                  </Link>
                </div>
                <Link href={`/discover/${featured.id}`} aria-label={`Explore ${featured.title}`} className="relative block min-h-64 min-w-0 overflow-hidden bg-muted lg:min-h-[440px]">
                  <DiscoverImage src={featured.coverImageUrl} alt={featured.coverImageAlt} className="h-full min-h-64 w-full transition-transform duration-700 motion-safe:group-hover:scale-[1.025] lg:min-h-[440px]" priority />
                  <div className="absolute bottom-4 left-4 right-4 flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card/90 px-4 py-3 text-xs backdrop-blur-xl sm:bottom-5 sm:left-5 sm:right-5"><span className="flex min-w-0 items-center gap-2"><Layers3 className="size-4 shrink-0 text-primary" /><span className="min-w-0">Look closer. It all connects.</span></span><ArrowRight className="size-4 shrink-0 text-primary" /></div>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border bg-muted/25 px-6 py-4 sm:px-9">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">The journey</span>
                {featured.steps.slice(0, 3).map((step, index) => <span key={step.id} className="flex min-w-0 max-w-full items-center gap-2 text-xs"><span className="shrink-0 font-mono text-primary/70">0{index + 1}</span><span className="min-w-0 max-w-36 truncate">{step.title}</span></span>)}
                {featured.steps.length > 3 && <span className="text-xs text-muted-foreground">+{featured.steps.length - 3} more</span>}
              </div>
            </motion.section>
          )}

          <section aria-labelledby="discover-explore-heading" className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">There’s more to everything</p><h2 id="discover-explore-heading" className="font-heading text-2xl font-bold tracking-tight">Find your next “aha”.</h2></div>
              <div className="relative w-full min-w-0 xl:w-72"><Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground" /><input type="search" aria-label="Search discoveries" placeholder="What makes you curious?" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-border bg-card pl-11 pr-4 text-base outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10 sm:text-sm" /></div>
            </div>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={cn("min-h-11 min-w-11 max-w-full whitespace-normal rounded-full border px-4 py-2 text-xs font-semibold transition", category === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground")}>{item}</button>)}
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              <button onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly} className={cn("flex min-h-11 min-w-11 max-w-full items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition", savedOnly ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground")}><Bookmark className={cn("size-3.5 shrink-0", savedOnly && "fill-current")} /> Saved</button>
              <span aria-live="polite" className="ml-auto py-2 text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "exploration" : "explorations"}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
                <Compass className="mx-auto mb-4 size-9 text-primary/60" />
                <h3 className="text-lg font-semibold">{savedOnly ? "Your curiosity collection starts here" : lessons.length ? "A different path to explore" : "New discoveries are on their way"}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{savedOnly ? "Save an exploration with the bookmark button and come back to it whenever you like." : lessons.length ? "Try another topic or a broader search." : "Come back soon for a fresh look at how the world works."}</p>
                {!!lessons.length && <button onClick={() => { setSearch(""); setCategory("All topics"); setSavedOnly(false); }} className="mt-5 inline-flex min-h-11 min-w-11 max-w-full items-center gap-2 text-sm font-semibold text-primary"><X className="size-4 shrink-0" /> Clear filters</button>}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((lesson, index) => {
                  const saved = progress?.[lesson.id] ?? EMPTY_DISCOVER_PROGRESS;
                  const current = saved.lessonUpdatedAt === lesson.updatedAt;
                  const complete = current && saved.completed;
                  const inProgress = current && !complete && saved.stepIndex > 0;
                  const accent = discoverAccent[lesson.accent];
                  return (
                    <motion.article key={lesson.id} initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.07, 0.3) }}
                      className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card transition duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
                      <Link href={`/discover/${lesson.id}`} tabIndex={-1} aria-hidden="true" className="block overflow-hidden"><DiscoverImage src={lesson.coverImageUrl} alt="" className="aspect-[3/2] transition-transform duration-500 motion-safe:group-hover:scale-[1.035]" /></Link>
                      <button type="button" aria-label={saved.bookmarked ? `Unsave ${lesson.title}` : `Save ${lesson.title}`} aria-pressed={saved.bookmarked} onClick={() => update(reader, lesson.id, { bookmarked: !saved.bookmarked })} className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-md transition motion-safe:hover:scale-105 hover:text-primary"><Bookmark className={cn("size-4", saved.bookmarked && "fill-primary text-primary")} /></button>
                      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                         <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2"><span className={cn("min-w-0 max-w-full rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]", accent.tint, accent.text)}>{lesson.category}</span>{complete ? <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-success"><Check className="size-3" /> Explored</span> : inProgress ? <span className="shrink-0 text-[10px] font-semibold text-primary">In progress</span> : <span className="text-[10px] text-muted-foreground">{lesson.difficulty === "intermediate" ? "Deep Dive" : "Beginner"}</span>}</div>
                        <h3 className="min-w-0 font-heading text-xl font-bold leading-snug tracking-tight"><Link href={`/discover/${lesson.id}`} className="transition hover:text-primary">{lesson.title}</Link></h3>
                        <p className="mt-2 min-w-0 line-clamp-2 text-xs leading-6 text-muted-foreground">{lesson.summary}</p>
                        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-5"><span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3 shrink-0" /> {lesson.durationMinutes} min</span><span>{lesson.steps.length} steps</span></span><Link href={`/discover/${lesson.id}`} aria-label={`${inProgress ? "Continue" : "Explore"} ${lesson.title}`} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted transition group-hover:bg-primary group-hover:text-primary-foreground"><ArrowRight className="size-4" /></Link></div>
                        {inProgress && <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted" aria-label={`${saved.stepIndex + 1} of ${lesson.steps.length} steps`}><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (saved.stepIndex + 1) / lesson.steps.length * 100)}%` }} /></div>}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="mt-9 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/40 px-5 py-6 text-center sm:flex-row sm:text-left"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-4" /></span><div className="sm:ml-2"><p className="text-sm font-semibold">Understanding is its own reward.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Take your time. Follow the details. Let something new click.</p></div><ArrowDown className="ml-auto hidden size-4 -rotate-90 text-primary/40 sm:block" /></div>
        </>
      )}
    </div>
  );
}

export function DiscoverLoading() {
  return <div role="status" aria-label="Loading discoveries" className="space-y-6"><div className="h-96 animate-pulse rounded-[2rem] border border-border bg-muted/60 motion-reduce:animate-none" /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl border border-border bg-muted/60 motion-reduce:animate-none" />)}</div><span className="sr-only">Loading discoveries…</span></div>;
}
