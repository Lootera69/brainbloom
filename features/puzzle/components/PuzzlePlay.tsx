"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, ArrowRight, Info } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { CrosswordPlay } from "./CrosswordPlay";
import { TypeAnswerPlay } from "./TypeAnswerPlay";
import { SudokuPlay } from "./SudokuPlay";
import { RiddlePlay } from "./RiddlePlay";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onWrongAttempt?: () => void;
  isRepeat?: boolean;
}

function QuizPlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === puzzle.correctAnswer;
  const earned = isCorrect && !isRepeat ? puzzle.xpReward : 0;

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    if (selected !== puzzle.correctAnswer) onWrongAttempt?.();
  };

  const handleChoicePick = (choice: string) => {
    if (submitted) return;
    setSelected(choice);
  };

  const getChoiceClass = (choice: string) => {
    if (!submitted) {
      return selected === choice
        ? "ring-2 ring-primary border-primary bg-primary/10"
        : "border-border bg-card hover:bg-muted";
    }
    if (choice === puzzle.correctAnswer) {
      return "ring-2 ring-success border-success bg-success/10 text-success";
    }
    if (choice === selected && !isCorrect) {
      return "ring-2 ring-destructive border-destructive bg-destructive/10 text-destructive";
    }
    return "border-border bg-card/50 opacity-50";
  };

  const getChoiceIcon = (choice: string) => {
    if (!submitted) return <span className="size-4" />;
    if (choice === puzzle.correctAnswer) return <CheckCircle2 className="size-5 text-success" />;
    if (choice === selected && !isCorrect) return <XCircle className="size-5 text-destructive" />;
    return <span className="size-4" />;
  };

  const letter = (choice: string) => String.fromCharCode(65 + puzzle.choices.indexOf(choice));

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
          {puzzle.difficulty} &middot; {puzzle.type === "true-false" ? "True / False" : "Multiple Choice"}
        </p>
        <h2 className="font-heading text-xl font-bold sm:text-2xl">{puzzle.question}</h2>
      </GlassCard>

      {/* Choices */}
      <div className="space-y-3">
        {puzzle.choices.map((choice) => (
          <motion.button key={choice} onClick={() => handleChoicePick(choice)}
            whileHover={submitted ? {} : { scale: 1.01 }} whileTap={submitted ? {} : { scale: 0.99 }}
            className={cn("flex w-full items-center gap-4 rounded-2xl border p-4 text-left text-sm font-medium transition-all sm:p-5", getChoiceClass(choice))}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
              {letter(choice)}
            </span>
            <span className="flex-1">{choice}</span>
            {getChoiceIcon(choice)}
          </motion.button>
        ))}
      </div>

      {/* Feedback bar — slides in after submit */}
      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mt-4">
            <div className={`rounded-2xl border p-5 ${
              isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
            }`}>
              <div className="flex items-start gap-3">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {isCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${isCorrect ? "text-success" : "text-destructive"}`}>
                    {isCorrect ? "Correct!" : "Not quite!"}
                  </p>
                  {!isCorrect && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      The correct answer is <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                    </p>
                  )}
                  {isCorrect && !isRepeat && (
                    <p className="mt-0.5 text-xs font-medium text-success">
                      <Zap className="mr-0.5 inline size-3" />+{earned} XP
                    </p>
                  )}
                  {isCorrect && isRepeat && (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Already solved — no extra XP</p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              {isCorrect && puzzle.correctExplanation && (
                <div className="mt-3 rounded-xl bg-success/[0.08] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {puzzle.correctExplanation}
                </div>
              )}
              {!isCorrect && puzzle.incorrectExplanation && (
                <div className="mt-3 rounded-xl bg-destructive/[0.08] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {puzzle.incorrectExplanation}
                </div>
              )}
            </div>

            <motion.button onClick={() => onComplete(isCorrect, earned)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]">
              Continue <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button — hidden after submit */}
      {!submitted && (
        <motion.button onClick={handleSubmit} disabled={!selected}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-40">
          <Zap className="size-5" /> Submit Answer
        </motion.button>
      )}
    </div>
  );
}

export function PuzzlePlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const handleComplete = (correct: boolean, xpEarned: number) => {
    if (correct) {
      import("@/services/sound-service").then(({ playCorrect, playComplete }) => {
        playCorrect();
        setTimeout(playComplete, 400);
      });
    }
    onComplete(correct, xpEarned);
  };

  const handleWrongAttempt = () => {
    import("@/services/sound-service").then(({ playWrong, playHeartbreak }) => {
      playWrong();
      playHeartbreak();
    });
    onWrongAttempt?.();
  };

  if (puzzle.type === "crossword") {
    return <CrosswordPlay puzzle={puzzle} onComplete={handleComplete} onWrongAttempt={handleWrongAttempt} isRepeat={isRepeat} />;
  }
  if (puzzle.type === "type-answer") {
    return <TypeAnswerPlay puzzle={puzzle} onComplete={handleComplete} onWrongAttempt={handleWrongAttempt} isRepeat={isRepeat} />;
  }
  if (puzzle.type === "sudoku") {
    return <SudokuPlay puzzle={puzzle} onComplete={handleComplete} onWrongAttempt={handleWrongAttempt} isRepeat={isRepeat} />;
  }
  if (puzzle.type === "riddle") {
    return <RiddlePlay puzzle={puzzle} onComplete={handleComplete} onWrongAttempt={handleWrongAttempt} isRepeat={isRepeat} />;
  }
  return <QuizPlay puzzle={puzzle} onComplete={handleComplete} onWrongAttempt={handleWrongAttempt} isRepeat={isRepeat} />;
}
