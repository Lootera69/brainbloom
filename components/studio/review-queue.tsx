"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ClipboardCheck, Loader2, MessageSquare, Play, RefreshCw, X, XCircle } from "lucide-react";
import { PuzzlePlay } from "@/features/puzzle/components/PuzzlePlay";
import { stripHtml } from "@/lib/utils";
import { isAwaitingReview, loadReviewQueue, reviewSubmittedPuzzle, type ReviewDecision } from "@/services/studio-review";
import type { Puzzle } from "@/types/puzzle";

function ReadonlyText({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3><p className="whitespace-pre-wrap text-sm leading-relaxed">{stripHtml(text.replace(/<\/(?:p|div)>|<br\s*\/?>/gi, "\n"))}</p></div>;
}

function SubmissionContent({ puzzle }: { puzzle: Puzzle }) {
  return <div className="space-y-5">
    <ReadonlyText label="Question" text={puzzle.question} />
    {puzzle.imageUrl && <Image src={puzzle.imageUrl} alt="Submitted puzzle illustration" width={960} height={540} unoptimized className="max-h-72 w-full rounded-xl object-contain" />}
    {puzzle.choices.length > 0 && <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choices</h3><ol className="list-inside list-decimal space-y-1 text-sm">{puzzle.choices.map((choice, index) => <li key={index}>{stripHtml(choice)}</li>)}</ol></div>}
    <ReadonlyText label="Correct answer" text={puzzle.correctAnswer} />
    <ReadonlyText label="Accepted answers" text={puzzle.acceptedAnswers?.join(", ")} />
    <ReadonlyText label="Correct explanation" text={puzzle.correctExplanation} />
    <ReadonlyText label="Incorrect explanation" text={puzzle.incorrectExplanation} />
    <ReadonlyText label="Hints" text={puzzle.hintText} />
    <ReadonlyText label="Lesson" text={puzzle.lessonContent} />
    {puzzle.lessonImageUrl && <Image src={puzzle.lessonImageUrl} alt="Submitted lesson illustration" width={960} height={540} unoptimized className="max-h-72 w-full rounded-xl object-contain" />}
    {puzzle.cipherData && <><ReadonlyText label="Cipher type" text={puzzle.cipherData.cipherType} /><ReadonlyText label="Encoded message" text={puzzle.cipherData.encodedMessage} /><ReadonlyText label="Cipher hint" text={puzzle.cipherData.hint} /></>}
    {puzzle.crosswordData && <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crossword clues and answers</h3><ul className="space-y-2 text-sm">{puzzle.crosswordData.clues.map((clue, index) => <li key={index}>{clue.number} {clue.direction}: {stripHtml(clue.clue)} — <strong>{clue.answer}</strong></li>)}</ul></div>}
    {puzzle.sudokuData && <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sudoku solution</h3><div className="grid max-w-72 grid-cols-9 overflow-hidden rounded-lg border">{puzzle.sudokuData.solution.map((value, index) => <span key={index} className="border p-1 text-center text-xs">{value}</span>)}</div></div>}
    {puzzle.storyData && <>{puzzle.storyData.questionSlides.map((slide, index) => <div key={`question-${index}`} className="space-y-2"><ReadonlyText label={`Story question ${index + 1}`} text={slide.content} />{slide.imageUrl && <Image src={slide.imageUrl} alt={`Story question ${index + 1}`} width={960} height={540} unoptimized className="max-h-72 w-full rounded-xl object-contain" />}</div>)}{puzzle.storyData.answerSlides.map((slide, index) => <div key={`answer-${index}`} className="space-y-2"><ReadonlyText label={`Story answer ${index + 1}`} text={slide.content} />{slide.imageUrl && <Image src={slide.imageUrl} alt={`Story answer ${index + 1}`} width={960} height={540} unoptimized className="max-h-72 w-full rounded-xl object-contain" />}</div>)}</>}
  </div>;
}

export function ReviewQueue() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const selected = puzzles.find((puzzle) => puzzle.id === selectedId);

  useEffect(() => {
    let active = true;
    loadReviewQueue().then((data) => { if (active) setPuzzles(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load submissions."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    if (loading || busy) return;
    setLoading(true); setError(""); setSelectedId(null); setNote(""); setPreview(false);
    try { setPuzzles(await loadReviewQueue()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load submissions."); }
    finally { setLoading(false); }
  }

  async function review(decision: ReviewDecision) {
    if (!selected || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await reviewSubmittedPuzzle(selected, decision, note);
      setPuzzles((current) => current.map((puzzle) => puzzle.id === updated.id ? updated : puzzle).filter(isAwaitingReview));
      setNote(""); setPreview(false);
      setNotice(`${stripHtml(selected.title)}: ${decision === "approved" ? "approved for an administrator to publish" : decision === "rejected" ? "returned to the contributor with your feedback" : "marked for discussion"}.`);
      if (!isAwaitingReview(updated)) setSelectedId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your review could not be saved. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardCheck className="size-6 text-primary" />Review queue</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review submitted puzzles and leave feedback. Approved puzzles stay unpublished until an administrator publishes them.</p></div><button disabled={loading || busy} onClick={refresh} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-success/10 p-3 text-sm text-success">{notice}</p>}
    {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading submissions…</p> : puzzles.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center"><CheckCircle2 className="mx-auto mb-3 size-8 text-primary" /><h2 className="font-semibold">No submissions waiting for review</h2><p className="mt-2 text-sm text-muted-foreground">New submissions and puzzles needing discussion appear here.</p></div> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
      <section aria-label="Submitted puzzles" className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{puzzles.length} submissions</p>{puzzles.map((puzzle) => <button key={puzzle.id} disabled={busy} onClick={() => { setSelectedId(puzzle.id); setNote(""); setPreview(false); setError(""); }} aria-pressed={selectedId === puzzle.id} className={`w-full rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${selectedId === puzzle.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}><p className="font-semibold">{stripHtml(puzzle.title)}</p><p className="mt-1 text-xs text-muted-foreground">{puzzle.type} · {puzzle.category} · {puzzle.difficulty}</p><span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs ${puzzle.reviewStatus === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"}`}>{puzzle.reviewStatus === "pending" ? "Pending review" : "Needs discussion"}</span></button>)}</section>
      {selected ? <section aria-label="Submission review" className="space-y-6 rounded-2xl border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{stripHtml(selected.title)}</h2><p className="mt-1 text-xs text-muted-foreground">{selected.xpReward} XP · Submitted {new Date(selected.createdAt).toLocaleDateString()}</p></div><button onClick={() => setPreview((current) => !current)} disabled={busy} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs disabled:opacity-50">{preview ? <X className="size-3.5" /> : <Play className="size-3.5" />}{preview ? "Close preview" : "Play preview"}</button></div>
        {preview && <div className="rounded-xl border bg-background p-4"><p className="mb-3 text-xs text-muted-foreground">Preview only. No player rewards are awarded.</p><PuzzlePlay key={selected.id} puzzle={selected} isRepeat onComplete={() => setPreview(false)} /></div>}
        <SubmissionContent puzzle={selected} />
        {selected.reviewNote && !selected.reviewComments?.some((comment) => comment.text === selected.reviewNote) && <ReadonlyText label="Earlier review note" text={selected.reviewNote} />}
        {(selected.reviewComments?.length ?? 0) > 0 && <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Review discussion</h3>{selected.reviewComments?.map((comment, index) => <div key={index} className="rounded-xl bg-muted/40 p-3"><p className="whitespace-pre-wrap text-sm">{stripHtml(comment.text)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(comment.timestamp).toLocaleString()}</p></div>)}</div>}
        <div className="space-y-3 border-t pt-4"><label htmlFor="review-note" className="block text-sm font-semibold">Review note</label><textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} maxLength={2000} rows={4} placeholder="Explain any corrections or discussion needed." className="w-full resize-y rounded-xl border bg-background p-3 text-sm" /><p className="text-xs text-muted-foreground">A note is required to reject a submission or request discussion.</p>
          <div className="flex flex-wrap gap-2"><button onClick={() => review("approved")} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><CheckCircle2 className="size-4" />Approve</button><button onClick={() => review("rejected")} disabled={busy || !note.trim()} className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-4 py-2 text-sm text-destructive disabled:opacity-50"><XCircle className="size-4" />Reject</button><button onClick={() => review("needs-discussion")} disabled={busy || !note.trim()} className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm disabled:opacity-50"><MessageSquare className="size-4" />Needs discussion</button>{busy && <Loader2 aria-label="Saving review" className="my-2 size-4 animate-spin" />}</div>
        </div>
      </section> : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Select a submission to inspect its content, play a preview and leave a review.</div>}
    </div>}
  </main>;
}
