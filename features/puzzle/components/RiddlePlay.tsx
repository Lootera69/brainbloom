"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Zap, ArrowRight, CheckCircle2, XCircle, Sparkles, Eye, Info, Brain, Star, PartyPopper } from "lucide-react";
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
        toRef.current = window.setTimeout(tick, 40 + Math.random() * 30);
      } else {
        onDone();
      }
    }
    toRef.current = window.setTimeout(tick, 300);
    return () => { window.clearTimeout(toRef.current); };
  }, [text, onDone]);

  return (
    <span className="relative">
      <motion.span
        key={displayed}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.08 }}
      >
        {displayed}
      </motion.span>
      <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary" />
    </span>
  );
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

function SparkleBurst() {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      angle: (i / 12) * 360,
      distance: 40 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.2,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.6, delay: p.delay, ease: "easeOut" }}
          className="absolute rounded-full bg-amber-400"
          style={{ width: p.size, height: p.size }}
        />
      ))}
    </div>
  );
}

export function RiddlePlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [state, setState] = useState<RiddleState>("thinking");
  const [hintIndex, setHintIndex] = useState(0);
  const [revealDone, setRevealDone] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const revealDoneRef = useRef(false);

  const earned = correct && !isRepeat ? puzzle.xpReward : 0;
  const hints = puzzle.hintText?.split("\n").filter(Boolean) ?? [];

  const handleRevealDone = useCallback(() => {
    revealDoneRef.current = true;
    setRevealDone(true);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 800);
  }, []);

  const handleReveal = () => {
    setState("revealing");
    import("@/services/sound-service").then(({ playRiddleReveal }) => playRiddleReveal());
  };

  const handleHint = () => {
    if (hintIndex < hints.length) {
      setHintIndex((i) => i + 1);
    }
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

  const thinkingOverlay = state === "thinking" ? (
    <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-b from-primary/[0.03] to-transparent opacity-50" />
  ) : null;

  return (
    <div className="mx-auto max-w-lg">
      {/* Riddle card */}
      <div className="relative">
        {thinkingOverlay}

        <GlassCard className={cn(
          "relative mb-6 overflow-hidden p-6 text-center transition-all duration-500 sm:p-8",
          state === "thinking" && "ring-1 ring-primary/10",
          state === "revealing" && "ring-1 ring-amber-500/20",
          state === "result" && correct && "ring-1 ring-success/20",
          state === "result" && !correct && "ring-1 ring-destructive/20",
        )}>
          {/* Subtle gradient blob */}
          <div className={cn(
            "pointer-events-none absolute -top-20 -right-20 size-60 rounded-full opacity-0 blur-3xl transition-opacity duration-700",
            state === "thinking" && "opacity-30",
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
            <img src={puzzle.imageUrl} alt="Riddle image"
              className="relative mx-auto mb-4 max-h-48 w-full rounded-xl object-contain" />
          )}

          {/* Phase indicator */}
          <div className="relative mb-4 flex items-center justify-center gap-2">
            <motion.div
              animate={state === "thinking" ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
              transition={{ duration: 3, repeat: state === "thinking" ? Infinity : 0, ease: "easeInOut" }}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl transition-all sm:size-10",
                state === "thinking" && "bg-gradient-to-br from-amber-500/20 to-orange-500/10",
                state === "revealing" && "bg-primary/10",
                state === "result" && correct && "bg-success/10",
                state === "result" && !correct && "bg-destructive/10",
              )}
            >
              {state === "thinking" && <Brain className={cn("size-4 sm:size-5", "text-amber-500")} />}
              {state === "revealing" && <Eye className={cn("size-4 sm:size-5", "text-primary")} />}
              {state === "result" && correct && <PartyPopper className={cn("size-4 sm:size-5", "text-success")} />}
              {state === "result" && !correct && <Lightbulb className={cn("size-4 sm:size-5", "text-destructive")} />}
            </motion.div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {state === "thinking" && "Think about it..."}
              {state === "revealing" && "The answer is..."}
              {state === "assessing" && "How did you do?"}
              {state === "result" && (correct ? "Great job!" : "Here's the answer")}
            </span>
          </div>

          {/* Decorative opening quote */}
          {state === "thinking" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.15, y: 0 }}
              className="mb-2 text-left text-6xl font-serif leading-none text-primary sm:text-7xl"
            >
              &ldquo;
            </motion.div>
          )}

          {/* Riddle text */}
          <motion.div
            layout
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <h2 className={cn(
              "font-heading font-bold leading-relaxed transition-all duration-500",
              state === "thinking" && "text-xl sm:text-2xl text-foreground",
              state === "revealing" && "text-base sm:text-lg opacity-40",
              state === "assessing" && "text-base sm:text-lg opacity-40",
              state === "result" && "text-base sm:text-lg opacity-30",
            )}>
              {puzzle.question}
            </h2>
          </motion.div>

          {/* Closing quote */}
          {state === "thinking" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.15, y: 0 }}
              className="mt-1 text-right text-6xl font-serif leading-none text-primary sm:text-7xl"
            >
              &rdquo;
            </motion.div>
          )}

          {/* Thinking dots */}
          {state === "thinking" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <ThinkingDots />
            </motion.div>
          )}

          {/* Progressive hints */}
          <AnimatePresence>
            {hintIndex > 0 && hints.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-3 text-left">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Lightbulb className="size-3.5" /> Hint
                  </p>
                  {hints.slice(0, hintIndex).map((h, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
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
      </div>

      {/* Phase-specific content */}
      <AnimatePresence mode="wait">
        {/* Thinking phase */}
        {state === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="space-y-3"
          >
            {hintIndex < hints.length && (
              <motion.button
                onClick={handleHint}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent text-sm font-medium text-amber-600 transition-all hover:border-amber-500/40 hover:bg-amber-500/10 dark:text-amber-400"
              >
                <Lightbulb className="size-4 transition-transform group-hover:scale-110" />
                {hintIndex === 0 ? "I need a hint" : "Another hint"}
                {hintIndex > 0 && (
                  <span className="ml-1 text-amber-500/50">({hintIndex}/{hints.length})</span>
                )}
              </motion.button>
            )}

            <motion.button
              onClick={handleReveal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <Eye className="size-5" />
              Reveal Answer
            </motion.button>
          </motion.div>
        )}

        {/* Revealing phase */}
        {state === "revealing" && (
          <motion.div
            key="revealing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <GlassCard className="relative overflow-hidden p-6 text-center sm:p-8">
              {/* Drumroll dots */}
              {!revealDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-3"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="flex items-center justify-center gap-1"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.12 }}
                        className="size-1.5 rounded-full bg-amber-500"
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  The answer is...
                </p>
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative inline-block"
                >
                  <p className="font-heading text-xl font-bold leading-relaxed sm:text-2xl">
                    <RevealText text={puzzle.correctAnswer} onDone={handleRevealDone} />
                  </p>
                  {showCelebration && <SparkleBurst />}
                </motion.div>
              </motion.div>

              {/* Sparkle particles around the answer */}
              {revealDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 flex items-center justify-center gap-2"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="size-4 text-amber-400" />
                  </motion.span>
                  <span className="text-xs text-muted-foreground">Got it? Tap Continue to answer</span>
                  <motion.span
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="size-4 text-amber-400" />
                  </motion.span>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Self-assessment phase */}
        {state === "assessing" && (
          <motion.div
            key="assessing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <GlassCard className="p-6 text-center sm:p-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.05 }}
                  className="mb-4 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-1.5"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-sm font-semibold">{puzzle.correctAnswer}</span>
                  <Sparkles className="size-3.5 text-primary" />
                </motion.div>

                <p className="mb-6 text-base text-muted-foreground">
                  Did you get it right?
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => handleAssess(true)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex flex-1 flex-col items-center gap-1.5 overflow-hidden rounded-2xl border-2 border-success/20 bg-gradient-to-b from-success/10 to-success/5 p-5 text-sm font-semibold text-success transition-all hover:border-success/40 hover:shadow-lg hover:shadow-success/10"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-t from-success/10 to-transparent"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    />
                    <CheckCircle2 className="relative size-7 transition-transform group-hover:scale-110" />
                    <span className="relative">I got it</span>
                  </motion.button>
                  <motion.button
                    onClick={() => handleAssess(false)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative flex flex-1 flex-col items-center gap-1.5 overflow-hidden rounded-2xl border-2 border-destructive/20 bg-gradient-to-b from-destructive/10 to-destructive/5 p-5 text-sm font-semibold text-destructive transition-all hover:border-destructive/40 hover:shadow-lg hover:shadow-destructive/10"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-t from-destructive/10 to-transparent"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    />
                    <XCircle className="relative size-7 transition-transform group-hover:scale-110" />
                    <span className="relative">Nope</span>
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
                correct ? "border-success/30 bg-gradient-to-b from-success/5 to-transparent" : "border-destructive/30 bg-gradient-to-b from-destructive/5 to-transparent",
              )}
            >
              {correct && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="absolute -top-6 -right-6"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
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
                    correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {correct
                    ? <CheckCircle2 className="size-5" />
                    : <XCircle className="size-5" />}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-base font-semibold",
                    correct ? "text-success" : "text-destructive",
                  )}>
                    {correct ? "You got it!" : "Close! Here's the answer:"}
                  </p>
                  {!correct && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-1 text-sm text-muted-foreground"
                    >
                      <span className="font-semibold text-foreground">{puzzle.correctAnswer}</span>
                    </motion.p>
                  )}
                  {correct && !isRepeat && (
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
                  {correct && isRepeat && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Already solved — no extra XP
                    </p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              {correct && puzzle.correctExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl bg-success/[0.08] px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {puzzle.correctExplanation}
                </motion.div>
              )}
              {!correct && puzzle.incorrectExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl bg-destructive/[0.08] px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {puzzle.incorrectExplanation}
                </motion.div>
              )}

              {correct && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {puzzle.acceptedAnswers && puzzle.acceptedAnswers.length > 0 ? (
                    <span>Also accepted: {puzzle.acceptedAnswers.join(", ")}</span>
                  ) : (
                    <span>Correct answer: {puzzle.correctAnswer}</span>
                  )}
                </motion.div>
              )}
            </motion.div>

            <motion.button
              onClick={handleContinue}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              Continue <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-transition to assessing */}
      {state === "revealing" && revealDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <motion.button
            onClick={() => setState("assessing")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          >
            Continue <ArrowRight className="size-4" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
