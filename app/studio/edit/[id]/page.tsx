"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import { getPuzzle, updatePuzzle, deletePuzzle, CATEGORIES, DIFFICULTIES } from "@/services/puzzle-service";
import { type PuzzleFormData, type PuzzleType, type CrosswordData } from "@/types/puzzle";
import { CrosswordForm } from "@/features/puzzle/components/CrosswordForm";

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
  const [notFound, setNotFound] = useState(false);
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
        crosswordData: puzzle.crosswordData ? { ...puzzle.crosswordData, grid: puzzle.crosswordData.grid.map((r) => [...r]) } : undefined,
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.type === "crossword" && (!form.crosswordData || form.crosswordData.clues.length === 0)) {
      return;
    }
    setSaving(true);
    await updatePuzzle(id, form);
    setSaving(false);
    router.push("/studio");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this puzzle permanently?")) return;
    await deletePuzzle(id);
    router.push("/studio");
  };

  const handleTypeChange = (type: PuzzleType) => {
    if (type === "crossword") {
      setForm((f) => ({ ...f, type, crosswordData: defaultCrossword }));
    } else {
      const choices = type === "true-false" ? ["True", "False"] : ["", "", "", ""];
      setForm((f) => ({ ...f, type, choices, correctAnswer: "", crosswordData: undefined }));
    }
  };

  const isQuiz = form.type === "multiple-choice" || form.type === "true-false";

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
            {(["multiple-choice", "true-false", "crossword"] as const).map((t) => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  form.type === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                {t === "multiple-choice" ? "Multiple Choice" : t === "true-false" ? "True / False" : "Crossword"}
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
            <select value={form.difficulty} onChange={(e) => {
              const diff = DIFFICULTIES.find((d) => d.value === e.target.value)!;
              update("difficulty", diff.value as "easy" | "medium" | "hard"); update("xpReward", diff.xp);
            }} className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary">
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.xp} XP)</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <input value={form.title} onChange={(e) => update("title", e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
        </div>

        {isQuiz ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Question</label>
              <textarea value={form.question} onChange={(e) => update("question", e.target.value)}
                rows={4} className="w-full resize-none rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" required />
            </div>

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
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Crossword Grid</label>
            <p className="mb-3 text-xs text-muted-foreground">
              Click cells to toggle blocked/open. Select an open cell to add a clue.
            </p>
            <CrosswordForm
              value={form.crosswordData || defaultCrossword}
              onChange={(cd) => update("crosswordData", cd)}
            />
          </div>
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
