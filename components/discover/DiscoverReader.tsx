"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bookmark, Check, CheckCircle2, Clock3, Compass, Layers3, Lightbulb, RotateCcw, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/user-store";
import { EMPTY_DISCOVER_PROGRESS, useDiscoverStore } from "@/store/discover-store";
import type { DiscoverLesson } from "@/types/discover";
import { cn } from "@/lib/utils";
import { DiscoverImage } from "./DiscoverImage";
import { discoverAccent } from "./discover-theme";

export function DiscoverReader({ lesson, preview = false }: { lesson: DiscoverLesson; preview?: boolean }) {
  const focused = !preview;
  const reader = useUserStore((state) => state.userId) || "guest";
  const saved = useDiscoverStore((state) => state.readers[reader]?.[lesson.id]) ?? EMPTY_DISCOVER_PROGRESS;
  const update = useDiscoverStore((state) => state.update);
  const current = !preview && saved.lessonUpdatedAt === lesson.updatedAt;
  const [stepIndex, setStepIndex] = useState(current ? Math.min(saved.stepIndex, Math.max(0, lesson.steps.length - 1)) : 0);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const illustration = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const step = lesson.steps[Math.min(stepIndex, lesson.steps.length - 1)];
  const accent = discoverAccent[lesson.accent];

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, lesson.steps.length - 1));
    setStepIndex(next);
    setFinished(false);
    if (!preview) update(reader, lesson.id, { stepIndex: next, lessonUpdatedAt: lesson.updatedAt, completed: current && saved.completed });
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      const stacked = window.matchMedia("(max-width: 1023px)").matches;
      const target = stacked ? illustration.current : heading.current;
      target?.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: stacked ? "start" : "nearest" });
    });
  }

  function finish() {
    setFinished(true);
    if (!preview) update(reader, lesson.id, { stepIndex: lesson.steps.length - 1, completed: true, lessonUpdatedAt: lesson.updatedAt });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }

  async function share() {
    const url = `${window.location.origin}/discover/${lesson.id}`;
    try {
      if (navigator.share) await navigator.share({ title: lesson.title, text: lesson.summary, url });
      else { await navigator.clipboard.writeText(url); toast.success("Discovery link copied", { position: "top-center" }); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Could not share. You can copy the page address instead.", { position: "top-center" });
    }
  }

  return (
    <div className={cn("mx-auto min-w-0 w-full max-w-7xl [overflow-wrap:anywhere]", !preview && "px-4 py-6 sm:px-7 sm:py-8 lg:px-10")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {preview ? <span className="flex items-center gap-2 text-xs font-semibold text-primary"><Compass className="size-4" /> Learner preview</span> : <Link href="/discover" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary"><ArrowLeft className="size-4" /> Back to Discover</Link>}
        <div className="flex items-center gap-2">
          <button disabled={preview} aria-label={saved.bookmarked ? "Remove from saved discoveries" : "Save this discovery"} aria-pressed={!preview && saved.bookmarked} onClick={() => update(reader, lesson.id, { bookmarked: !saved.bookmarked })} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-primary disabled:opacity-40"><Bookmark className={cn("size-4", !preview && saved.bookmarked && "fill-primary text-primary")} /></button>
          <button disabled={preview} aria-label="Share this discovery" onClick={() => void share()} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-primary disabled:opacity-40"><Share2 className="size-4" /></button>
        </div>
      </div>

      <header className="mb-7 max-w-3xl">
        {!focused && <p className={cn("mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]", accent.text)}><span className={cn("size-1.5 shrink-0 rounded-full", accent.dot)} /><span className="min-w-0 max-w-full">{lesson.category}</span><span className="mx-1 text-muted-foreground/40">/</span> A closer look</p>}
        <h1 className="font-heading text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl">{lesson.title}</h1>
        {!focused && <><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{lesson.summary}</p><div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {lesson.durationMinutes} min</span><span className="flex items-center gap-1.5"><Layers3 className="size-3.5" /> {lesson.steps.length} steps</span><span className="capitalize">{lesson.difficulty}</span>{current && saved.completed && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" /> Explored</span>}</div></>}
      </header>

      {!step ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Add a step to see your exploration come to life.</div> : (
        <>
          {!focused && <nav aria-label="Exploration steps" className="mb-6 flex flex-wrap gap-2">
            {lesson.steps.map((item, index) => <button key={item.id} aria-current={!finished && stepIndex === index ? "step" : undefined} onClick={() => goTo(index)} className={cn("flex min-h-11 min-w-11 max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition", !finished && stepIndex === index ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground")}><span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px]", index < stepIndex || finished ? "bg-success/10 text-success" : "bg-muted")}>{index < stepIndex || finished ? <Check className="size-3" /> : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 max-w-40 truncate">{item.title}</span></button>)}
          </nav>}

          {finished ? (
            <motion.section key="complete" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card p-6 sm:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative mx-auto max-w-2xl">
                <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-7" /></span>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Curiosity, rewarded</p>
                <h2 ref={heading} tabIndex={-1} className="font-heading text-3xl font-bold tracking-tight outline-none sm:text-4xl">Now you see how it works.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">You explored {lesson.title.charAt(0).toLowerCase() + lesson.title.slice(1)}. Here’s what to take with you.</p>
                <ol className="mt-7 space-y-3">{lesson.takeaways.filter(Boolean).map((takeaway, index) => <li key={index} className="flex items-start gap-4 rounded-2xl border border-border bg-muted/30 p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">0{index + 1}</span><p className="min-w-0 pt-0.5 text-sm leading-6">{takeaway}</p></li>)}</ol>
                <div className="mt-8 flex flex-wrap gap-3">{!preview && <Link href="/discover" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Keep discovering <ArrowRight className="size-4" /></Link>}<button onClick={() => goTo(0)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold"><RotateCcw className="size-4" /> Explore again</button></div>
                {!preview && <p className="mt-5 text-[11px] text-muted-foreground">Your reading progress is saved on this device.</p>}
              </div>
            </motion.section>
          ) : (
            <motion.section key={step.id} initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} aria-label={`Step ${stepIndex + 1}: ${step.title}`} className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-lg shadow-primary/5">
              <div className="grid lg:grid-cols-[1.15fr_1fr]">
                <figure ref={illustration} className="flex min-w-0 scroll-mt-4 flex-col border-b border-border bg-muted/30 lg:border-b-0 lg:border-r">
                  <DiscoverImage src={step.imageUrl} alt={step.imageAlt} className="aspect-[3/2] w-full lg:flex-1" priority />
                  <figcaption className="flex items-start gap-3 px-5 py-4 sm:px-7"><span className="shrink-0 pt-0.5 font-mono text-[10px] text-primary">FIG. {String(stepIndex + 1).padStart(2, "0")}</span><span className="min-w-0 text-xs leading-5 text-muted-foreground">{step.caption || step.imageAlt}</span></figcaption>
                </figure>
                <div className="flex min-w-0 flex-col p-6 sm:p-8 lg:p-9">
                  {!focused && <div className="mb-5 flex items-center justify-between"><span className={cn("rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em]", accent.tint, accent.text)}>Follow the idea</span><span className="font-mono text-xs text-muted-foreground"><span className="font-semibold text-foreground">{String(stepIndex + 1).padStart(2, "0")}</span> / {String(lesson.steps.length).padStart(2, "0")}</span></div>}
                  <h2 ref={heading} tabIndex={-1} className="font-heading text-2xl font-bold leading-tight tracking-tight outline-none sm:text-3xl">{step.title}</h2>
                  <div className="mt-5 space-y-4 text-sm leading-[1.95] text-muted-foreground">{step.body.split(/\n\s*\n|\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                  {step.keyFact && <aside className="mt-6 rounded-2xl border border-primary/10 bg-primary/5 p-4"><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary"><Lightbulb className="size-3.5" /> The aha moment</p><p className="text-xs leading-6 text-foreground/85">{step.keyFact}</p></aside>}
                </div>
              </div>
            </motion.section>
          )}

          {!finished && (focused ? <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
            <button aria-label="Previous step" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-30"><ArrowLeft className="size-4" /><span>Previous</span></button>
            <button onClick={stepIndex === lesson.steps.length - 1 ? finish : () => goTo(stepIndex + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition hover:brightness-110 sm:px-5">{stepIndex === lesson.steps.length - 1 ? "Finish" : "Next"}<ArrowRight className="size-4" /></button>
          </div> : <div className="sticky bottom-0 z-20 mt-5 rounded-2xl border border-border bg-card/95 p-3 shadow-lg shadow-background/50 backdrop-blur-xl sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <button aria-label="Previous step" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-30"><ArrowLeft className="size-4" /><span className="hidden sm:inline">Previous</span></button>
              <div className="min-w-0 flex-1 sm:max-w-56"><div className="mb-2 flex justify-between gap-2 text-[10px] text-muted-foreground"><span className="min-w-0">Step {stepIndex + 1} of {lesson.steps.length}</span><span className="hidden sm:inline">{Math.round((stepIndex + 1) / lesson.steps.length * 100)}%</span></div><div role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={lesson.steps.length} aria-valuenow={stepIndex + 1} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(stepIndex + 1) / lesson.steps.length * 100}%` }} /></div></div>
              <button onClick={stepIndex === lesson.steps.length - 1 ? finish : () => goTo(stepIndex + 1)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition hover:brightness-110 sm:px-5">{stepIndex === lesson.steps.length - 1 ? "Finish discovery" : "Next step"}<ArrowRight className="size-4" /></button>
            </div>
          </div>)}
        </>
      )}
      {!finished && !preview && !focused && <p className="mt-5 text-center text-[10px] leading-5 text-muted-foreground">A little understanding goes a long way. Your place is saved on this device.</p>}
    </div>
  );
}
