"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ArrowRight, Sparkles, Eye, Brain, Share2, CheckCheck, Copy } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

interface Props {
  puzzle: Puzzle;
  onComplete: () => void;
}

type WonderState = "hook" | "think" | "reveal" | "share";

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

export function WonderPlay({ puzzle, onComplete }: Props) {
  const [state, setState] = useState<WonderState>("hook");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const markWonderExperienced = useUserStore((s) => s.markWonderExperienced);
  const experiencedWonderIds = useUserStore((s) => s.experiencedWonderIds);

  const isExperienced = experiencedWonderIds.includes(puzzle.id);
  const revealed = state === "reveal" || state === "share";
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "reveal" || state === "share") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  const handleReveal = useCallback(() => {
    setState("reveal");
    markWonderExperienced(puzzle.id);
    import("@/services/sound-service").then(({ playRiddleReveal }) => playRiddleReveal());
  }, [puzzle.id, markWonderExperienced]);

  const handleContinue = useCallback(() => {
    if (state === "reveal") {
      markWonderExperienced(puzzle.id);
      setState("share");
    } else {
      markWonderExperienced(puzzle.id);
      onComplete();
    }
  }, [state, puzzle.id, markWonderExperienced, onComplete]);

  const handleShare = useCallback(async () => {
    markWonderExperienced(puzzle.id);
    const text = puzzle.sharePrompt
      ? `${puzzle.sharePrompt}\n\n— from BrainBloom`
      : `Check out this brain teaser: ${puzzle.title}\n\n— from BrainBloom`;

    if (navigator.share) {
      try {
        await navigator.share({ title: puzzle.title, text });
        setShared(true);
        return;
      } catch {
        // fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [puzzle, puzzle.title, puzzle.sharePrompt]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="relative">
        <GlassCard className={cn(
          "relative mb-6 overflow-hidden p-6 text-center transition-all duration-500 sm:p-8",
          state === "hook" && "ring-1 ring-primary/10",
          state === "reveal" && "ring-1 ring-amber-500/20",
          state === "share" && "ring-1 ring-emerald-500/20",
        )}>
          <div className={cn(
            "pointer-events-none absolute -top-20 -right-20 size-60 rounded-full opacity-0 blur-3xl transition-opacity duration-700",
            state === "hook" && "opacity-30",
          )}
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
          />

          {puzzle.imageUrl && (
            <img src={puzzle.imageUrl} alt="" loading="lazy"
              className="relative mx-auto mb-4 max-h-48 w-full rounded-xl object-contain" />
          )}

          {/* Phase indicator */}
          <div className="relative mb-4 flex items-center justify-center gap-2">
            <motion.div
              animate={state === "hook" ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
              transition={{ duration: 3, repeat: state === "hook" ? Infinity : 0, ease: "easeInOut" }}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl transition-all sm:size-10",
                state === "hook" && "bg-gradient-to-br from-amber-500/20 to-orange-500/10",
                state === "think" && "bg-primary/10",
                revealed && "bg-success/10",
              )}
            >
              {state === "hook" && <Brain className="size-4 sm:size-5 text-amber-500" />}
              {state === "think" && <Eye className="size-4 sm:size-5 text-primary" />}
              {revealed && <Lightbulb className="size-4 sm:size-5 text-success" />}
            </motion.div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {state === "hook" && "Consider this..."}
              {state === "think" && "Think about it"}
              {state === "reveal" && "The insight"}
              {state === "share" && "Share with someone"}
            </span>
          </div>

          {!revealed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.15, y: 0 }}
              className="mb-2 text-left text-6xl font-serif leading-none text-primary sm:text-7xl"
            >
              &ldquo;
            </motion.div>
          )}

          <motion.div layout transition={{ duration: 0.4 }} className="relative">
            <h2 className={cn(
              "font-heading font-bold leading-relaxed transition-all duration-500",
              state === "hook" && "text-xl sm:text-2xl text-foreground",
              state === "think" && "text-base sm:text-lg opacity-40",
              revealed && "text-base sm:text-lg",
            )}>
              {puzzle.question}
            </h2>
          </motion.div>

          {!revealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.15, y: 0 }}
              className="mt-1 text-right text-6xl font-serif leading-none text-primary sm:text-7xl"
            >
              &rdquo;
            </motion.div>
          )}

          {state === "hook" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <ThinkingDots />
            </motion.div>
          )}
        </GlassCard>
      </div>

      <AnimatePresence mode="wait">
        {state === "hook" && (
          <motion.div
            key="hook"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="space-y-3"
          >
            <p className="text-center text-sm text-muted-foreground">
              Take a moment to sit with this. No right answer — just your own thoughts.
            </p>
            <motion.button
              onClick={() => setState("think")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <Brain className="size-5" />
              I&apos;m ready
            </motion.button>
          </motion.div>
        )}

        {state === "think" && (
          <motion.div
            key="think"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <GlassCard className="p-6 text-center sm:p-8">
              <p className="mb-4 text-sm text-muted-foreground">
                There&apos;s no answer to check here. Just turn it over in your mind.
                What does this bring up for you?
              </p>
              <textarea
                placeholder="(your private thoughts — not saved)"
                className="mb-4 w-full resize-none rounded-xl border border-border/50 bg-muted/30 p-4 text-sm text-foreground outline-none dark:border-white/10 dark:bg-white/5"
                rows={3}
              />
              <div className="flex gap-3">
                <motion.button
                  onClick={handleReveal}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98]"
                >
                  <Eye className="size-5" />
                  Show me the insight
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {state === "reveal" && (
          <motion.div
            ref={resultRef}
            key="reveal"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {isExperienced && (
              <div className="mb-3 text-center text-xs text-amber-500">
                <Sparkles className="mr-1 inline size-3" />
                You&apos;ve seen this before
              </div>
            )}
            <GlassCard className="relative overflow-hidden p-6 text-center sm:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {puzzle.lessonContent ? "Here's something to consider:" : "Here's the insight:"}
                </p>
                <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 px-5 py-5 text-left">
                  <p className="text-sm leading-relaxed text-foreground">
                    {puzzle.lessonContent || puzzle.correctExplanation || "No insight recorded yet."}
                  </p>
                </div>
              </motion.div>
            </GlassCard>

            <div className="mt-4 flex gap-3">
              <motion.button
                onClick={handleContinue}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground active:scale-[0.98] dark:border-white/10 dark:hover:bg-white/5"
              >
                <Share2 className="size-4" />
                {puzzle.sharePrompt ? "Share this with someone" : "Done"}
              </motion.button>
              <motion.button
                onClick={() => { markWonderExperienced(puzzle.id); onComplete(); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              >
                Continue
                <ArrowRight className="size-4" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {state === "share" && (
          <motion.div
            key="share"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <GlassCard className="p-6 text-center sm:p-8">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Share2 className="size-6 text-emerald-500" />
              </div>
              <h3 className="font-heading text-lg font-bold">Share the wonder</h3>
              {puzzle.sharePrompt ? (
                <p className="mt-2 text-sm text-muted-foreground">{puzzle.sharePrompt}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  The best insights stick when you share them. Send this to someone and start a conversation.
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <motion.button
                  onClick={handleShare}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {copied || shared ? (
                    <><CheckCheck className="size-5" /> {copied ? "Copied!" : "Shared!"}</>
                  ) : (
                    <><Share2 className="size-5" /> Share</>
                  )}
                </motion.button>
                <motion.button
                  onClick={() => { markWonderExperienced(puzzle.id); onComplete(); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border/50 px-5 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground dark:border-white/10 dark:hover:bg-white/5"
                >
                  {copied || shared ? "Done" : "Skip"}
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
