"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Loader2, Trash2, ImageUp, X, Loader as Spinner, Send, CheckCircle2, XCircle, MessageSquare, ChevronDown } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getPuzzle, updatePuzzle, deletePuzzle, updatePuzzleReview, togglePublish, isAdmin, getStudioSession, CATEGORIES, DIFFICULTIES, getUsedLessonOrders } from "@/services/puzzle-service";
import { uploadToImgbb } from "@/services/imgbb";
import { getLessonGroups, type LessonGroupEntry } from "@/services/lesson-service";
import { type PuzzleFormData, type PuzzleType, type CrosswordData, type SudokuData, type CipherData, type ReviewStatus } from "@/types/puzzle";
import { CrosswordForm } from "@/features/puzzle/components/CrosswordForm";
import { generateSudoku } from "@/services/sudoku-generator";
import { toast } from "sonner";
import { SkeletonForm } from "@/components/ui/skeleton";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";

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
  const [dirty, setDirty] = useState(false);
  const { confirmLeave, LeaveWarningModal } = useUnsavedChanges(dirty);
  const [notFound, setNotFound] = useState(false);
  const [puzzleStatus, setPuzzleStatus] = useState<ReviewStatus | null>(null);
  const [puzzlePublished, setPuzzlePublished] = useState(false);
  const [puzzleReviewedBy, setPuzzleReviewedBy] = useState<string | undefined>();
  const [puzzleReviewNote, setPuzzleReviewNote] = useState<string | undefined>();
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lessonFileInputRef = useRef<HTMLInputElement>(null);
  const [lessonUploading, setLessonUploading] = useState(false);
  const [form, setForm] = useState<PuzzleFormData>({
    type: "multiple-choice",
    category: "logic",
    difficulty: "easy",
    title: "",
    question: "",
    choices: ["", "", "", ""],
    correctAnswer: "",
    xpReward: 10,
    cipherData: undefined,
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
        correctExplanation: puzzle.correctExplanation ?? undefined,
        incorrectExplanation: puzzle.incorrectExplanation ?? undefined,
        crosswordData: puzzle.crosswordData ? { ...puzzle.crosswordData, grid: puzzle.crosswordData.grid.map((r) => [...r]) } : undefined,
        sudokuData: puzzle.sudokuData ? { ...puzzle.sudokuData } : undefined,
        imageUrl: puzzle.imageUrl ?? undefined,
        lessonImageUrl: puzzle.lessonImageUrl ?? undefined,
        cipherData: puzzle.cipherData ? { ...puzzle.cipherData } : undefined,
        acceptedAnswers: puzzle.acceptedAnswers ?? undefined,
        lessonContent: puzzle.lessonContent ?? undefined,
        lessonOrder: puzzle.lessonOrder ?? undefined,
        lessonGroup: puzzle.lessonGroup ?? undefined,
        lessonGroupOrder: puzzle.lessonGroupOrder ?? undefined,
        hintText: puzzle.hintText ?? undefined,
      });
      setAcceptedRaw((puzzle.acceptedAnswers ?? []).join(", "));
      setPuzzleStatus(puzzle.reviewStatus ?? "draft");
      setPuzzlePublished(puzzle.published);
      setPuzzleReviewedBy(puzzle.reviewedBy);
      setPuzzleReviewNote(puzzle.reviewNote);
      setLoading(false);
    })();
  }, [id]);

  const update = <K extends keyof PuzzleFormData>(key: K, value: PuzzleFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  // Lesson group state
  const [lessonGroups, setLessonGroups] = useState<LessonGroupEntry[]>([]);
  const [availableOrders, setAvailableOrders] = useState<number[]>([]);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [acceptedRaw, setAcceptedRaw] = useState("");

  const isQuiz = form.type === "multiple-choice" || form.type === "true-false";
  const isTypeAnswer = form.type === "type-answer";
  const isCrossword = form.type === "crossword";
  const isSudoku = form.type === "sudoku";
  const isRiddle = form.type === "riddle";
  const isWonder = form.type === "wonder";
  const isCipher = form.type === "cipher";

  useEffect(() => {
    if (form.category && (isQuiz || isTypeAnswer || isCrossword || isSudoku || isRiddle || isWonder || isCipher)) {
      getLessonGroups(form.category).then(setLessonGroups);
    } else {
      setLessonGroups([]);
    }
  }, [form.category, form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.category && form.lessonGroup) {
      getUsedLessonOrders(form.category, form.lessonGroup).then((used) => {
        const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        setAvailableOrders(all.filter((o) => !used.includes(o) || o === form.lessonOrder));
      });
    } else {
      setAvailableOrders([]);
    }
  }, [form.category, form.lessonGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateChoice = (i: number, value: string) => {
    const choices = [...(form.choices || ["", "", "", ""])];
    choices[i] = value;
    update("choices", choices);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; img.src = url; });
    URL.revokeObjectURL(url);
    if (img.width > 4096 || img.height > 4096) {
      toast.error("Image dimensions must be under 4096×4096px.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadToImgbb(file);
      update("imageUrl", imageUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLessonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB.");
      if (lessonFileInputRef.current) lessonFileInputRef.current.value = "";
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; img.src = url; });
    URL.revokeObjectURL(url);
    if (img.width > 4096 || img.height > 4096) {
      toast.error("Image dimensions must be under 4096×4096px.");
      if (lessonFileInputRef.current) lessonFileInputRef.current.value = "";
      return;
    }
    setLessonUploading(true);
    try {
      const imageUrl = await uploadToImgbb(file);
      update("lessonImageUrl", imageUrl);
      toast.success("Lesson image uploaded");
    } catch {
      toast.error("Failed to upload image");
    }
    setLessonUploading(false);
    if (lessonFileInputRef.current) lessonFileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.type === "crossword" && (!form.crosswordData || form.crosswordData.clues.length === 0)) {
      toast.error("Add at least one clue before saving.");
      return;
    }
    if (form.type === "sudoku" && !form.sudokuData) {
      toast.error("Generate a Sudoku puzzle before saving.");
      return;
    }
    setSaving(true);
    const updated = await updatePuzzle(id, form);
    if (updated) {
      setPuzzleStatus(updated.reviewStatus ?? puzzleStatus);
      setDirty(false);
    }
    setSaving(false);
    toast.success("Saved.");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      (e.currentTarget as HTMLFormElement).requestSubmit();
    }
  };

  const handleBack = () => {
    confirmLeave(() => router.push("/studio"));
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
    setShowDeleteConfirm(false);
    await deletePuzzle(id);
    router.push("/studio");
  };

  const handleTypeChange = (type: PuzzleType) => {
    if (type === "crossword") {
      setForm((f) => ({ ...f, type, crosswordData: defaultCrossword, sudokuData: undefined }));
    } else if (type === "wonder") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", xpReward: 0, crosswordData: undefined, sudokuData: undefined }));
    } else if (type === "type-answer" || type === "riddle") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
    } else if (type === "cipher") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
    } else if (type === "sudoku") {
      const sudokuData = generateSudoku(form.difficulty);
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined, sudokuData }));
    } else {
      const choices = type === "true-false" ? ["True", "False"] : ["", "", "", ""];
      setForm((f) => ({ ...f, type, choices, correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: "85%" }}>
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-7 w-40 animate-pulse rounded bg-muted" />
        <SkeletonForm />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto w-full px-4 py-6 text-center" style={{ maxWidth: "85%" }}>
        <p className="text-muted-foreground">Puzzle not found.</p>
        <button onClick={() => router.push("/studio")} className="mt-3 text-sm text-primary hover:underline">
          Back to studio
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: "85%" }}>
      <button onClick={handleBack} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to puzzles
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">Edit Puzzle</h1>
      </motion.div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="mt-6 space-y-7 rounded-xl border bg-card p-6">

        {/* Section: Puzzle Type (read-only on edit) */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Puzzle Type</span>
            <span className="h-px flex-1 bg-border/50" />
          </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <div className="flex gap-2 flex-wrap">
            {(["multiple-choice", "true-false", "type-answer", "crossword", "sudoku", "riddle", "wonder", "cipher"] as const).map((t) => (
              <button key={t} type="button" disabled
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all cursor-not-allowed ${
                  form.type === t
                    ? "border-primary/40 bg-primary/5 text-primary/60 shadow-sm"
                    : "border-border/30 text-muted-foreground/30"
                }`}
              >
                {t === "multiple-choice" ? "Multiple Choice" : t === "true-false" ? "True / False" : t === "type-answer" ? "Type Answer" : t === "crossword" ? "Crossword" : t === "sudoku" ? "Sudoku" : t === "riddle" ? "Riddle" : t === "wonder" ? "Wonder" : "Cipher"}
              </button>
            ))}
          </div>
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

        {(isQuiz || isTypeAnswer || isRiddle) && (
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

        {isWonder && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. The Bat &amp; the Ball"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Hook / Question</label>
              <textarea value={form.question} onChange={(e) => update("question", e.target.value)}
                placeholder="Present the curiosity — no answer expected..."
                rows={4}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
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
            <div>
              <label className="mb-1.5 block text-sm font-medium">Insight / Reveal</label>
              <textarea value={form.correctExplanation ?? form.lessonContent ?? ""} onChange={(e) => update("lessonContent", e.target.value)}
                placeholder="The takeaway — what to consider after the hook..."
                rows={5}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
              <p className="mt-1 text-xs text-muted-foreground">This is shown after the user reflects. No correct answer — just an insight.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Share Prompt (optional)</label>
              <textarea value={form.sharePrompt ?? ""} onChange={(e) => update("sharePrompt", e.target.value)}
                placeholder='e.g. "Try this on 3 people today and watch their faces."'
                rows={2}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              <p className="mt-1 text-xs text-muted-foreground">Encourages the user to share this wonder with someone in real life.</p>
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
                value={acceptedRaw}
                onChange={(e) => setAcceptedRaw(e.target.value)}
                onBlur={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. BTW, By the way"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Alternate correct answers. Case &amp; spacing are handled automatically.</p>
            </div>
          </>
        )}

        {isRiddle && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <input value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="e.g. An echo"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate accepted answers (optional, comma-separated)</label>
              <input
                value={acceptedRaw}
                onChange={(e) => setAcceptedRaw(e.target.value)}
                onBlur={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. wind, breeze"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Alternate correct answers for the riddle.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Hint (optional, one clue per line)</label>
              <textarea value={form.hintText ?? ""} onChange={(e) => update("hintText", e.target.value)}
                placeholder="First hint line...&#10;Second hint line..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              <p className="mt-1 text-xs text-muted-foreground">Each line becomes a progressive hint shown during the riddle.</p>
            </div>
          </>
        )}

        {isCipher && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Caesar's Secret"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Question / Context</label>
              <textarea value={form.question} onChange={(e) => update("question", e.target.value)}
                placeholder="Give context for the cipher — a story, a clue, or just leave blank..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Encoded Message</label>
              <textarea value={form.cipherData?.encodedMessage ?? ""} onChange={(e) => {
                const current = form.cipherData || { encodedMessage: "", cipherType: "Custom", hint: undefined };
                update("cipherData", { ...current, encodedMessage: e.target.value });
              }}
                placeholder="Paste the encoded/ciphertext message here..."
                rows={4}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 font-mono text-sm outline-none focus:border-primary" required />
              <p className="mt-1 text-xs text-muted-foreground">This is what the player will see and attempt to decode.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Cipher Type</label>
                <select value={form.cipherData?.cipherType ?? "Custom"} onChange={(e) => {
                  const current = form.cipherData || { encodedMessage: "", cipherType: "Custom", hint: undefined };
                  update("cipherData", { ...current, cipherType: e.target.value });
                }}
                  className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="Caesar Cipher">Caesar Cipher</option>
                  <option value="Substitution">Substitution</option>
                  <option value="Cryptogram">Cryptogram</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Image (optional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {form.imageUrl ? (
                  <div className="relative">
                    <img src={form.imageUrl} alt="Preview" className="max-h-24 w-full rounded-xl object-contain bg-muted" />
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
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Hint <span className="text-muted-foreground font-normal">(optional, one per line)</span>
              </label>
              <textarea value={form.cipherData?.hint ?? ""} onChange={(e) => {
                const current = form.cipherData || { encodedMessage: "", cipherType: "Custom", hint: undefined };
                update("cipherData", { ...current, hint: e.target.value });
              }}
                placeholder="First progressive hint...&#10;Second hint..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
              <p className="mt-1 text-xs text-muted-foreground">Each line becomes a progressive hint during the cipher Sunday attempt.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <input value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="e.g. Meet me at dawn"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate accepted answers (optional, comma-separated)</label>
              <input
                value={acceptedRaw}
                onChange={(e) => setAcceptedRaw(e.target.value)}
                onBlur={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. meet at dawn, meet me at daybreak"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </>
        )}

        {(isQuiz || isTypeAnswer || isRiddle || isCipher) && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Explanation (for correct answer)</label>
              <textarea value={form.correctExplanation ?? ""} onChange={(e) => update("correctExplanation", e.target.value)}
                placeholder="Explain why this answer is correct..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Explanation (for wrong answer)</label>
              <textarea value={form.incorrectExplanation ?? ""} onChange={(e) => update("incorrectExplanation", e.target.value)}
                placeholder="Explain what the correct answer is and why..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
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

        {isSudoku && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Sudoku - Easy"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sudoku Grid</label>
              <p className="mb-3 text-xs text-muted-foreground">
                Puzzle generated based on difficulty. Click regenerate to get a new layout.
              </p>
              {form.sudokuData ? (
                <div className="space-y-3">
                  <div className="mx-auto grid aspect-square w-full max-w-[270px] select-none grid-cols-9 gap-0 overflow-hidden rounded-md border-2 border-border">
                    {form.sudokuData.puzzle.map((val, i) => {
                      const row = Math.floor(i / 9);
                      const col = i % 9;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-center text-xs font-medium ${
                            val > 0 ? "text-foreground" : "bg-card/30 text-muted-foreground"
                          } ${col === 2 || col === 5 ? "border-r-[2px] border-r-border" : "border-r border-r-border/30"} ${
                            row === 2 || row === 5 ? "border-b-[2px] border-b-border" : "border-b border-b-border/30"
                          } bg-card`}
                          style={{ aspectRatio: "1" }}
                        >
                          {val > 0 ? val : ""}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sudokuData = generateSudoku(form.difficulty);
                      update("sudokuData", sudokuData);
                    }}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    Regenerate Puzzle
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const sudokuData = generateSudoku(form.difficulty);
                    update("sudokuData", sudokuData);
                  }}
                  className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  Generate Sudoku Puzzle
                </button>
              )}
            </div>
          </>
        )}

        {/* Lesson fields */}
        {(isQuiz || isTypeAnswer || isCrossword || isSudoku || isRiddle || isWonder || isCipher) && (
          <>
            <hr className="border-muted" />
            <button
              type="button"
              onClick={() => setLessonOpen(!lessonOpen)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium">Learning Path</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  lessonOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {lessonOpen && (
                <motion.div
                  key="lesson-fields"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="mb-1.5 block text-sm font-medium">
                          Lesson Group <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        {lessonGroups.length > 0 ? (
                          <select
                            value={form.lessonGroup ?? ""}
                            onChange={(e) => {
                              const selected = lessonGroups.find((g) => g.name === e.target.value);
                              update("lessonGroup", e.target.value || undefined);
                              if (selected) update("lessonGroupOrder", selected.order);
                            }}
                            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          >
                            <option value="">-- Select lesson group --</option>
                            {lessonGroups.map((g) => (
                              <option key={g.name} value={g.name}>Lesson {g.order}: {g.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={form.lessonGroup ?? ""}
                            onChange={(e) => update("lessonGroup", e.target.value)}
                            placeholder="e.g. Counting"
                            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lessonGroups.length > 0
                            ? "Select from the configured lesson groups."
                            : "Configure lesson groups in Settings first."}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Sub-lesson Order <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      {form.lessonGroup && availableOrders.length > 0 ? (
                        <select
                          value={form.lessonOrder ?? ""}
                          onChange={(e) => update("lessonOrder", e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                        >
                          <option value="">-- Select order --</option>
                          {availableOrders.map((o) => (
                            <option key={o} value={o}>Sub-lesson {o}</option>
                          ))}
                        </select>
                      ) : form.lessonGroup && availableOrders.length === 0 ? (
                        <div className="rounded-xl border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                          All orders 1–10 are taken for this group. Edit another puzzle to free one up.
                        </div>
                      ) : (
                        <input
                          value={form.lessonOrder ?? ""}
                          onChange={(e) => update("lessonOrder", e.target.value ? Number(e.target.value) : undefined)}
                          type="number"
                          min={1}
                          max={10}
                          placeholder="e.g. 1"
                          className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {form.lessonGroup
                          ? "Position within the lesson group. Only available orders are shown."
                          : "Select a lesson group first to see available orders."}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Lesson Content <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={form.lessonContent ?? ""}
                        onChange={(e) => update("lessonContent", e.target.value)}
                        placeholder="One fact per line&#10;e.g.&#10;The sun is a star at the center of our solar system.&#10;It provides light and heat that makes life on Earth possible."
                        rows={5}
                        className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Each line becomes a numbered fact shown before the quiz.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Lesson Image <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <input ref={lessonFileInputRef} type="file" accept="image/*" onChange={handleLessonImageUpload} className="hidden" />
                      {form.lessonImageUrl ? (
                        <div className="relative">
                          <img src={form.lessonImageUrl} alt="Lesson preview" className="max-h-48 w-full rounded-xl object-contain bg-muted" />
                          <button type="button" onClick={() => update("lessonImageUrl", undefined)}
                            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground">
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => lessonFileInputRef.current?.click()} disabled={lessonUploading}
                          className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                          {lessonUploading ? <Spinner className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
                          {lessonUploading ? "Uploading..." : "Upload lesson image"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
        {!puzzlePublished && !isAdmin() && puzzleStatus && ["draft", "rejected", "needs-discussion"].includes(puzzleStatus) && (
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
              className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
        )}

        {/* Admin: Publish toggle */}
        {isAdmin() && (puzzlePublished || puzzleStatus === "approved") && (
          <button type="button" onClick={() => setShowPublishConfirm(true)} disabled={publishing}
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
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(true)}
            disabled={!isAdmin() && puzzlePublished}
            title={!isAdmin() && puzzlePublished ? "Cannot delete live puzzles" : ""}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/30 px-6 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-30">
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handleTogglePublish}
        title={puzzlePublished ? "Unpublish Puzzle" : "Go Live"}
        description={
          puzzlePublished
            ? "This puzzle will be hidden from players. Are you sure you want to unpublish?"
            : "This puzzle will be visible to all players immediately. Please make sure everything is correct before proceeding."
        }
        confirmLabel={puzzlePublished ? "Unpublish" : "Go Live"}
        confirmVariant={puzzlePublished ? "danger" : "success"}
        loading={publishing}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Puzzle"
        description="Are you sure you want to delete this puzzle? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
      {LeaveWarningModal}
    </main>
  );
}
