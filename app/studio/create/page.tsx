"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ImageUp, X, Loader as Spinner } from "lucide-react";
import { createPuzzle, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { uploadToImgbb } from "@/services/imgbb";
import { type PuzzleFormData, type PuzzleType, type CrosswordData } from "@/types/puzzle";
import { CrosswordForm } from "@/features/puzzle/components/CrosswordForm";
import { toast } from "sonner";

const defaultCrossword: CrosswordData = {
  size: 10,
  grid: Array.from({ length: 10 }, () => Array(10).fill("")),
  clues: [],
};

export default function CreatePuzzlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    await createPuzzle(form);
    setSaving(false);
    router.push("/studio");
  };

  const handleTypeChange = (type: PuzzleType) => {
    if (type === "crossword") {
      setForm((f) => ({ ...f, type, crosswordData: defaultCrossword }));
    } else if (type === "type-answer") {
      setForm((f) => ({
        ...f,
        type,
        choices: [],
        correctAnswer: "",
        crosswordData: undefined,
      }));
    } else {
      const choices = type === "true-false" ? ["True", "False"] : ["", "", "", ""];
      setForm((f) => ({ ...f, type, choices, correctAnswer: "", crosswordData: undefined }));
    }
  };

  const isQuiz = form.type === "multiple-choice" || form.type === "true-false";
  const isTypeAnswer = form.type === "type-answer";
  const isCrossword = form.type === "crossword";

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={() => router.push("/studio")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to puzzles
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">New Puzzle</h1>
        <p className="text-sm text-muted-foreground">Fill in the details below.</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <div className="flex gap-2">
            {(["multiple-choice", "true-false", "type-answer", "crossword"] as const).map((t) => (
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
                {t === "multiple-choice" ? "Multiple Choice" : t === "true-false" ? "True / False" : t === "type-answer" ? "Type Answer" : "Crossword"}
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

        {(isQuiz || isTypeAnswer) && (
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
                value={(form.acceptedAnswers ?? []).join(", ")}
                onChange={(e) => update("acceptedAnswers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="e.g. BTW, By the way"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Crossword Grid</label>
              <p className="mb-3 text-xs text-muted-foreground">Click cells to toggle blocked/open. Select an open cell to add a clue.</p>
              <CrosswordForm value={form.crosswordData || defaultCrossword} onChange={(cd) => update("crosswordData", cd)} />
            </div>
          </>
        )}

        {/* Lesson fields */}
        {(isQuiz || isTypeAnswer) && (
          <>
            <hr className="border-muted" />
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Lesson Content <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={form.lessonContent ?? ""}
                onChange={(e) => update("lessonContent", e.target.value)}
                placeholder="One fact per line&#10;e.g.&#10;The sun is a star at the center of our solar system.&#10;It provides light and heat that makes life on Earth possible.&#10;The sun is about 4.6 billion years old."
                rows={5}
                className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Each line becomes a numbered fact shown before the quiz. Add an image above to illustrate the lesson.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Lesson Order <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                value={form.lessonOrder ?? ""}
                onChange={(e) => update("lessonOrder", e.target.value ? Number(e.target.value) : undefined)}
                type="number"
                min={1}
                max={999}
                placeholder="e.g. 1"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Puzzles with lesson order appear in the Learning Path. Lower numbers come first.
              </p>
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
