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
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
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
            <div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Type your answer..."
                className="w-full rounded-2xl border bg-card px-5 py-4 text-center text-lg font-medium outline-none transition-colors focus:border-primary"
                autoFocus
              />
            </div>
            <motion.button onClick={handleSubmit} disabled={!input.trim()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-40">
              <Zap className="size-5" /> Submit Answer
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <GlassCard className={`p-6 sm:p-8 ${result.correct ? "ring-1 ring-success/30" : "ring-1 ring-destructive/20"}`}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full sm:size-16">
                {result.correct
                  ? <CheckCircle2 className="size-14 text-success sm:size-16" />
                  : <XCircle className="size-14 text-destructive sm:size-16" />}
              </motion.div>
              <h2 className="font-heading text-xl font-bold sm:text-2xl">{result.correct ? "Correct!" : "Not quite!"}</h2>

              {result.correct && !isRepeat ? (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="mt-2 flex items-center justify-center gap-2 text-lg font-semibold text-success">
                  <Zap className="size-5" /> +{earned} XP
                </motion.p>
              ) : result.correct && isRepeat ? (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Already solved &mdash; no extra XP earned</p>
              ) : result.close ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  You were quite close! The correct answer was:{" "}
                  <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  The correct answer was:{" "}
                  <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                </p>
              )}
              {puzzle.acceptedAnswers && puzzle.acceptedAnswers.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Also accepted: {puzzle.acceptedAnswers.join(", ")}
                </p>
              )}

              {/* Explanation */}
              {result.correct && puzzle.correctExplanation && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="mt-4 rounded-xl bg-success/5 p-4 text-left">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">Explanation</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{puzzle.correctExplanation}</p>
                </motion.div>
              )}
              {!result.correct && puzzle.incorrectExplanation && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="mt-4 rounded-xl bg-destructive/5 p-4 text-left">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-destructive">Explanation</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{puzzle.incorrectExplanation}</p>
                </motion.div>
              )}

              <motion.button onClick={() => onComplete(result.correct, earned)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]">
                Continue <ArrowRight className="size-4" />
              </motion.button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
