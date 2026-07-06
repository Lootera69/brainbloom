"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Trash2, ImageUp, X, Loader as Spinner, Send, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { getPuzzle, updatePuzzle, deletePuzzle, updatePuzzleReview, togglePublish, isAdmin, getStudioSession, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { uploadToImgbb } from "@/services/imgbb";
import { type PuzzleFormData, type PuzzleType, type CrosswordData, type ReviewStatus } from "@/types/puzzle";
import { CrosswordForm } from "@/features/puzzle/components/CrosswordForm";
import { toast } from "sonner";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  "needs-discussion": "Needs Discussion",
};

const STATUS_COLORS: Record<ReviewStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  "needs-discussion": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const REVIEW_ACTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "needs-discussion", label: "Needs Discussion" },
];

const defaultCrossword: CrosswordData = {
  size: 10,
  grid: Array.from({ length: 10 }, () => Array(10).fill("")),
  clues: [],
};

export default function EditPuzzlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [puzzleStatus, setPuzzleStatus] = useState<ReviewStatus | null>(null);
  const [puzzlePublished, setPuzzlePublished] = useState(false);
  const [puzzleReviewedBy, setPuzzleReviewedBy] = useState<string | undefined>();
  const [puzzleReviewNote, setPuzzleReviewNote] = useState<string | undefined>();
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PuzzleFormData>({
    type: "multiple-choice",
    category: "logic",
    difficulty: "easy",
    title: "",
    question: "",
    choices: ["", "", "", ""],
    correctAnswer: "",
    xpReward: 10,
    requiresExplanation: false,
    explanation: "",
  });

  useEffect(() => {
    (async () => {
      const puzzle = await getPuzzle(id);
      if (!puzzle) { setNotFound(true); setLoading(false); return; }
      setForm({
        type: puzzle.type,
        category: puzzle.category,
        difficulty: puzzle.difficulty,
        title: puzzle.title,
        question: puzzle.question,
        choices: puzzle.choices,
        correctAnswer: puzzle.correctAnswer,
        xpReward: puzzle.xpReward,
        requiresExplanation: puzzle.requiresExplanation ?? false,
        explanation: puzzle.explanation ?? "",
        crosswordData: puzzle.crosswordData ? { ...puzzle.crosswordData, grid: puzzle.crosswordData.grid.map((r) => [...r]) } : undefined,
        imageUrl: puzzle.imageUrl ?? undefined,
        acceptedAnswers: puzzle.acceptedAnswers ?? undefined,
      });
      setPuzzleStatus(puzzle.reviewStatus ?? "draft");
      setPuzzlePublished(puzzle.published);
      setPuzzleReviewedBy(puzzle.reviewedBy);
      setPuzzleReviewNote(puzzle.reviewNote);
      setLoading(false);
    })();
  }, [id]);

  const update = <K extends keyof PuzzleFormData>(key: K, value: PuzzleFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateChoice = (i: number, value: string) => {
    const choices = [...(form.choices || ["", "", "", ""])];
    choices[i] = value;
    update("choices", choices);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgbb(file);
      update("imageUrl", url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.type === "crossword" && (!form.crosswordData || form.crosswordData.clues.length === 0)) {
      toast.error("Add at least one clue before saving.");
      return;
    }
    if (form.requiresExplanation && !form.explanation.trim()) {
      toast.error("Please write an explanation or uncheck the option.");
      return;
    }
    setSaving(true);
    const updated = await updatePuzzle(id, form);
    if (updated) {
      setPuzzleStatus(updated.reviewStatus ?? puzzleStatus);
    }
    setSaving(false);
    toast.success("Saved.");
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    const updated = await updatePuzzleReview(id, "pending");
    if (updated) {
      setPuzzleStatus("pending");
      toast.success("Submitted for review.");
    }
    setSubmitting(false);
  };

  const handleReviewAction = async (status: ReviewStatus) => {
    setSubmitting(true);
    const updated = await updatePuzzleReview(id, status, reviewNoteInput || undefined);
    if (updated) {
      setPuzzleStatus(status);
      setPuzzleReviewedBy(getStudioSession() ?? undefined);
      setPuzzleReviewNote(reviewNoteInput || undefined);
      setReviewNoteInput("");
      toast.success(`Marked as "${STATUS_LABELS[status]}".`);
    }
    setSubmitting(false);
  };

  const handleTogglePublish = async () => {
    setPublishing(true);
    const updated = await togglePublish(id);
    if (updated) {
      setPuzzlePublished(updated.published);
      toast.success(updated.published ? "Published!" : "Unpublished.");
    }
    setPublishing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this puzzle permanently?")) return;
    await deletePuzzle(id);
    router.push("/studio");
  };

  const handleTypeChange = (type: PuzzleType) => {
    if (type === "crossword") {
      setForm((f) => ({ ...f, type, crosswordData: defaultCrossword }));
    } else if (type === "type-answer") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined }));
    } else {
      const choices = type === "true-false" ? ["True", "False"] : ["", "", "", ""];
      setForm((f) => ({ ...f, type, choices, correctAnswer: "", crosswordData: undefined }));
    }
  };

  const isQuiz = form.type === "multiple-choice" || form.type === "true-false";
  const isTypeAnswer = form.type === "type-answer";
  const isCrossword = form.type === "crossword";

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 text-center">
        <p className="text-muted-foreground">Puzzle not found.</p>
        <button onClick={() => router.push("/studio")} className="mt-3 text-sm text-primary hover:underline">
          Back to studio
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={() => router.push("/studio")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to puzzles
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Edit Puzzle</h1>
      </motion.div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <div className="flex gap-2">
            {(["multiple-choice", "true-false", "type-answer", "crossword"] as const).map((t) => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  form.type === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                {t === "multiple-choice" ? "Multiple Choice" : t === "true-false" ? "True / False" : t === "type-answer" ? "Type Answer" : "Crossword"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as "easy" | "medium" | "hard")}
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary">
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">XP Reward</label>
          <input value={form.xpReward} onChange={(e) => update("xpReward", Number(e.target.value) || 0)}
            type="number" min={0} max={999} list="xp-presets"
            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <datalist id="xp-presets">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>

        {(isQuiz || isTypeAnswer) && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. What comes next in the sequence?"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Question</label>
              <textarea value={form.question} onChange={(e) => update("question", e.target.value)}
                rows={4} className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Image (optional)</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {form.imageUrl ? (
                <div className="relative">
                  <img src={form.imageUrl} alt="Preview" className="max-h-48 w-full rounded-xl object-contain bg-muted" />
                  <button type="button" onClick={() => update("imageUrl", undefined)}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                  {uploading ? <Spinner className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
                  {uploading ? "Uploading..." : "Upload image"}
                </button>
              )}
            </div>
          </>
        )}

        {isQuiz && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Choices</label>
              <div className="space-y-2">
                {(form.choices || ["", "", "", ""]).map((choice, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input value={choice} onChange={(e) => updateChoice(i, e.target.value)}
                      className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <select value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required>
                <option value="">Select correct answer</option>
                {(form.choices || []).map((choice, i) => (
                  <option key={i} value={choice} disabled={!choice.trim()}>
                    {String.fromCharCode(65 + i)}. {choice || "(empty)"}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {isTypeAnswer && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <input value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="e.g. Rope"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate answers (optional, comma-separated)</label>
              <input
                value={(form.acceptedAnswers ?? []).join(", ")}
                onChange={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. BTW, By the way"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Alternate correct answers. Case &amp; spacing are handled automatically.</p>
            </div>
          </>
        )}

        {(isQuiz || isTypeAnswer) && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.requiresExplanation} onChange={(e) => update("requiresExplanation", e.target.checked)}
                className="size-4 rounded border-foreground/20 text-primary focus:ring-primary" />
              <span className="text-sm font-medium">Requires explanation</span>
            </label>
            {form.requiresExplanation && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Explanation</label>
                <textarea value={form.explanation} onChange={(e) => update("explanation", e.target.value)}
                  placeholder="Explain why this answer is correct..." rows={3}
                  className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
              </div>
            )}
          </div>
        )}

        {isCrossword && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Sunday Crossword"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Crossword Grid</label>
              <p className="mb-3 text-xs text-muted-foreground">Click cells to toggle blocked/open. Select an open cell to add a clue.</p>
              <CrosswordForm value={form.crosswordData || defaultCrossword} onChange={(cd) => update("crosswordData", cd)} />
            </div>
          </>
        )}

        {/* Stage badge */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
          {puzzlePublished ? (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-success">Live</span>
          ) : (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${STATUS_COLORS[puzzleStatus ?? "draft"]}`}>
              {STATUS_LABELS[puzzleStatus ?? "draft"]}
            </span>
          )}
          {!puzzlePublished && puzzleReviewedBy && (
            <span className="text-xs text-muted-foreground">
              Reviewed by {puzzleReviewedBy}
            </span>
          )}
        </div>

        {!puzzlePublished && puzzleReviewNote && (
          <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{puzzleReviewNote}</p>
          </div>
        )}

        {/* Contributor: Submit for review */}
        {!puzzlePublished && !isAdmin() && puzzleStatus && ["draft", "rejected"].includes(puzzleStatus) && (
          <button type="button" onClick={handleSubmitForReview} disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-500/20 active:scale-[0.98] disabled:opacity-50 dark:text-amber-400">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit for Approval
          </button>
        )}

        {/* Admin: Review actions */}
        {!puzzlePublished && isAdmin() && puzzleStatus && puzzleStatus !== "approved" && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review</p>
            <div className="flex gap-2">
              {REVIEW_ACTIONS.map((action) => (
                <button key={action.value} type="button" onClick={() => handleReviewAction(action.value)}
                  disabled={submitting}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
                    action.value === "approved"
                      ? "border-success/30 text-success hover:bg-success/10"
                      : action.value === "rejected"
                      ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                      : "border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                  }`}>
                  {action.value === "approved" ? <CheckCircle2 className="mr-1 inline size-3.5" /> : action.value === "rejected" ? <XCircle className="mr-1 inline size-3.5" /> : <MessageSquare className="mr-1 inline size-3.5" />}
                  {action.label}
                </button>
              ))}
            </div>
            <textarea value={reviewNoteInput} onChange={(e) => setReviewNoteInput(e.target.value)}
              placeholder="Add a review note (optional)..."
              rows={2}
              className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-xs outline-none transition-colors focus:border-primary" />
          </div>
        )}

        {/* Admin: Publish toggle */}
        {isAdmin() && (puzzlePublished || puzzleStatus === "approved") && (
          <button type="button" onClick={handleTogglePublish} disabled={publishing}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
              puzzlePublished
                ? "border border-destructive/30 text-destructive hover:bg-destructive/10"
                : "bg-success text-white hover:brightness-110"
            }`}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : puzzlePublished ? "Unpublish" : "Go Live"}
          </button>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </button>
          <button type="button" onClick={handleDelete}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/30 px-6 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}
