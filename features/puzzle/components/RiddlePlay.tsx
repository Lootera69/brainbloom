"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Zap, ArrowRight, CheckCircle2, XCircle, Sparkles, Eye, Info } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onWrongAttempt?: () => void;
  isRepeat?: boolean;
}

type RiddleState = "thinking" | "revealing" | "assessing" | "result";

function RevealText({ text, onDone }: { text: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const toRef = useRef(0);

  useEffect(() => {
    const chars = text.split("");
    let i = 0;
    function tick() {
      if (i < chars.length) {
        setDisplayed(chars.slice(0, i + 1).join(""));
        i++;
        toRef.current = window.setTimeout(tick, 45);
      } else {
        onDone();
      }
    }
    toRef.current = window.setTimeout(tick, 45);
    return () => { window.clearTimeout(toRef.current); };
  }, [text, onDone]);

  return (
    <span className="relative">
      {displayed}
      <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary" />
    </span>
  );
}

export function RiddlePlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [state, setState] = useState<RiddleState>("thinking");
  const [hintRevealed, setHintRevealed] = useState(false);
  const [revealDone, setRevealDone] = useState(false);
  const [correct, setCorrect] = useState(false);
  const revealDoneRef = useRef(false);

  const earned = correct && !isRepeat ? puzzle.xpReward : 0;
  const hints = puzzle.hintText?.split("\n").filter(Boolean) ?? [];

  const handleRevealDone = useCallback(() => {
    revealDoneRef.current = true;
    setRevealDone(true);
  }, []);

  const handleReveal = () => {
    setState("revealing");
    import("@/services/sound-service").then(({ playRiddleReveal }) => playRiddleReveal());
  };

  const handleHint = () => {
    setHintRevealed(true);
    import("@/services/sound-service").then(({ playClick }) => playClick());
  };

  const handleAssess = (gotIt: boolean) => {
    setCorrect(gotIt);
    setState("result");
    if (!gotIt) {
      onWrongAttempt?.();
      import("@/services/sound-service").then(({ playWrong, playHeartbreak }) => {
        playWrong();
        playHeartbreak();
      });
    } else {
      import("@/services/sound-service").then(({ playRiddleCorrect }) => {
        playRiddleCorrect();
        setTimeout(() => import("@/services/sound-service").then(({ playComplete }) => playComplete()), 500);
      });
    }
  };

  const handleContinue = () => {
    onComplete(correct, earned);
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Riddle card */}
      <GlassCard className="mb-6 overflow-hidden p-6 text-center sm:p-8">
        {isRepeat && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Info className="size-3.5" />
            Re-doing this task will not award any extra points
          </motion.div>
        )}

        {puzzle.imageUrl && (
          <img src={puzzle.imageUrl} alt="Riddle image"
            className="mx-auto mb-4 max-h-48 w-full rounded-xl object-contain" />
        )}

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Riddle &middot; {puzzle.difficulty}
        </p>

        {/* Riddle text — always visible */}
        <motion.div
          animate={state === "thinking" ? { scale: 1 } : { scale: 0.92, opacity: 0.7 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {state === "revealing" || state === "assessing" || state === "result" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20"
              >
                <Eye className="size-7 text-primary" />
              </motion.div>
            </div>
          ) : null}

          <h2 className={cn(
            "font-heading text-lg font-bold leading-relaxed transition-all sm:text-2xl",
            state !== "thinking" && "opacity-40",
          )}>
            {puzzle.question}
          </h2>
        </motion.div>

        {/* Hints */}
        <AnimatePresence>
          {hintRevealed && hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-left">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Lightbulb className="size-3.5" /> Hint
                </p>
                {hints.map((h, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {h}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Phase-specific content */}
      <AnimatePresence mode="wait">
        {/* Thinking phase */}
        {state === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-3"
          >
            {!hintRevealed && hints.length > 0 && (
              <motion.button
                onClick={handleHint}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-sm font-medium text-amber-600 transition-all hover:bg-amber-500/10 dark:text-amber-400"
              >
                <Lightbulb className="size-4" />
                I need a hint
              </motion.button>
            )}

            <motion.button
              onClick={handleReveal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]"
            >
              <Eye className="size-5" />
              Reveal Answer
            </motion.button>
          </motion.div>
        )}

        {/* Revealing phase — typewriter effect */}
        {state === "revealing" && (
          <motion.div
            key="revealing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <GlassCard className="p-6 text-center sm:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-3 flex items-center justify-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                </div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  The answer is...
                </p>
                <p className="font-heading text-xl font-bold leading-relaxed sm:text-2xl">
                  <RevealText text={puzzle.correctAnswer} onDone={handleRevealDone} />
                </p>
              </motion.div>
            </GlassCard>
          </motion.div>
        )}

        {/* Self-assessment phase */}
        {state === "assessing" && (
          <motion.div
            key="assessing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <GlassCard className="p-6 text-center sm:p-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="mb-2 text-lg font-semibold">{puzzle.correctAnswer}</p>
                <p className="mb-6 text-sm text-muted-foreground">Did you get it right?</p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => handleAssess(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-success/10 p-4 text-sm font-semibold text-success transition-all hover:bg-success/20"
                  >
                    <CheckCircle2 className="size-5" /> I got it
                  </motion.button>
                  <motion.button
                    onClick={() => handleAssess(false)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20"
                  >
                    <XCircle className="size-5" /> Nope
                  </motion.button>
                </div>
              </motion.div>
            </GlassCard>
          </motion.div>
        )}

        {/* Result phase */}
        {state === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className={cn(
              "rounded-2xl border p-5",
              correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
            )}>
              <div className="flex items-start gap-3">
                <span className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}>
                  {correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-semibold",
                    correct ? "text-success" : "text-destructive",
                  )}>
                    {correct ? "You got it!" : "Close! Here's the answer:"}
                  </p>
                  {!correct && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                    </p>
                  )}
                  {correct && !isRepeat && (
                    <p className="mt-0.5 text-xs font-medium text-success">
                      <Zap className="mr-0.5 inline size-3" />+{earned} XP
                    </p>
                  )}
                  {correct && isRepeat && (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                      Already solved — no extra XP
                    </p>
                  )}
                </div>
              </div>

              {correct && puzzle.correctExplanation && (
                <div className="mt-3 rounded-xl bg-success/[0.08] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {puzzle.correctExplanation}
                </div>
              )}
              {!correct && puzzle.incorrectExplanation && (
                <div className="mt-3 rounded-xl bg-destructive/[0.08] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  {puzzle.incorrectExplanation}
                </div>
              )}
            </div>

            <motion.button
              onClick={handleContinue}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]"
            >
              Continue <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-transition from revealing to assessing */}
      {state === "revealing" && revealDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4"
        >
          <motion.button
            onClick={() => setState("assessing")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]"
          >
            Continue <ArrowRight className="size-4" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
