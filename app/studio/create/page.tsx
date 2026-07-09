"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Loader2, ImageUp, X, Loader as Spinner, ChevronDown } from "lucide-react";
import { createPuzzle, CATEGORIES, DIFFICULTIES, getUsedLessonOrders } from "@/services/puzzle-service";
import { uploadToImgbb } from "@/services/imgbb";
import { getLessonGroups, type LessonGroupEntry } from "@/services/lesson-service";
import { type PuzzleFormData, type PuzzleType, type CrosswordData, type SudokuData } from "@/types/puzzle";
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
  const [dirty, setDirty] = useState(false);
  const { confirmLeave } = useUnsavedChanges(dirty);
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

  useEffect(() => {
    if (form.category && (isQuiz || isTypeAnswer || isCrossword || isSudoku || isRiddle)) {
      getLessonGroups(form.category).then(setLessonGroups);
    } else {
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
    if (confirmLeave()) router.push("/studio");
  };

  const handleTypeChange = (type: PuzzleType) => {
    setAcceptedRaw("");
    if (type === "crossword") {
      setForm((f) => ({ ...f, type, crosswordData: defaultCrossword, sudokuData: undefined }));
    } else if (type === "type-answer" || type === "riddle") {
      setForm((f) => ({
        ...f,
        type,
        choices: [],
        correctAnswer: "",
        crosswordData: undefined,
        sudokuData: undefined,
      }));
    } else if (type === "sudoku") {
      const sudokuData = generateSudoku(form.difficulty);
      setForm((f) => ({ ...f, type, choices: [], correctAnswer: "", crosswordData: undefined, sudokuData }));
    } else {
      const choices = type === "true-false" ? ["True", "False"] : ["", "", "", ""];
      setForm((f) => ({ ...f, type, choices, correctAnswer: "", crosswordData: undefined, sudokuData: undefined }));
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={handleBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to puzzles
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">New Puzzle</h1>
        <p className="text-sm text-muted-foreground">Fill in the details below.</p>
      </motion.div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <div className="flex gap-2 flex-wrap">
            {(["multiple-choice", "true-false", "type-answer", "crossword", "sudoku", "riddle"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  form.type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {t === "multiple-choice" ? "Multiple Choice" : t === "true-false" ? "True / False" : t === "type-answer" ? "Type Answer" : t === "crossword" ? "Crossword" : t === "sudoku" ? "Sudoku" : "Riddle"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
              onChange={(e) => update("difficulty", e.target.value as "easy" | "medium" | "hard")}
              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
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

        {(isQuiz || isTypeAnswer || isRiddle) && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. What comes next in the sequence?"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Question</label>
              <textarea value={form.question} onChange={(e) => update("question", e.target.value)}
                placeholder="Write the full question here..." rows={4}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
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
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Correct Answer</label>
              <select value={form.correctAnswer} onChange={(e) => update("correctAnswer", e.target.value)}
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required>
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Alternate accepted answers (optional, comma-separated)</label>
              <input
                value={acceptedRaw}
                onChange={(e) => setAcceptedRaw(e.target.value)}
                onBlur={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. wind, breeze"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Alternate correct answers for the riddle.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Hint (optional, one clue per line)</label>
              <textarea value={form.hintText ?? ""} onChange={(e) => update("hintText", e.target.value)}
                placeholder="First hint line...&#10;Second hint line..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
              <p className="mt-1 text-xs text-muted-foreground">Each line becomes a progressive hint shown during the riddle.</p>
            </div>
          </>
        )}

        {(isQuiz || isTypeAnswer || isRiddle) && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Explanation (for correct answer)</label>
              <textarea value={form.correctExplanation ?? ""} onChange={(e) => update("correctExplanation", e.target.value)}
                placeholder="Explain why this answer is correct..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Explanation (for wrong answer)</label>
              <textarea value={form.incorrectExplanation ?? ""} onChange={(e) => update("incorrectExplanation", e.target.value)}
                placeholder="Explain what the correct answer is and why..."
                rows={3}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
            </div>
          </div>
        )}

        {isCrossword && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Sunday Crossword"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Crossword Grid</label>
              <p className="mb-3 text-xs text-muted-foreground">Click cells to toggle blocked/open. Select an open cell to add a clue.</p>
              <CrosswordForm value={form.crosswordData || defaultCrossword} onChange={(cd) => update("crosswordData", cd)} />
            </div>
          </>
        )}

        {/* Lesson fields — collapsible */}
        {(isQuiz || isTypeAnswer || isCrossword || isSudoku || isRiddle) && (
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
                              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary">
                              <option value="">-- Select lesson group --</option>
                              {lessonGroups.map((g) => (<option key={g.name} value={g.name}>Lesson {g.order}: {g.name}</option>))}
                            </select>
                          ) : (
                            <input value={form.lessonGroup ?? ""} onChange={(e) => update("lessonGroup", e.target.value)}
                              placeholder="e.g. Counting"
                              className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
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
                            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary">
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
                            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
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
                          className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Each line becomes a numbered fact shown before the quiz. Add an image above to illustrate the lesson.
                        </p>
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Puzzle
        </button>
      </form>
    </main>
  );
}
