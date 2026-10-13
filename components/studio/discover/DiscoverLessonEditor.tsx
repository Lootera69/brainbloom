"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle2, Circle, Clock3, Eye, FileText, Image as ImageIcon, Layers3, Lightbulb, Loader2, Plus, Rocket, Save, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { getStudioDiscoverLesson, saveDiscoverLesson } from "@/services/discover-service";
import { DISCOVER_ACCENTS, DISCOVER_MAX_STEPS, discoverLessonInputSchema, isDiscoverImageUrl } from "@/lib/discover/validation";
import { SEED_DISCOVER_LESSONS } from "@/lib/discover/seed";
import type { DiscoverLesson, DiscoverLessonInput, DiscoverStep } from "@/types/discover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DiscoverReader } from "@/components/discover/DiscoverReader";
import { cn } from "@/lib/utils";
import { DiscoverImageField } from "./DiscoverImageField";
import { accentClasses, accentDots, inputClass, primaryButton, secondaryButton, StudioDiscoverError, StudioDiscoverLoading } from "./discover-studio-ui";

function blankStep(): DiscoverStep {
  return { id: `chapter-${crypto.randomUUID()}`, title: "", body: "", imageUrl: "", imageAlt: "", caption: "", keyFact: "" };
}

function blankLesson(): DiscoverLessonInput {
  return { title: "", summary: "", category: "Science & technology", coverImageUrl: "", coverImageAlt: "", accent: "sky", difficulty: "beginner", durationMinutes: 5, steps: [{ id: "chapter-1", title: "", body: "", imageUrl: "", imageAlt: "", caption: "", keyFact: "" }], takeaways: [""], published: false, featured: false };
}

function lessonInput(lesson: DiscoverLesson): DiscoverLessonInput {
  return { title: lesson.title, summary: lesson.summary, category: lesson.category, coverImageUrl: lesson.coverImageUrl, coverImageAlt: lesson.coverImageAlt, accent: lesson.accent, difficulty: lesson.difficulty, durationMinutes: lesson.durationMinutes, steps: lesson.steps, takeaways: lesson.takeaways, published: lesson.published, featured: lesson.featured };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="block text-sm font-semibold">{label}{hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}</span>{children}</label>;
}

function EditorSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">{title}</h2><p className="mb-7 mt-2 text-xs leading-6 text-muted-foreground">{description}</p><div className="space-y-6">{children}</div></section>;
}

