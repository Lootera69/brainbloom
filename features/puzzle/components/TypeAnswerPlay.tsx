"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, ArrowRight, Info, Star, Sparkles, Brain } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn, checkAnswer } from "@/lib/utils";

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

export function TypeAnswerPlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = checkAnswer(input, puzzle.correctAnswer, puzzle.acceptedAnswers);
  const earned = result.correct && !isRepeat ? puzzle.xpReward : 0;
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitted]);

  const handleSubmit = () => {
    if (!input.trim() || submitted) return;
    setSubmitted(true);
    if (!result.correct) {
      onWrongAttempt?.();
    } else {
      import("@/services/sound-service").then(({ playCorrect }) => playCorrect());
    }
  };

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
          submitted && result.correct && "ring-1 ring-success/20",
          submitted && !result.correct && "ring-1 ring-destructive/20",
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
                submitted && result.correct && "bg-success/10",
                submitted && !result.correct && "bg-destructive/10",
              )}
            >
              {!submitted && <Brain className="size-4 sm:size-5 text-primary" />}
              {submitted && result.correct && <CheckCircle2 className="size-4 sm:size-5 text-success" />}
              {submitted && !result.correct && <XCircle className="size-4 sm:size-5 text-destructive" />}
            </motion.div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {!submitted && "Type your answer"}
              {submitted && result.correct && "Correct!"}
              {submitted && !result.correct && "Not quite!"}
            </span>
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {puzzle.difficulty} &middot; Type Answer
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

      {/* Input */}
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Type your answer..."
          disabled={submitted}
          className="w-full rounded-2xl border bg-card px-5 py-4 text-center text-lg font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          autoFocus
        />
      </div>

      {/* Feedback bar */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            ref={resultRef}
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
                result.correct
                  ? "border-success/30 bg-gradient-to-b from-success/5 to-transparent"
                  : "border-destructive/30 bg-gradient-to-b from-destructive/5 to-transparent",
              )}
            >
              {result.correct && (
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
                    result.correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {result.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-base font-semibold", result.correct ? "text-success" : "text-destructive")}>
                    {result.correct ? "Correct!" : "Not quite!"}
                  </p>
                  {!result.correct && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-1 text-sm text-muted-foreground"
                    >
                      {result.close ? "You were quite close! " : ""}
                      The correct answer is <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                    </motion.p>
                  )}
                  {result.correct && !isRepeat && (
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
                  {result.correct && isRepeat && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Already solved — no extra XP</p>
                  )}
                </div>
              </div>

              {/* Also accepted */}
              {result.correct && puzzle.acceptedAnswers && puzzle.acceptedAnswers.length > 0 && (
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

              {/* Explanation */}
              {result.correct && puzzle.correctExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl bg-success/[0.08] px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {puzzle.correctExplanation}
                </motion.div>
              )}
              {!result.correct && puzzle.incorrectExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl bg-destructive/[0.08] px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {puzzle.incorrectExplanation}
                </motion.div>
              )}
            </motion.div>

            <motion.button onClick={() => onComplete(result.correct, earned)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]">
              Continue <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      {!submitted && (
        <motion.button onClick={handleSubmit} disabled={!input.trim()}
          whileHover={!input.trim() ? {} : { scale: 1.02 }}
          whileTap={!input.trim() ? {} : { scale: 0.97 }}
          className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-40">
          {input.trim() && (
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
