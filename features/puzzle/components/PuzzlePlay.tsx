"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, ArrowRight, Info } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  isRepeat?: boolean;
}

export function PuzzlePlay({ puzzle, onComplete, isRepeat }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === puzzle.correctAnswer;
  const earned = isCorrect && !isRepeat ? puzzle.xpReward : 0;

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
  };

  const handleChoicePick = (choice: string) => {
    if (submitted) return;
    setSelected(choice);
  };

  const handleContinue = () => {
    onComplete(isCorrect, earned);
  };

  const getChoiceClass = (choice: string) => {
    if (!submitted) {
      return selected === choice
        ? "border-primary bg-primary/10 text-primary"
        : "border-transparent bg-card hover:bg-muted";
    }
    if (choice === puzzle.correctAnswer) {
      return "border-success bg-success/10 text-success";
    }
    if (choice === selected && !isCorrect) {
      return "border-destructive bg-destructive/10 text-destructive";
    }
    return "border-transparent bg-card opacity-50";
  };

  const getIcon = (choice: string) => {
    if (!submitted) return null;
    if (choice === puzzle.correctAnswer) return <CheckCircle2 className="size-5 text-success" />;
    if (choice === selected && !isCorrect) return <XCircle className="size-5 text-destructive" />;
    return null;
  };

  return (
    <div className="mx-auto max-w-lg">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard className="mb-6 p-6 text-center sm:p-8">
              {isRepeat && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
                >
                  <Info className="size-3.5" />
                  Re-doing this task will not award any extra points
                </motion.div>
              )}
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {puzzle.difficulty} &middot; {puzzle.type === "true-false" ? "True / False" : "Multiple Choice"}
              </p>
              <h2 className="font-heading text-xl font-bold sm:text-2xl">
                {puzzle.question}
              </h2>
            </GlassCard>

            <div className="space-y-3">
              {puzzle.choices.map((choice) => (
                <motion.button
                  key={choice}
                  onClick={() => handleChoicePick(choice)}
                  whileHover={submitted ? {} : { scale: 1.01 }}
                  whileTap={submitted ? {} : { scale: 0.99 }}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border p-4 text-left text-sm font-medium transition-all sm:p-5",
                    getChoiceClass(choice),
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
                    {String.fromCharCode(65 + puzzle.choices.indexOf(choice))}
                  </span>
                  <span className="flex-1">{choice}</span>
                  {getIcon(choice)}
                </motion.button>
              ))}
            </div>

            <motion.button
              onClick={handleSubmit}
              disabled={!selected}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-40"
            >
              <Zap className="size-5" />
              Submit Answer
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <GlassCard className={`p-8 sm:p-10 ${isCorrect ? "ring-1 ring-success/30" : "ring-1 ring-destructive/20"}`}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full"
              >
                {isCorrect ? (
                  <CheckCircle2 className="size-16 text-success" />
                ) : (
                  <XCircle className="size-16 text-destructive" />
                )}
              </motion.div>

              <h2 className="font-heading text-2xl font-bold">
                {isCorrect ? "Correct!" : "Not quite!"}
              </h2>

              {isCorrect && !isRepeat ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 flex items-center justify-center gap-2 text-lg font-semibold text-success"
                >
                  <Zap className="size-5" />
                  +{puzzle.xpReward} XP
                </motion.p>
              ) : isCorrect && isRepeat ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 text-sm text-amber-600 dark:text-amber-400"
                >
                  Already solved &mdash; no extra XP earned
                </motion.p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  The correct answer was:{" "}
                  <span className="font-semibold text-foreground">
                    {puzzle.correctAnswer}
                  </span>
                </p>
              )}

              <motion.button
                onClick={handleContinue}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]"
              >
                Continue
                <ArrowRight className="size-4" />
              </motion.button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