export function DiscoverEditLoader({ id }: { id: string }) {
  const [lesson, setLesson] = useState<DiscoverLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getStudioDiscoverLesson(id).then((found) => {
      if (!active) return;
      if (found) setLesson(found); else setError("This lesson no longer exists. Return to the Discover collection to choose another lesson.");
      setLoading(false);
    }).catch((err) => { if (active) { setError(err instanceof Error ? err.message : "This lesson could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, [id, attempt]);
  if (loading) return <StudioDiscoverLoading />;
  if (error || !lesson) return <StudioDiscoverError message={error} onRetry={() => { setError(""); setLoading(true); setAttempt((value) => value + 1); }} />;
  return <DiscoverLessonEditor key={lesson.id} initialLesson={lesson} />;
}

export function DiscoverLessonEditor({ initialLesson }: { initialLesson?: DiscoverLesson }) {
  const router = useRouter();
  const [form, setForm] = useState<DiscoverLessonInput>(() => initialLesson ? lessonInput(initialLesson) : blankLesson());
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialLesson ? lessonInput(initialLesson) : blankLesson()));
  const [recordId, setRecordId] = useState(initialLesson?.id);
  const [savedAt, setSavedAt] = useState(initialLesson?.updatedAt ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [activePanel, setActivePanel] = useState("overview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removingStep, setRemovingStep] = useState<DiscoverStep | null>(null);
  const [saveError, setSaveError] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const dirty = JSON.stringify(form) !== baseline;
  const busy = saving || uploads > 0;
  const { confirmLeave, LeaveWarningModal } = useUnsavedChanges(dirty || busy);
  const stepIndex = form.steps.findIndex((step) => step.id === activePanel);
  const currentStep = form.steps[stepIndex];
  const uploadBusyChanged = useCallback((started: boolean) => setUploads((count) => Math.max(0, count + (started ? 1 : -1))), []);

  // The shared warning also covers navigation through the Studio sidebar.
  useEffect(() => {
    if (!dirty && !busy) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname === window.location.pathname && target.search === window.location.search) return;
      event.preventDefault(); event.stopPropagation();
      if (busy) { toast.info("Wait for the current save or upload to finish."); return; }
      confirmLeave(() => router.push(`${target.pathname}${target.search}${target.hash}`));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, busy, confirmLeave, router]);

  const update = <K extends keyof DiscoverLessonInput>(key: K, value: DiscoverLessonInput[K]) => {
    setForm((current) => ({ ...current, [key]: value })); setSaveError(""); setIssues([]);
  };
  const updateStep = <K extends keyof DiscoverStep>(key: K, value: DiscoverStep[K]) => {
    setForm((current) => ({ ...current, steps: current.steps.map((step) => step.id === activePanel ? { ...step, [key]: value } : step) })); setSaveError(""); setIssues([]);
  };
  const moveStep = (index: number, direction: -1 | 1) => {
    const steps = [...form.steps];
    [steps[index], steps[index + direction]] = [steps[index + direction], steps[index]];
    update("steps", steps);
  };
  const addStep = () => {
    if (form.steps.length >= DISCOVER_MAX_STEPS) return;
    const step = blankStep(); update("steps", [...form.steps, step]); setActivePanel(step.id);
  };

  const checklist = useMemo(() => [
    { label: "A clear title & introduction", complete: !!form.title.trim() && !!form.summary.trim() && !!form.category.trim() },
    { label: "Cover image with a description", complete: isDiscoverImageUrl(form.coverImageUrl) && !!form.coverImageAlt.trim() },
    { label: "Every chapter explained & illustrated", complete: form.steps.length > 0 && form.steps.every((step) => step.title.trim() && step.body.trim() && isDiscoverImageUrl(step.imageUrl) && step.imageAlt.trim()) },
    { label: "Something to take away", complete: form.takeaways.some((takeaway) => takeaway.trim()) },
  ], [form]);
  const completeCount = checklist.filter((item) => item.complete).length;

  const save = useCallback(async (publish: boolean) => {
    if (busy) return;
    setSaveError(""); setIssues([]);
    const candidate = { ...form, published: publish, takeaways: form.takeaways.filter((takeaway) => takeaway.trim()) };
    const result = discoverLessonInputSchema.safeParse(candidate);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => {
        const path = issue.path;
        if (path[0] === "steps" && typeof path[1] === "number") return `Chapter ${path[1] + 1}: ${issue.message}`;
        return issue.message;
      });
      setIssues([...new Set(messages)]); setSaveError(publish ? "A few finishing touches before this lesson goes live." : "Check these details before saving your draft.");
      toast.error(publish ? "Finish the highlighted lesson details before publishing." : "Add the missing details to save your draft."); return;
    }
    setSaving(true);
    try {
      const saved = await saveDiscoverLesson(result.data, recordId, savedAt);
      const savedInput = lessonInput(saved);
      setForm(savedInput); setBaseline(JSON.stringify(savedInput)); setRecordId(saved.id); setSavedAt(saved.updatedAt);
      toast.success(publish ? "Your lesson is live in Discover" : "Draft saved");
      if (!recordId) router.replace(`/studio/discover/${saved.id}`);
    } catch (err) { setSaveError(err instanceof Error ? err.message : "Your lesson could not be saved. Your edits are still here; please try again."); }
    finally { setSaving(false); }
  }, [busy, form, recordId, router, savedAt]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(form.published); }
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [save, form.published]);

  const previewLesson: DiscoverLesson = { ...form, id: recordId ?? "preview", createdAt: initialLesson?.createdAt ?? 0, updatedAt: savedAt };

  return <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-7 sm:pt-8">
    <div className="mb-6 flex items-center justify-between gap-3">
      <button disabled={busy} onClick={() => confirmLeave(() => router.push("/studio/discover"))} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary disabled:opacity-40"><ArrowLeft className="size-4" /> Discover collection</button>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold", form.published ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}><span className={cn("size-1.5 rounded-full", form.published ? "bg-emerald-500" : "bg-amber-500")} />{form.published ? "Published" : "Draft lesson"}</span>
    </div>
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Discover / Lesson builder</p><h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{initialLesson ? "Shape the next discovery." : "Make a little wonder."}</h1><p className="mt-2 text-sm text-muted-foreground">A visual story that makes a complex idea click.</p></div>
      <button type="button" onClick={() => setPreviewOpen(true)} className={secondaryButton}><Eye className="size-4" /> Preview lesson</button>
    </header>

    {!recordId && !dirty && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-500/15 bg-sky-500/[0.05] p-4"><div className="flex items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400"><Rocket className="size-5" /></div><div><p className="text-sm font-semibold">Start with something that takes flight.</p><p className="mt-1 text-xs text-muted-foreground">Explore a ready-to-edit jet engine lesson.</p></div></div><button disabled={busy} type="button" onClick={() => { const example = SEED_DISCOVER_LESSONS.find((lesson) => lesson.id === "how-a-jet-engine-works") ?? SEED_DISCOVER_LESSONS[0]; if (example) setForm({ ...lessonInput(example), published: false }); }} className={cn(secondaryButton, "min-h-10 text-xs")}>Use starter example <ArrowRight className="size-3.5" /></button></div>}

    {saveError && <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-5" role="alert"><p className="text-sm font-semibold text-destructive">{saveError}</p>{issues.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">{issues.slice(0, 8).map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}{issues.length > 8 && <li>Finish the remaining chapters, then try again.</li>}</ul>}</div>}

    <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_230px]">
      <aside className="min-w-0 lg:sticky lg:top-6">
        <p className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground lg:block">Your story</p>
        <nav aria-label="Lesson sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-card/70 p-2 lg:flex-col lg:overflow-visible">
          <button disabled={busy} onClick={() => setActivePanel("overview")} aria-current={activePanel === "overview" ? "step" : undefined} className={cn("flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold transition disabled:opacity-50", activePanel === "overview" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}><BookOpen className="size-4 shrink-0" /><span>Overview</span></button>
          {form.steps.map((step, index) => <button key={step.id} disabled={busy} onClick={() => setActivePanel(step.id)} aria-current={activePanel === step.id ? "step" : undefined} className={cn("flex min-h-12 max-w-52 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-xs font-medium transition disabled:opacity-50 lg:max-w-none", activePanel === step.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px]", activePanel === step.id ? "bg-primary/15" : "bg-muted")}>{String(index + 1).padStart(2, "0")}</span><span className="truncate">{step.title || `Chapter ${index + 1}`}</span></button>)}
          <button disabled={busy || form.steps.length >= DISCOVER_MAX_STEPS} onClick={addStep} className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-40"><Plus className="size-4" /> Add chapter</button>
          <div className="hidden border-t border-border/60 lg:block" />
          <button disabled={busy} onClick={() => setActivePanel("takeaways")} aria-current={activePanel === "takeaways" ? "step" : undefined} className={cn("flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold transition disabled:opacity-50", activePanel === "takeaways" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><Lightbulb className="size-4" /> The takeaways</button>
        </nav>
        <p className="mt-3 hidden px-3 text-[11px] leading-5 text-muted-foreground lg:block">{form.steps.length} / {DISCOVER_MAX_STEPS} chapters<br />Short chapters make room for curiosity.</p>
      </aside>

      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {activePanel === "overview" && <>
          <EditorSection eyebrow="The invitation" title="Open a door to curiosity." description="Tell readers what they’ll understand by the end. Lead with a question, a surprise, or something they see every day.">
            <Field label="Lesson title"><input value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={120} placeholder="How does a jet engine actually work?" className={cn(inputClass, "font-medium")} /></Field>
            <Field label="A little introduction" hint={`${form.summary.length}/400`}><textarea value={form.summary} onChange={(e) => update("summary", e.target.value)} maxLength={400} rows={3} placeholder="A journey from a breath of air to thousands of pounds of thrust." className={cn(inputClass, "resize-y leading-6")} /></Field>
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Category"><input list="discover-categories" value={form.category} onChange={(e) => update("category", e.target.value)} maxLength={50} placeholder="Science & technology" className={inputClass} /><datalist id="discover-categories">{["Science & technology", "Nature", "Space", "The human body", "Everyday wonders", "History & culture"].map((category) => <option key={category} value={category} />)}</datalist></Field><Field label="Reading time" hint="minutes"><input type="number" min={1} max={60} value={form.durationMinutes} onChange={(e) => update("durationMinutes", Number(e.target.value))} className={inputClass} /></Field></div>
            <Field label="Depth of discovery"><select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as DiscoverLessonInput["difficulty"])} className={inputClass}><option value="beginner">Beginner — a fresh perspective</option><option value="intermediate">Deep Dive — connect the moving parts</option></select></Field>
          </EditorSection>
          <EditorSection eyebrow="First impressions" title="Set the scene." description="Choose an inviting cover. Wide images work best; keep essential details near the center.">
            <DiscoverImageField id="cover" label="Cover image" imageUrl={form.coverImageUrl} imageAlt={form.coverImageAlt} onImageChange={(value) => update("coverImageUrl", value)} onAltChange={(value) => update("coverImageAlt", value)} onBusyChange={uploadBusyChanged} />
            <div><p className="mb-3 text-sm font-semibold">A color for the journey</p><div className="flex flex-wrap gap-2" role="group" aria-label="Lesson accent color">{DISCOVER_ACCENTS.map((accent) => <button type="button" key={accent} aria-pressed={form.accent === accent} onClick={() => update("accent", accent)} className={cn("flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs capitalize transition", form.accent === accent ? "border-primary/40 bg-primary/5 font-semibold" : "border-border/60 hover:bg-muted")}><span className={cn("flex size-3.5 items-center justify-center rounded-full", accentDots[accent])}>{form.accent === accent && <Check className="size-2.5 text-white" />}</span>{accent}</button>)}</div></div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4"><input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" /><span><span className="flex items-center gap-2 text-sm font-semibold"><Star className="size-3.5 text-amber-500" /> Feature this lesson</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Give this discovery a spotlight in the collection.</span></span></label>
          </EditorSection>
          <button type="button" onClick={() => form.steps.length ? setActivePanel(form.steps[0].id) : addStep()} className={cn(secondaryButton, "w-full")}>Build the first chapter <ArrowRight className="size-4" /></button>
        </>}

        {currentStep && <>
          <EditorSection eyebrow={`Chapter ${String(stepIndex + 1).padStart(2, "0")} / ${String(form.steps.length).padStart(2, "0")}`} title="One idea. A little clearer." description="Pair a meaningful picture with a short explanation. Build on what the reader has just discovered.">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-2"><span className="pl-2 text-xs font-medium text-muted-foreground">Chapter order</span><div className="flex gap-1"><button type="button" disabled={stepIndex === 0} onClick={() => moveStep(stepIndex, -1)} aria-label="Move chapter earlier" className={cn(secondaryButton, "size-9 min-h-9 px-0")}><ArrowUp className="size-4" /></button><button type="button" disabled={stepIndex === form.steps.length - 1} onClick={() => moveStep(stepIndex, 1)} aria-label="Move chapter later" className={cn(secondaryButton, "size-9 min-h-9 px-0")}><ArrowDown className="size-4" /></button><button type="button" onClick={() => setRemovingStep(currentStep)} aria-label="Remove this chapter" className={cn(secondaryButton, "ml-2 size-9 min-h-9 border-transparent px-0 text-destructive hover:bg-destructive/10")}><Trash2 className="size-4" /></button></div></div>
            <Field label="Chapter title"><input value={currentStep.title} onChange={(e) => updateStep("title", e.target.value)} maxLength={100} placeholder="First, take a deep breath" className={inputClass} /></Field>
            <Field label="The explanation" hint={`${currentStep.body.length}/4000`}><textarea value={currentStep.body} onChange={(e) => updateStep("body", e.target.value)} maxLength={4000} rows={7} placeholder="Explain this part in your own words. Use short paragraphs and make the connection to the image clear." className={cn(inputClass, "resize-y leading-7")} /></Field>
            <DiscoverImageField key={currentStep.id} id={currentStep.id} label="Chapter image" imageUrl={currentStep.imageUrl} imageAlt={currentStep.imageAlt} onImageChange={(value) => updateStep("imageUrl", value)} onAltChange={(value) => updateStep("imageAlt", value)} onBusyChange={uploadBusyChanged} />
            <Field label="Image caption" hint="optional"><input value={currentStep.caption ?? ""} onChange={(e) => updateStep("caption", e.target.value)} maxLength={240} placeholder="A little context beneath the image" className={inputClass} /></Field>
            <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4"><Field label="The ‘aha!’ moment" hint="optional"><textarea value={currentStep.keyFact ?? ""} onChange={(e) => updateStep("keyFact", e.target.value)} maxLength={350} rows={2} placeholder="One memorable detail worth pausing for." className={cn(inputClass, "resize-y leading-6")} /></Field></div>
          </EditorSection>
          <div className="flex flex-wrap gap-3"><button onClick={() => setActivePanel(stepIndex ? form.steps[stepIndex - 1].id : "overview")} className={cn(secondaryButton, "flex-1")}><ArrowLeft className="size-4" /> Previous</button><button onClick={() => setActivePanel(stepIndex < form.steps.length - 1 ? form.steps[stepIndex + 1].id : "takeaways")} className={cn(secondaryButton, "flex-1")}>{stepIndex < form.steps.length - 1 ? "Next chapter" : "The takeaways"}<ArrowRight className="size-4" /></button></div>
        </>}

        {activePanel === "takeaways" && <EditorSection eyebrow="The lasting idea" title="What stays with them?" description="Leave readers with a few clear ideas they can carry into the world. Keep each takeaway short and specific.">
          <div className="space-y-4">{form.takeaways.map((takeaway, index) => <div key={index} className="flex items-start gap-3"><span className="mt-3 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] text-primary">{String(index + 1).padStart(2, "0")}</span><textarea aria-label={`Takeaway ${index + 1}`} value={takeaway} onChange={(e) => update("takeaways", form.takeaways.map((item, i) => i === index ? e.target.value : item))} maxLength={300} rows={2} placeholder="A simple idea worth remembering…" className={cn(inputClass, "resize-y leading-6")} /><button type="button" aria-label={`Remove takeaway ${index + 1}`} onClick={() => update("takeaways", form.takeaways.filter((_, i) => i !== index))} className="mt-2 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div>)}</div>
          <button type="button" disabled={form.takeaways.length >= 8} className={cn(secondaryButton, "w-full border-dashed")} onClick={() => update("takeaways", [...form.takeaways, ""])}><Plus className="size-4" /> Add a takeaway <span className="font-normal text-muted-foreground">{form.takeaways.length}/8</span></button>
          <div className="flex items-start gap-3 rounded-2xl bg-primary/[0.05] p-5"><Sparkles className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-xs leading-6 text-muted-foreground">A good discovery changes how someone sees an ordinary thing. A great takeaway helps them notice it tomorrow.</p></div>
          <button type="button" className={cn(primaryButton, "w-full")} onClick={() => setPreviewOpen(true)}><Eye className="size-4" /> Experience your lesson</button>
        </EditorSection>}
      </fieldset>

      <aside className="hidden space-y-5 xl:sticky xl:top-6 xl:block">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"><Eye className="size-3" /> The first impression</div>
          <div className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br", accentClasses[form.accent])}>{isDiscoverImageUrl(form.coverImageUrl) ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.coverImageUrl} alt={form.coverImageAlt || "Lesson cover preview"} className="h-full w-full object-cover" />
          </> : <ImageIcon className="size-10 text-primary/25" />}</div>
          <div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary">{form.category || "Your category"}</p><h3 className="mt-2 break-words font-heading text-base font-semibold leading-snug">{form.title || "A world waiting to be understood."}</h3><p className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted-foreground">{form.summary || "Your introduction invites someone to see things a little differently."}</p><div className="mt-4 flex gap-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3" />{form.durationMinutes} min</span><span className="flex items-center gap-1"><Layers3 className="size-3" />{form.steps.length} chapters</span></div><button onClick={() => setPreviewOpen(true)} className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary/5 text-xs font-semibold text-primary transition hover:bg-primary/10">Read the story <ArrowRight className="size-3.5" /></button></div>
        </div>
        <div className="rounded-2xl border border-border/60 p-4"><div className="flex items-center justify-between text-xs font-semibold"><span>Ready for discovery</span><span className="font-mono text-primary">{completeCount}/4</span></div><div className="mb-5 mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeCount * 25}%` }} /></div><div className="space-y-3">{checklist.map((item) => <div key={item.label} className="flex items-start gap-2 text-[11px] leading-5">{item.complete ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />}<span className={item.complete ? "text-foreground" : "text-muted-foreground"}>{item.label}</span></div>)}</div></div>
      </aside>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:left-64"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7">
      <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-medium">{busy ? <Loader2 className="size-3.5 animate-spin text-primary" /> : dirty ? <span className="size-1.5 rounded-full bg-amber-500" /> : <Check className="size-3.5 text-emerald-500" />}{uploads ? "Uploading image…" : saving ? "Saving your discovery…" : dirty ? "Unsaved changes" : recordId ? "All changes saved" : "Ready when you are"}</p><p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">{form.published ? "Saved changes update the published lesson." : "Drafts are only visible in Studio."}</p></div>
      <div className="flex items-center gap-2"><button type="button" disabled={busy} onClick={() => void save(form.published)} className={cn(secondaryButton, "px-3 sm:px-4")}><Save className="size-4" /><span>{form.published ? "Save changes" : "Save draft"}</span></button>{!form.published && <button type="button" disabled={busy} onClick={() => void save(true)} className={cn(primaryButton, "px-3 sm:px-5")}><Rocket className="size-4" /><span>Publish<span className="hidden sm:inline"> lesson</span></span></button>}</div>
    </div></div>

    {LeaveWarningModal}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="flex max-h-[92dvh] w-[min(100%-1rem,960px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[960px]">
        <div className="border-b border-border/60 px-6 py-5 pr-14"><DialogTitle className="flex items-center gap-2 text-sm font-semibold"><Eye className="size-4 text-primary" /> Reader preview</DialogTitle><DialogDescription className="mt-1 text-xs">Explore your lesson as a reader. Your progress is not recorded.</DialogDescription></div>
        <div className="overflow-y-auto overscroll-contain"><DiscoverReader lesson={previewLesson} preview /></div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!removingStep} onOpenChange={(open) => { if (!open) setRemovingStep(null); }}>
      <DialogContent className="rounded-3xl"><div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10"><FileText className="size-5 text-destructive" /></div><DialogTitle className="text-xl font-semibold">Remove this chapter?</DialogTitle><DialogDescription>{removingStep?.title ? `“${removingStep.title}”` : "This chapter"} will be removed from your lesson. The remaining chapters will keep their order.</DialogDescription><div className="flex justify-end gap-3"><button onClick={() => setRemovingStep(null)} className={secondaryButton}>Keep chapter</button><button onClick={() => { update("steps", form.steps.filter((step) => step.id !== removingStep?.id)); setRemovingStep(null); setActivePanel("overview"); }} className={cn(primaryButton, "bg-destructive text-white shadow-none")}>Remove chapter</button></div></DialogContent>
    </Dialog>
  </main>;
}
