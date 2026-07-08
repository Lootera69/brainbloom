"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, ArrowRight, Info } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { checkAnswer } from "@/lib/utils";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onWrongAttempt?: () => void;
  isRepeat?: boolean;
}

export function TypeAnswerPlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = checkAnswer(input, puzzle.correctAnswer, puzzle.acceptedAnswers);
  const earned = result.correct && !isRepeat ? puzzle.xpReward : 0;

  const handleSubmit = () => {
    if (!input.trim() || submitted) return;
    setSubmitted(true);
    if (!result.correct) onWrongAttempt?.();
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Question card — always visible */}
      <GlassCard className="mb-6 p-6 text-center sm:p-8">
        {isRepeat && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Info className="size-3.5" />
            Re-doing this task will not award any extra points
          </motion.div>
        )}
        {puzzle.imageUrl && (
          <img src={puzzle.imageUrl} alt="Question image"
            className="mx-auto mb-4 max-h-64 w-full rounded-xl object-contain" />
        )}
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {puzzle.difficulty} &middot; Type Answer
        </p>
        <h2 className="font-heading text-xl font-bold sm:text-2xl">{puzzle.question}</h2>
      </GlassCard>

      {/* Input — always visible */}
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Type your answer..."
          disabled={submitted}
          className="w-full rounded-2xl border bg-card px-5 py-4 text-center text-lg font-medium outline-none transition-colors focus:border-primary disabled:opacity-60"
          autoFocus
        />
      </div>

      {/* Feedback bar */}
      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-4">
            <div className={`rounded-2xl border p-5 ${
              result.correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
            }`}>
              <div className="flex items-start gap-3">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  result.correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {result.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${result.correct ? "text-success" : "text-destructive"}`}>
                    {result.correct ? "Correct!" : "Not quite!"}
                  </p>
                  {!result.correct && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.close ? "You were quite close! " : ""}
                      The correct answer is <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                    </p>
                  )}
                  {result.correct && !isRepeat && (
                    <p className="mt-0.5 text-xs font-medium text-success">
                      <Zap className="mr-0.5 inline size-3" />+{earned} XP
                    </p>
                  )}
                  {result.correct && isRepeat && (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Already solved — no extra XP</p>
                  )}
                </div>
              </div>

              {puzzle.acceptedAnswers && puzzle.acceptedAnswers.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Also accepted: {puzzle.acceptedAnswers.join(", ")}
                </p>
              )}

              {/* Explanation */}
              {result.correct && puzzle.correctExplanation && (
                <div className="mt-3 rounded-xl bg-success/[0.08] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {puzzle.correctExplanation}
                </div>
              )}
              {!result.correct && puzzle.incorrectExplanation && (
                <div className="mt-3 rounded-xl bg-destructive/[0.08] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {puzzle.incorrectExplanation}
                </div>
              )}
            </div>

            <motion.button onClick={() => onComplete(result.correct, earned)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]">
              Continue <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button — hidden after submit */}
      {!submitted && (
        <motion.button onClick={handleSubmit} disabled={!input.trim()}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-40">
          <Zap className="size-5" /> Submit Answer
        </motion.button>
      )}
    </div>
  );
}
