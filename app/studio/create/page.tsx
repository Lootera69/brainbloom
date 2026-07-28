"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Loader2, ImageUp, X, Loader as Spinner, ChevronDown, Trash2 } from "lucide-react";
import { CopyPromptButton } from "@/components/ui/copy-prompt-button";
import { createPuzzle, CATEGORIES, DIFFICULTIES, getUsedLessonOrders } from "@/services/puzzle-service";
import { uploadToImgbb } from "@/services/imgbb";
import { getLessonGroups, type LessonGroupEntry } from "@/services/lesson-service";
import { type PuzzleFormData, type PuzzleType, type CrosswordData } from "@/types/puzzle";
import { CrosswordForm } from "@/features/puzzle/components/CrosswordForm";
import { generateSudoku } from "@/services/sudoku-generator";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";

const defaultCrossword: CrosswordData = {
  size: 10,
  grid: Array.from({ length: 10 }, () => Array(10).fill("")),
  clues: [],
};

export default function CreatePuzzlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { confirmLeave, LeaveWarningModal } = useUnsavedChanges(dirty);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lessonFileInputRef = useRef<HTMLInputElement>(null);
  const [lessonUploading, setLessonUploading] = useState(false);
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ section: "question" | "answer"; index: number } | null>(null);
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
  const isStory = form.type === "story";

  const handleGenerateSudoku = async (difficulty: "easy" | "medium" | "hard") => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 500));
    const data = generateSudoku(difficulty);
    setGenerating(false);
    update("sudokuData", data);
  };

  useEffect(() => {
    if (form.category && (isQuiz || isTypeAnswer || isCrossword || isSudoku || isRiddle || isWonder || isCipher || isStory)) {
      getLessonGroups(form.category).then(setLessonGroups);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLessonGroups([]);
    }
  }, [form.category, form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.category && form.lessonGroup) {
      getUsedLessonOrders(form.category, form.lessonGroup).then((used) => {
        const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        setAvailableOrders(all.filter((o) => !used.includes(o)));
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableOrders([]);
    }
  }, [form.category, form.lessonGroup]);

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
    await createPuzzle(form);
    setSaving(false);
    setDirty(false);
    router.push("/studio");
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

  const handleTypeChange = (type: PuzzleType) => {
    setAcceptedRaw("");
    if (type === "crossword") {
      setForm((f) => ({ ...f, type, crosswordData: defaultCrossword, sudokuData: undefined }));
    } else if (type === "wonder") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", xpReward: 0, crosswordData: undefined, sudokuData: undefined }));
    } else if (type === "type-answer" || type === "riddle") {
      setForm((f) => ({
        ...f,
        type,
        choices: [],
        correctAnswer: "",
        crosswordData: undefined,
        sudokuData: undefined,
      }));
    } else if (type === "story") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", xpReward: 0, crosswordData: undefined, sudokuData: undefined, storyData: { questionSlides: [{ content: "" }], answerSlides: [{ content: "" }] } }));
    } else if (type === "cipher") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
    } else if (type === "sudoku") {
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
      handleGenerateSudoku(form.difficulty);
    } else {
      const choices = type === "true-false" ? ["True", "False"] : ["", "", "", ""];
      setForm((f) => ({ ...f, type, choices, correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
    }
  };

  return (
    <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: "85%" }}>
      <div className="sticky top-0 z-10 -mx-4 -mt-6 bg-background/80 backdrop-blur-sm px-4 pb-3 pt-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to puzzles
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">New Puzzle</h1>
        <p className="text-sm text-muted-foreground">Fill in the details below.</p>
      </motion.div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="mt-6 space-y-7 rounded-xl border bg-card p-6">

        {/* Section: Puzzle Type */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Puzzle Type</span>
            <span className="h-px flex-1 bg-border/50" />
          </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <div className="flex gap-2 flex-wrap">
            {(["multiple-choice", "true-false", "type-answer", "crossword", "sudoku", "riddle", "wonder", "cipher", "story"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  form.type === t
                    ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                    : "hover:bg-muted/80 hover:border-primary/20"
                }`}
              >
                {t === "multiple-choice" ? "Multiple Choice" : t === "true-false" ? "True / False" : t === "type-answer" ? "Type Answer" : t === "crossword" ? "Crossword" : t === "sudoku" ? "Sudoku" : t === "riddle" ? "Riddle" : t === "wonder" ? "Wonder" : t === "cipher" ? "Cipher" : "Story"}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => {
                const d = e.target.value as "easy" | "medium" | "hard";
                update("difficulty", d);
                if (isSudoku) handleGenerateSudoku(d);
              }}
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">XP Reward</label>
          <input
            value={form.xpReward}
            onChange={(e) => update("xpReward", Number(e.target.value) || 0)}
            type="number"
            min={0}
            max={999}
            list="xp-presets"
            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <datalist id="xp-presets">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>

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
                  <div style={{ perspective: 800 }}>
                    <div
                      key={form.sudokuData.puzzle.join(",") || "empty"}
                      className={cn(
                        "mx-auto grid aspect-square w-full max-w-[270px] select-none grid-cols-9 gap-0 overflow-hidden rounded-md border-2 transition-all duration-500",
                        generating
                          ? "border-indigo-400/50 shadow-[0_0_20px_rgba(129,140,248,0.25)]"
                          : "border-border",
                      )}
                    >
                      {form.sudokuData.puzzle.map((val, i) => {
                        const row = Math.floor(i / 9);
                        const col = i % 9;
                        const isChecker = (row + col) % 2 === 0;
                        return (
                          <motion.div
                            key={i}
                            initial="enter"
                            animate={generating ? "dissolve" : "visible"}
                            custom={i}
                            variants={{
                              enter: {
                                opacity: 0,
                                scale: 0.2,
                                rotateX: 90,
                                filter: "blur(8px)",
                              },
                              visible: (c: number) => {
                                const r = Math.floor(c / 9);
                                const cl = c % 9;
                                const d = Math.sqrt((r - 4) ** 2 + (cl - 4) ** 2);
                                return {
                                  opacity: 1,
                                  scale: 1,
                                  rotateX: 0,
                                  filter: "blur(0px)",
                                  transition: {
                                    delay: (d / 5.66) * 0.4,
                                    type: "spring",
                                    stiffness: 350,
                                    damping: 20,
                                  },
                                };
                              },
                              dissolve: (c: number) => {
                                const r = Math.floor(c / 9);
                                const cl = c % 9;
                                const d = Math.sqrt((r - 4) ** 2 + (cl - 4) ** 2);
                                return {
                                  opacity: 0,
                                  scale: 0.1,
                                  rotateX: -90,
                                  filter: "blur(10px)",
                                  transition: {
                                    delay: ((5.66 - d) / 5.66) * 0.3,
                                    duration: 0.3,
                                    ease: [0.4, 0, 1, 1],
                                  },
                                };
                              },
                            }}
                            className={cn(
                              "flex items-center justify-center text-xs font-medium",
                              val > 0 ? "text-foreground" : "text-muted-foreground",
                              col === 2 || col === 5
                                ? "border-r-[2px] border-r-border"
                                : "border-r border-r-border/30",
                              row === 2 || row === 5
                                ? "border-b-[2px] border-b-border"
                                : "border-b border-b-border/30",
                              isChecker ? "bg-muted/20" : "bg-card",
                            )}
                            style={{ aspectRatio: "1" }}
                          >
                            {val > 0 ? val : ""}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => handleGenerateSudoku(form.difficulty)}
                    className={cn(
                      "flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50",
                      generating
                        ? "border-indigo-400/40 text-indigo-500 shadow-[0_0_12px_rgba(129,140,248,0.2)]"
                        : "border-primary/30 text-primary hover:bg-primary/10",
                    )}
                  >
                    {generating && (
                      <span className="relative flex size-4">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-40" />
                        <span className="relative inline-flex size-4 rounded-full bg-indigo-500" />
                      </span>
                    )}
                    {generating ? "SYNTHESIZING..." : "Regenerate Puzzle"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerateSudoku(form.difficulty)}
                  className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  {generating ? <Loader2 className="size-5 animate-spin" /> : null}
                  {generating ? "SYNTHESIZING..." : "Generate Sudoku Puzzle"}
                </button>
              )}
            </div>
          </>
        )}

        {(isQuiz || isTypeAnswer || isRiddle) && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. What comes next in the sequence?"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Question</label>
              <textarea value={form.question} onChange={(e) => update("question", e.target.value)}
                placeholder="Write the full question here..." rows={4}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">Image (optional)</label>
                <CopyPromptButton subject={`${form.title} - ${form.question}`} />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {form.imageUrl ? (
                <div>
                  <img src={form.imageUrl} alt="Preview" className="max-h-48 w-full rounded-xl object-contain bg-muted" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                      {uploading ? <Spinner className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                      {uploading ? "Uploading..." : "Replace image"}
                    </button>
                    <button type="button" onClick={() => update("imageUrl", undefined)}
                      className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10">
                      <Trash2 className="size-3.5" />
                      Remove image
                    </button>
                  </div>
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">Image (optional)</label>
                <CopyPromptButton subject={`${form.title} - ${form.question}`} />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {form.imageUrl ? (
                <div>
                  <img src={form.imageUrl} alt="Preview" className="max-h-48 w-full rounded-xl object-contain bg-muted" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                      {uploading ? <Spinner className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                      {uploading ? "Uploading..." : "Replace image"}
                    </button>
                    <button type="button" onClick={() => update("imageUrl", undefined)}
                      className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10">
                      <Trash2 className="size-3.5" />
                      Remove image
                    </button>
                  </div>
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
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <select value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required>
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate answers (optional, comma-separated)</label>
              <input
                value={form.type === "type-answer" ? acceptedRaw : (form.acceptedAnswers ?? []).join(", ")}
                onChange={(e) => {
                  const v = e.target.value;
                  if (form.type === "type-answer") setAcceptedRaw(v);
                  else update("acceptedAnswers", v.split(",").map((s) => s.trim()).filter(Boolean));
                }}
                onBlur={(e) => {
                  if (form.type === "type-answer") {
                    update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
                  }
                }}
                placeholder="e.g. BTW, By the way"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate accepted answers (optional, comma-separated)</label>
              <input
                value={acceptedRaw}
                onChange={(e) => setAcceptedRaw(e.target.value)}
                onBlur={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. wind, breeze"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Encoded Message</label>
              <textarea value={form.cipherData?.encodedMessage ?? ""} onChange={(e) => {
                const current = form.cipherData || { encodedMessage: "", cipherType: "Custom", hint: undefined };
                update("cipherData", { ...current, encodedMessage: e.target.value });
              }}
                placeholder="Paste the encoded/ciphertext message here..."
                rows={4}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 font-mono text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
              <p className="mt-1 text-xs text-muted-foreground">This is what the player will see and attempt to decode.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Cipher Type</label>
                <select value={form.cipherData?.cipherType ?? "Custom"} onChange={(e) => {
                  const current = form.cipherData || { encodedMessage: "", cipherType: "Custom", hint: undefined };
                  update("cipherData", { ...current, cipherType: e.target.value });
                }}
                  className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
                  <option value="Caesar Cipher">Caesar Cipher</option>
                  <option value="Substitution">Substitution</option>
                  <option value="Cryptogram">Cryptogram</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium">Image (optional)</label>
                  <CopyPromptButton subject={`${form.title} - ${form.cipherData?.encodedMessage ?? ""}`} />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {form.imageUrl ? (
                  <div>
                    <img src={form.imageUrl} alt="Preview" className="max-h-24 w-full rounded-xl object-contain bg-muted" />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                        {uploading ? <Spinner className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                        {uploading ? "Uploading..." : "Replace image"}
                      </button>
                      <button type="button" onClick={() => update("imageUrl", undefined)}
                        className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10">
                        <Trash2 className="size-3.5" />
                        Remove image
                      </button>
                    </div>
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
                Hint <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea value={form.cipherData?.hint ?? ""} onChange={(e) => {
                const current = form.cipherData || { encodedMessage: "", cipherType: "Custom", hint: undefined };
                update("cipherData", { ...current, hint: e.target.value });
              }}
                placeholder="A single cryptic hint — keep it obscure, not a giveaway..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
              <p className="mt-1 text-xs text-muted-foreground">Stays hidden until Friday, then unlocks as the only hint. Make it oblique — hard words, not plain instructions.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <input value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="e.g. Meet me at dawn"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate accepted answers (optional, comma-separated)</label>
              <input
                value={acceptedRaw}
                onChange={(e) => setAcceptedRaw(e.target.value)}
                onBlur={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. meet at dawn, meet me at daybreak"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </>
        )}

        {isStory && (
          <>
            {/* Single shared file input for all story slide image uploads */}
            <input ref={storyFileInputRef} type="file" accept="image/*" onChange={async (e) => {
              const target = uploadTarget;
              if (!target) { if (e.target) e.target.value = ""; return; }
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) { toast.error("Image must be smaller than 2MB."); if (e.target) e.target.value = ""; return; }
              const img = new Image();
              const url = URL.createObjectURL(file);
              await new Promise((resolve) => { img.onload = resolve; img.src = url; });
              URL.revokeObjectURL(url);
              if (img.width > 4096 || img.height > 4096) { toast.error("Image dimensions must be under 4096×4096px."); if (e.target) e.target.value = ""; return; }
              setUploading(true);
              try {
                const imageUrl = await uploadToImgbb(file);
                const section = target.section === "question" ? "questionSlides" as const : "answerSlides" as const;
                const slides = [...(form.storyData?.[section] ?? [])];
                slides[target.index] = { ...slides[target.index], imageUrl };
                update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), [section]: slides });
              } catch { toast.error("Failed to upload image"); }
              setUploading(false);
              setUploadTarget(null);
              if (e.target) e.target.value = "";
            }} className="hidden" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. The Lost Key"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Question Slides <span className="text-muted-foreground font-normal">(1–5, shown before thinking)</span></label>
              <p className="mb-3 text-xs text-muted-foreground">These slides set up the story or scenario. Each slide is shown one at a time.</p>
              <div className="space-y-3">
                {(form.storyData?.questionSlides ?? []).map((slide, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slide {i + 1}</span>
                      <button type="button" onClick={() => {
                        const slides = [...(form.storyData?.questionSlides ?? [])];
                        slides.splice(i, 1);
                        update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), questionSlides: slides });
                      }} disabled={form.storyData!.questionSlides.length <= 1}
                        className="text-xs text-destructive hover:underline disabled:opacity-30">
                        Remove
                      </button>
                    </div>
                    <textarea value={slide.content} onChange={(e) => {
                      const slides = [...(form.storyData?.questionSlides ?? [])];
                      slides[i] = { ...slides[i], content: e.target.value };
                      update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), questionSlides: slides });
                    }}
                      placeholder="Write the story content for this slide..."
                      rows={4}
                      className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                    <div className="mt-2">
                      <CopyPromptButton subject={slide.content || "Story slide"} />
                      {slide.imageUrl ? (
                        <div>
                          <img src={slide.imageUrl} alt="" className="h-32 rounded-lg object-contain bg-muted" />
                          <div className="mt-1.5 flex gap-1.5">
                            <button type="button" onClick={() => { setUploadTarget({ section: "question", index: i }); storyFileInputRef.current?.click(); }} disabled={uploading}
                              className="flex items-center gap-1 rounded-lg border border-muted-foreground/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                              {uploading && uploadTarget?.section === "question" && uploadTarget?.index === i ? <Spinner className="size-3 animate-spin" /> : <ImageUp className="size-3" />}
                              {uploading && uploadTarget?.section === "question" && uploadTarget?.index === i ? "Uploading..." : "Replace"}
                            </button>
                            <button type="button" onClick={() => {
                              const slides = [...(form.storyData?.questionSlides ?? [])];
                              slides[i] = { ...slides[i], imageUrl: undefined };
                              update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), questionSlides: slides });
                            }}
                              className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-[11px] text-destructive transition-colors hover:bg-destructive/10">
                              <Trash2 className="size-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setUploadTarget({ section: "question", index: i }); storyFileInputRef.current?.click(); }} disabled={uploading}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/30 px-4 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                          {uploading && uploadTarget?.section === "question" && uploadTarget?.index === i ? <Spinner className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                          {uploading && uploadTarget?.section === "question" && uploadTarget?.index === i ? "Uploading..." : "Add image"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {(form.storyData?.questionSlides ?? []).length < 5 && (
                <button type="button" onClick={() => {
                  const slides = [...(form.storyData?.questionSlides ?? [])];
                  slides.push({ content: "" });
                  update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), questionSlides: slides });
                }}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  + Add question slide
                </button>
              )}
            </div>
            <hr className="border-muted" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Answer Slides <span className="text-muted-foreground font-normal">(1–5, shown after thinking)</span></label>
              <p className="mb-3 text-xs text-muted-foreground">These slides reveal the explanation or resolution.</p>
              <div className="space-y-3">
                {(form.storyData?.answerSlides ?? []).map((slide, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slide {i + 1}</span>
                      <button type="button" onClick={() => {
                        const slides = [...(form.storyData?.answerSlides ?? [])];
                        slides.splice(i, 1);
                        update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), answerSlides: slides });
                      }} disabled={form.storyData!.answerSlides.length <= 1}
                        className="text-xs text-destructive hover:underline disabled:opacity-30">
                        Remove
                      </button>
                    </div>
                    <textarea value={slide.content} onChange={(e) => {
                      const slides = [...(form.storyData?.answerSlides ?? [])];
                      slides[i] = { ...slides[i], content: e.target.value };
                      update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), answerSlides: slides });
                    }}
                      placeholder="Write the answer/reveal content for this slide..."
                      rows={4}
                      className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                    <div className="mt-2">
                      <CopyPromptButton subject={slide.content || "Story slide"} />
                      {slide.imageUrl ? (
                        <div>
                          <img src={slide.imageUrl} alt="" className="h-32 rounded-lg object-contain bg-muted" />
                          <div className="mt-1.5 flex gap-1.5">
                            <button type="button" onClick={() => { setUploadTarget({ section: "answer", index: i }); storyFileInputRef.current?.click(); }} disabled={uploading}
                              className="flex items-center gap-1 rounded-lg border border-muted-foreground/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                              {uploading && uploadTarget?.section === "answer" && uploadTarget?.index === i ? <Spinner className="size-3 animate-spin" /> : <ImageUp className="size-3" />}
                              {uploading && uploadTarget?.section === "answer" && uploadTarget?.index === i ? "Uploading..." : "Replace"}
                            </button>
                            <button type="button" onClick={() => {
                              const slides = [...(form.storyData?.answerSlides ?? [])];
                              slides[i] = { ...slides[i], imageUrl: undefined };
                              update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), answerSlides: slides });
                            }}
                              className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-[11px] text-destructive transition-colors hover:bg-destructive/10">
                              <Trash2 className="size-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setUploadTarget({ section: "answer", index: i }); storyFileInputRef.current?.click(); }} disabled={uploading}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/30 px-4 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                          {uploading && uploadTarget?.section === "answer" && uploadTarget?.index === i ? <Spinner className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                          {uploading && uploadTarget?.section === "answer" && uploadTarget?.index === i ? "Uploading..." : "Add image"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {(form.storyData?.answerSlides ?? []).length < 5 && (
                <button type="button" onClick={() => {
                  const slides = [...(form.storyData?.answerSlides ?? [])];
                  slides.push({ content: "" });
                  update("storyData", { ...(form.storyData ?? { questionSlides: [], answerSlides: [] }), answerSlides: slides });
                }}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  + Add answer slide
                </button>
              )}
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Crossword Grid</label>
              <p className="mb-3 text-xs text-muted-foreground">Click cells to toggle blocked/open. Select an open cell to add a clue.</p>
              <CrosswordForm value={form.crosswordData || defaultCrossword} onChange={(cd) => update("crosswordData", cd)} />
            </div>
          </>
        )}

        {/* Lesson fields — collapsible */}
        {(isQuiz || isTypeAnswer || isCrossword || isSudoku || isRiddle || isWonder || isCipher || isStory) && (
          <>
            <hr className="border-muted" />
            <div className="rounded-xl border bg-card">
              <button type="button" onClick={() => setLessonOpen(!lessonOpen)}
                className="flex w-full items-center justify-between px-5 py-4 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Learning Path <span className="font-normal normal-case">(optional)</span>
                </span>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", lessonOpen && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {lessonOpen && (
                  <motion.div key="lesson-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="space-y-5 px-5 pb-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-1.5 block text-sm font-medium">
                            Lesson Group <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          {lessonGroups.length > 0 ? (
                            <select value={form.lessonGroup ?? ""} onChange={(e) => {
                              const selected = lessonGroups.find((g) => g.name === e.target.value);
                              update("lessonGroup", e.target.value || undefined);
                              if (selected) update("lessonGroupOrder", selected.order);
                            }}
                              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
                              <option value="">-- Select lesson group --</option>
                              {lessonGroups.map((g) => (<option key={g.name} value={g.name}>Lesson {g.order}: {g.name}</option>))}
                            </select>
                          ) : (
                            <input value={form.lessonGroup ?? ""} onChange={(e) => update("lessonGroup", e.target.value)}
                              placeholder="e.g. Counting"
                              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {lessonGroups.length > 0 ? "Select from the configured lesson groups." : "Configure lesson groups in Settings first."}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Sub-lesson Order <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        {form.lessonGroup && availableOrders.length > 0 ? (
                          <select value={form.lessonOrder ?? ""} onChange={(e) => update("lessonOrder", e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10">
                            <option value="">-- Select order --</option>
                            {availableOrders.map((o) => (<option key={o} value={o}>Sub-lesson {o}</option>))}
                          </select>
                        ) : form.lessonGroup && availableOrders.length === 0 ? (
                          <div className="rounded-xl border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                            All orders 1–10 are taken for this group. Edit an existing puzzle to free one up.
                          </div>
                        ) : (
                          <input value={form.lessonOrder ?? ""} onChange={(e) => update("lessonOrder", e.target.value ? Number(e.target.value) : undefined)}
                            type="number" min={1} max={10} placeholder="e.g. 1"
                            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {form.lessonGroup ? "Position within the lesson group." : "Select a lesson group first to see available orders."}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Lesson Content <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <textarea value={form.lessonContent ?? ""} onChange={(e) => update("lessonContent", e.target.value)}
                          placeholder={"One fact per line\ne.g.\nThe sun is a star at the center of our solar system.\nIt provides light and heat that makes life on Earth possible.\nThe sun is about 4.6 billion years old."}
                          rows={5}
                          className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Each line becomes a numbered fact shown before the quiz.
                        </p>
                      </div>
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-sm font-medium">
                            Lesson Image <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <CopyPromptButton subject={`Lesson illustration for: ${form.title} - ${form.lessonContent ?? ""}`} />
                        </div>
                        <input ref={lessonFileInputRef} type="file" accept="image/*" onChange={handleLessonImageUpload} className="hidden" />
                        {form.lessonImageUrl ? (
                          <div>
                            <img src={form.lessonImageUrl} alt="Lesson preview" className="max-h-48 w-full rounded-xl object-contain bg-muted" />
                            <div className="mt-2 flex gap-2">
                              <button type="button" onClick={() => lessonFileInputRef.current?.click()} disabled={lessonUploading}
                                className="flex items-center gap-1.5 rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
                                {lessonUploading ? <Spinner className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                                {lessonUploading ? "Uploading..." : "Replace image"}
                              </button>
                              <button type="button" onClick={() => update("lessonImageUrl", undefined)}
                                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10">
                                <Trash2 className="size-3.5" />
                                Remove image
                              </button>
                            </div>
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
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Puzzle
        </button>
      </form>
      {LeaveWarningModal}
    </main>
  );
}
