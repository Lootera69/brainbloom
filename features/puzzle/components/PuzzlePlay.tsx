"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, ArrowRight, Info, Sparkles, Brain, Star } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { CrosswordPlay } from "./CrosswordPlay";
import { TypeAnswerPlay } from "./TypeAnswerPlay";
import { SudokuPlay } from "./SudokuPlay";
import { RiddlePlay } from "./RiddlePlay";
import { WonderPlay } from "./WonderPlay";
import { CipherPlay } from "./CipherPlay";
import { setHeartsLostFlag, setPuzzleHasLesson } from "@/store/user-store";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onWrongAttempt?: () => void;
  isRepeat?: boolean;
}

function ThinkingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.3, scale: 0.8 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
          className="size-2 rounded-full bg-primary/40"
        />
      ))}
    </div>
  );
}

function QuizPlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === puzzle.correctAnswer;
  const earned = isCorrect && !isRepeat ? puzzle.xpReward : 0;

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    if (selected !== puzzle.correctAnswer) {
      onWrongAttempt?.();
    } else {
      import("@/services/sound-service").then(({ playCorrect }) => playCorrect());
    }
  };

  const handleChoicePick = (choice: string) => {
    if (submitted) return;
    setSelected(choice);
  };

  const getChoiceClass = (choice: string) => {
    if (!submitted) {
      return selected === choice
        ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm shadow-primary/10"
        : "border-border bg-card hover:bg-muted hover:border-primary/30 hover:shadow-sm";
    }
    if (choice === puzzle.correctAnswer) {
      return "ring-2 ring-success border-success bg-success/10 text-success shadow-sm shadow-success/10";
    }
    if (choice === selected && !isCorrect) {
      return "ring-2 ring-destructive border-destructive bg-destructive/10 text-destructive shadow-sm shadow-destructive/10";
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
      {/* Question card */}
      <div className="relative">
        <div className={cn(
          "pointer-events-none absolute -inset-4 rounded-3xl opacity-0 transition-opacity duration-700",
          !submitted && "opacity-50",
        )}
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }}
        />

        <GlassCard className={cn(
          "relative mb-6 p-6 text-center transition-all duration-500 sm:p-8",
          !submitted && "ring-1 ring-primary/5",
          submitted && isCorrect && "ring-1 ring-success/20",
          submitted && !isCorrect && "ring-1 ring-destructive/20",
        )}>
          <div className={cn(
            "pointer-events-none absolute -top-20 -right-20 size-60 rounded-full opacity-0 blur-3xl transition-opacity duration-700",
            !submitted && "opacity-30",
          )}
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
          />

          {isRepeat && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="relative mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Info className="size-3.5" />
              Re-doing this task will not award any extra points
            </motion.div>
          )}

          {puzzle.imageUrl && (
            <img src={puzzle.imageUrl} alt="Question image" loading="lazy"
              className="relative mx-auto mb-4 max-h-64 w-full rounded-xl object-contain" />
          )}

          {/* Phase indicator */}
          <div className="relative mb-4 flex items-center justify-center gap-2">
            <motion.div
              animate={!submitted ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
              transition={{ duration: 3, repeat: !submitted ? Infinity : 0, ease: "easeInOut" }}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl transition-all sm:size-10",
                !submitted && "bg-gradient-to-br from-primary/20 to-purple-500/10",
                submitted && isCorrect && "bg-success/10",
                submitted && !isCorrect && "bg-destructive/10",
              )}
            >
              {!submitted && <Brain className="size-4 sm:size-5 text-primary" />}
              {submitted && isCorrect && <CheckCircle2 className="size-4 sm:size-5 text-success" />}
              {submitted && !isCorrect && <XCircle className="size-4 sm:size-5 text-destructive" />}
            </motion.div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {!submitted && (puzzle.type === "true-false" ? "True or False?" : "Choose wisely")}
              {submitted && isCorrect && "Correct!"}
              {submitted && !isCorrect && "Not quite!"}
            </span>
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {puzzle.difficulty} &middot; {puzzle.type === "true-false" ? "True / False" : "Multiple Choice"}
          </p>
          <h2 className="font-heading text-xl font-bold sm:text-2xl">{puzzle.question}</h2>

          {!submitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5"
            >
              <ThinkingDots />
            </motion.div>
          )}
        </GlassCard>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        {puzzle.choices.map((choice) => (
          <motion.button key={choice} onClick={() => handleChoicePick(choice)}
            layout
            whileHover={submitted ? {} : { scale: 1.01 }}
            whileTap={submitted ? {} : { scale: 0.99 }}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border p-4 text-left text-sm font-medium transition-all sm:p-5",
              getChoiceClass(choice),
            )}>
            <span className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors",
              !submitted && selected === choice
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
              submitted && choice === puzzle.correctAnswer
                ? "bg-success text-white"
                : "",
              submitted && choice === selected && !isCorrect
                ? "bg-destructive text-white"
                : "",
            )}>
              {letter(choice)}
            </span>
            <span className="flex-1">{choice}</span>
            {getChoiceIcon(choice)}
          </motion.button>
        ))}
      </div>

      {/* Feedback bar */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mt-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
                isCorrect
                  ? "border-success/30 bg-gradient-to-b from-success/5 to-transparent"
                  : "border-destructive/30 bg-gradient-to-b from-destructive/5 to-transparent",
              )}
            >
              {isCorrect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="absolute -top-6 -right-6"
                >
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Sparkles className="size-16 text-success/10" />
                  </motion.div>
                </motion.div>
              )}

              <div className="relative flex items-start gap-3">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {isCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-base font-semibold", isCorrect ? "text-success" : "text-destructive")}>
                    {isCorrect ? "Correct!" : "Not quite!"}
                  </p>
                  {!isCorrect && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-1 text-sm text-muted-foreground"
                    >
                      The correct answer is <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                    </motion.p>
                  )}
                  {isCorrect && !isRepeat && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-success/20 to-emerald-500/20 px-3 py-1"
                    >
                      <Zap className="size-3.5 text-success" />
                      <span className="text-sm font-bold text-success">+{earned} XP</span>
                    </motion.div>
                  )}
                  {isCorrect && isRepeat && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Already solved — no extra XP</p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              {isCorrect && puzzle.correctExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl bg-success/[0.08] px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {puzzle.correctExplanation}
                </motion.div>
              )}
              {!isCorrect && puzzle.incorrectExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl bg-destructive/[0.08] px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {puzzle.incorrectExplanation}
                </motion.div>
              )}

              {isCorrect && puzzle.acceptedAnswers && puzzle.acceptedAnswers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  Also accepted: {puzzle.acceptedAnswers.join(", ")}
                </motion.div>
              )}
            </motion.div>

            <motion.button onClick={() => onComplete(isCorrect, earned)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]">
              Continue <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      {!submitted && (
        <motion.button onClick={handleSubmit} disabled={!selected}
          className="relative mt-6 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-40">
          {selected && (
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}
          <Zap className="size-5" /> Submit Answer
        </motion.button>
      )}
    </div>
  );
}

export function PuzzlePlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  useEffect(() => { setPuzzleHasLesson(!!puzzle.lessonContent); }, [puzzle.id]);

  const handleComplete = (correct: boolean, xpEarned: number) => {
    if (correct) {
      import("@/services/sound-service").then(({ playComplete }) => {
        setTimeout(playComplete, 400);
      });
    }
    onComplete(correct, xpEarned);
  };

  const handleWrongAttempt = () => {
    setHeartsLostFlag();
    import("@/services/sound-service").then(({ playWrong, playHeartbreak }) => {
      playWrong();
      playHeartbreak();
    });
    onWrongAttempt?.();
  };

  if (puzzle.type === "cipher") {
    return <CipherPlay puzzle={puzzle} onComplete={handleComplete} onWrongAttempt={handleWrongAttempt} isRepeat={isRepeat} />;
  }
  if (puzzle.type === "wonder") {
    return <WonderPlay puzzle={puzzle} onComplete={() => onComplete(true, 0)} />;
  }
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
