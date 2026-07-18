"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Zap, ArrowRight, Lock, Shield, Fingerprint, Crown, BadgeCheck, Ghost } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onWrongAttempt?: () => void;
  isRepeat?: boolean;
}

function CipherPlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: Props) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [revealPhase, setRevealPhase] = useState<"idle" | "decoding" | "result">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const isCorrect = input.trim().toLowerCase() === puzzle.correctAnswer.trim().toLowerCase() ||
    (puzzle.acceptedAnswers?.some((a) => a.trim().toLowerCase() === input.trim().toLowerCase()) ?? false);
  const earned = isCorrect && !isRepeat ? puzzle.xpReward : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!input.trim() || submitted) return;
    setRevealPhase("decoding");
    setTimeout(() => {
      setSubmitted(true);
      setRevealPhase("result");
      if (!isCorrect) {
        onWrongAttempt?.();
      } else {
        import("@/services/sound-service").then(({ playCipherSolve }) => playCipherSolve());
      }
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !submitted && revealPhase === "idle") handleSubmit();
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Ambient glow */}
      <div className={cn(
        "pointer-events-none fixed inset-0 transition-opacity duration-1000",
        !submitted && revealPhase === "idle" && "opacity-30",
        submitted && isCorrect && "opacity-60",
      )}
        style={{
          background: !submitted
            ? "radial-gradient(600px circle at 50% 30%, rgba(245,158,11,0.06), transparent 70%)"
            : isCorrect
              ? "radial-gradient(600px circle at 50% 50%, rgba(34,197,94,0.06), transparent 70%)"
              : "radial-gradient(600px circle at 50% 50%, rgba(239,68,68,0.04), transparent 70%)",
        }}
      />

      <div className="relative">
        <div className={cn(
          "pointer-events-none absolute -inset-4 rounded-3xl opacity-0 transition-all duration-1000",
          revealPhase === "decoding" && "opacity-100",
        )}
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          }}
        />

        <GlassCard className={cn(
          "relative mb-6 overflow-hidden p-6 text-center transition-all duration-700 sm:p-8",
          !submitted && revealPhase === "idle" && "ring-1 ring-amber-500/10",
          revealPhase === "decoding" && "ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10",
          submitted && isCorrect && "ring-1 ring-amber-400/20",
          submitted && !isCorrect && "ring-1 ring-destructive/20",
        )}>
          {/* Background layers */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-950/20 via-black/40 to-amber-900/10" />

          {!submitted && (
            <motion.div
              animate={{ opacity: [0.03, 0.07, 0.03] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.1),transparent_70%)]"
            />
          )}

          {revealPhase === "decoding" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.1, 0] }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)]"
            />
          )}

          <div className="relative">
            {/* Classification badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 inline-flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-1.5"
            >
              <Shield className="size-3 text-amber-400/60" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-400/60">
                CLASSIFIED — EYES ONLY
              </span>
            </motion.div>

            {isRepeat && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="relative mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-500/60">
                <Lock className="size-3.5" />
                File already processed — no additional rewards
              </motion.div>
            )}

            {puzzle.imageUrl && (
              <img src={puzzle.imageUrl} alt="" loading="lazy"
                className="relative mx-auto mb-4 max-h-48 w-full rounded-xl object-contain opacity-80" />
            )}

            {/* Icon */}
            <div className="relative mb-4 flex items-center justify-center gap-3">
              <motion.div
                animate={revealPhase === "decoding" ? { rotate: 360 } : !submitted ? { rotate: [0, 3, -3, 0] } : { rotate: 0 }}
                transition={revealPhase === "decoding"
                  ? { duration: 0.8, repeat: 2, ease: "linear" }
                  : { duration: 4, repeat: !submitted ? Infinity : 0, ease: "easeInOut" }
                }
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-all sm:size-11",
                  revealPhase === "decoding" && "bg-amber-500/15 ring-1 ring-amber-500/30",
                  !submitted && revealPhase === "idle" && "bg-amber-500/[0.07]",
                  submitted && isCorrect && "bg-amber-400/10",
                  submitted && !isCorrect && "bg-destructive/10",
                )}
              >
                {revealPhase === "decoding" && <Ghost className="size-5 text-amber-400/60" />}
                {revealPhase === "idle" && !submitted && <Fingerprint className="size-5 text-amber-400/70" />}
                {submitted && isCorrect && <BadgeCheck className="size-5 text-amber-400" />}
                {submitted && !isCorrect && <XCircle className="size-5 text-destructive" />}
              </motion.div>

              <span className={cn(
                "text-[11px] font-mono font-bold uppercase tracking-[0.15em] transition-colors",
                revealPhase === "decoding" && "text-amber-400/60",
                !submitted && revealPhase === "idle" && "text-amber-400/40",
                submitted && isCorrect && "text-amber-400",
                submitted && !isCorrect && "text-destructive",
              )}>
                {revealPhase === "decoding" && "DECODING..."}
                {revealPhase === "idle" && !submitted && "CRYPTOGRAPHIC CHALLENGE"}
                {submitted && isCorrect && "FILE DECRYPTED"}
                {submitted && !isCorrect && "ACCESS DENIED"}
              </span>
            </div>

            <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-500/30">
              {puzzle.difficulty} &middot; {puzzle.cipherData?.cipherType ?? "CIPHER"} &middot; CASE #{puzzle.id.slice(0, 6).toUpperCase()}
            </p>

            <h2 className="font-heading mb-2 text-xl font-bold tracking-tight text-amber-200/90 sm:text-2xl">
              {puzzle.title}
            </h2>
            {puzzle.question && (
              <p className="mb-4 text-sm leading-relaxed text-amber-300/50">
                {puzzle.question}
              </p>
            )}

            {/* Encoded message */}
            {!submitted && puzzle.cipherData?.encodedMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={revealPhase === "decoding"
                  ? { opacity: [1, 0.5, 1], scale: [1, 0.98, 1] }
                  : { opacity: 1, scale: 1 }
                }
                transition={revealPhase === "decoding"
                  ? { duration: 0.3, repeat: 5, ease: "easeInOut" }
                  : { delay: 0.2, type: "spring", stiffness: 100 }
                }
                className={cn(
                  "relative mx-auto max-w-md overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-all",
                  revealPhase === "decoding" && "border-amber-500/40 bg-amber-950/50 shadow-lg shadow-amber-500/10",
                  revealPhase === "idle" && "border-amber-500/15 bg-black/50",
                )}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] to-transparent" />

                {revealPhase === "idle" && (
                  <motion.div
                    animate={{ opacity: [0, 0.04, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)]"
                  />
                )}

                <div className="absolute right-3 top-3">
                  <Lock className={cn(
                    "size-3 transition-colors",
                    revealPhase === "decoding" ? "text-amber-400/60" : "text-amber-500/30",
                  )} />
                </div>

                <pre className="select-all whitespace-pre-wrap break-all font-mono text-sm leading-relaxed tracking-[0.15em] text-amber-200/80 sm:text-base">
                  {puzzle.cipherData.encodedMessage}
                </pre>
              </motion.div>
            )}

            {/* Decoding overlay */}
            {revealPhase === "decoding" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 space-y-2"
              >
                <div className="flex items-center justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="size-2 rounded-full bg-amber-500/50"
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.3, 0.8],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-500/40">
                  Cracking cipher...
                </p>
              </motion.div>
            )}

            {submitted && !isCorrect && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm font-mono text-amber-500/40"
              >
                This file remains classified until Monday.
              </motion.p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Input area */}
      {!submitted && revealPhase === "idle" && (
        <>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-amber-500/10 opacity-50 blur-sm" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your decryption..."
              className="relative w-full rounded-2xl border border-amber-500/15 bg-black/60 px-5 py-4 pr-12 font-mono text-base tracking-wider text-amber-200/90 outline-none transition-all placeholder:text-amber-500/30 focus:border-amber-400/30 focus:ring-2 focus:ring-amber-500/10"
              autoComplete="off"
              spellCheck={false}
            />
            {input && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setInput("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/30 transition-colors hover:text-amber-400/60"
              >
                <XCircle className="size-4" />
              </motion.button>
            )}
          </div>

          {/* No hints — cipher is meant to be hard. */}
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <Lock className="size-2.5 text-amber-500/20" />
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-500/20">No hints available</span>
          </div>

          <motion.button
            onClick={handleSubmit}
            disabled={!input.trim()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="relative mt-5 flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-600/20 via-amber-700/15 to-amber-800/20 text-sm font-bold uppercase tracking-wider text-amber-300/90 shadow-lg shadow-amber-900/20 transition-all hover:from-amber-600/30 hover:via-amber-700/20 hover:to-amber-800/30 hover:shadow-xl hover:shadow-amber-900/30 disabled:opacity-30"
          >
            {input.trim() && (
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <Fingerprint className="size-5" />
            Decrypt Intelligence
          </motion.button>
        </>
      )}

      <AnimatePresence>
        {submitted && revealPhase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-6 sm:p-7",
                isCorrect
                  ? "border-amber-500/20 bg-gradient-to-b from-amber-950/40 to-transparent"
                  : "border-destructive/20 bg-gradient-to-b from-destructive/[0.04] to-transparent",
              )}
            >
              {isCorrect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 150 }}
                  className="absolute -top-8 -right-8"
                >
                  <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Crown className="size-20 text-amber-500/8" />
                  </motion.div>
                </motion.div>
              )}

              <div className="relative flex items-start gap-4">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                    isCorrect ? "bg-amber-500/10 text-amber-400" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {isCorrect ? <BadgeCheck className="size-6" /> : <XCircle className="size-6" />}
                </motion.span>

                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-heading text-lg font-bold tracking-tight",
                    isCorrect ? "text-amber-300" : "text-destructive",
                  )}>
                    {isCorrect ? "File Decrypted" : "Access Denied"}
                  </p>

                  {!isCorrect && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-1.5 text-sm font-mono text-amber-500/40"
                    >
                      This file remains classified until Monday.
                    </motion.p>
                  )}

                  {isCorrect && !isRepeat && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-2"
                    >
                      <Zap className="size-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-300">+{earned} XP</span>
                      <span className="text-amber-500/30">|</span>
                      <Crown className="size-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-300">25 Gems</span>
                    </motion.div>
                  )}

                  {isCorrect && isRepeat && (
                    <p className="mt-1.5 text-xs font-mono text-amber-500/40">File already processed this week.</p>
                  )}
                </div>
              </div>

              {isCorrect && puzzle.correctExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-5 rounded-xl border border-amber-500/10 bg-amber-950/30 px-5 py-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-500/40">DECODING NOTES</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-amber-500/20 to-transparent" />
                  </div>
                  <p className="text-sm leading-relaxed text-amber-300/60">
                    {puzzle.correctExplanation}
                  </p>
                </motion.div>
              )}

              {!isCorrect && puzzle.incorrectExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-5 rounded-xl border border-destructive/10 bg-destructive/[0.03] px-5 py-4"
                >
                  <p className="text-sm leading-relaxed text-amber-400/40">
                    {puzzle.incorrectExplanation}
                  </p>
                </motion.div>
              )}
            </motion.div>

            <motion.button
              onClick={() => onComplete(isCorrect, earned)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-600/10 to-amber-700/10 text-sm font-bold uppercase tracking-wider text-amber-300/80 shadow-lg shadow-amber-900/10 transition-all hover:from-amber-600/20 hover:to-amber-700/20 active:scale-[0.98]"
            >
              Close File <ArrowRight className="size-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { CipherPlay, type Props as CipherPlayProps };
