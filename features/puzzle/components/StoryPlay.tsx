"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Brain, Sparkles, CheckCheck } from "lucide-react";
import { type Puzzle } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface Props {
  puzzle: Puzzle;
  onComplete: () => void;
}

type Phase = "questions" | "think" | "answers" | "done";

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.96,
    rotateY: dir > 0 ? 12 : -12,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.96,
    rotateY: dir > 0 ? -6 : 6,
  }),
};

export function StoryPlay({ puzzle, onComplete }: Props) {
  const slides = puzzle.storyData;
  const totalQuestion = slides?.questionSlides?.length ?? 0;
  const totalAnswer = slides?.answerSlides?.length ?? 0;

  const [phase, setPhase] = useState<Phase>("questions");
  const [qIndex, setQIndex] = useState(0);
  const [aIndex, setAIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [thinkNote, setThinkNote] = useState("");
  const [showThink, setShowThink] = useState(false);
  const thinkRef = useRef<HTMLTextAreaElement>(null);
  const preloaded = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!slides?.questionSlides && !slides?.answerSlides) return;
    const urls = [
      ...slides.questionSlides.map((s) => s.imageUrl),
      ...slides.answerSlides.map((s) => s.imageUrl),
    ].filter((u): u is string => !!u && !preloaded.current.has(u));
    for (const url of urls) {
      preloaded.current.add(url);
      const img = new Image();
      img.onerror = () => { preloaded.current.delete(url); console.warn("Failed to preload story image:", url); };
      img.src = url;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "think" && showThink) {
      thinkRef.current?.focus();
    }
  }, [phase, showThink]);

  if (!slides) return null;

  const nextQuestion = () => {
    if (qIndex < totalQuestion - 1) {
      setDirection(1);
      setQIndex((i) => i + 1);
    } else {
      setDirection(1);
      setPhase("think");
      setShowThink(true);
    }
  };

  const prevQuestion = () => {
    if (qIndex > 0) {
      setDirection(-1);
      setQIndex((i) => i - 1);
    }
  };

  const startAnswers = () => {
    setShowThink(false);
    setDirection(1);
    setPhase("answers");
  };

  const nextAnswer = () => {
    if (aIndex < totalAnswer - 1) {
      setDirection(1);
      setAIndex((i) => i + 1);
    } else {
      setDirection(1);
      setPhase("done");
    }
  };

  const prevAnswer = () => {
    if (aIndex > 0) {
      setDirection(-1);
      setAIndex((i) => i - 1);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  const renderDots = (current: number, total: number) => (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => {
            setDirection(i > current ? 1 : -1);
            if (phase === "questions") setQIndex(i);
            else setAIndex(i);
          }}
          className={cn(
            "size-2 rounded-full transition-all",
            i === current
              ? "bg-primary w-4"
              : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
          )}
        />
      ))}
    </div>
  );

  const renderSlide = (slide: { content: string; imageUrl?: string }, index: number, total: number) => (
    <div className="mx-auto max-w-lg">
      <GlassCard className="relative overflow-hidden p-6 sm:p-8">
        {slide.imageUrl && (
          <img src={slide.imageUrl} alt="" loading="lazy"
            className="mb-4 max-h-48 w-full rounded-xl object-contain bg-muted" />
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-base leading-relaxed">{slide.content}</p>
        </div>
      </GlassCard>

      {renderDots(index, total)}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={phase === "questions" ? prevQuestion : prevAnswer}
          disabled={index === 0}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted disabled:opacity-30"
        >
          <ArrowLeft className="size-4" /> Prev
        </button>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {total}
        </span>
        <button
          onClick={phase === "questions" ? nextQuestion : nextAnswer}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
        >
          {index < total - 1 ? (
            <>Next <ArrowRight className="size-4" /></>
          ) : (
            phase === "answers" ? <>Finish <CheckCheck className="size-4" /></> : <>Think <Brain className="size-4" /></>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/10">
            <BookOpen className="size-4 text-primary" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {phase === "questions" && "Story — Read"}
            {phase === "think" && "Reflect"}
            {phase === "answers" && "Reveal"}
            {phase === "done" && "Complete"}
          </span>
        </div>
        <h2 className="font-heading text-xl font-bold">{puzzle.title}</h2>
      </div>

      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="popLayout" custom={direction}>
          {phase === "questions" && (
            <motion.div
              key={`q-${qIndex}`}
              layout
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.9 }}
            >
              {renderSlide(slides.questionSlides[qIndex], qIndex, totalQuestion)}
            </motion.div>
          )}

          {phase === "think" && showThink && (
            <motion.div
              key="think"
              layout
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.9 }}
              className="mx-auto max-w-lg"
            >
              <GlassCard className="p-6 sm:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <Brain className="size-5 text-primary" />
                  <span className="text-sm font-semibold">Now think about it</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Take a moment to reflect on what you just read. Jot down your thoughts below — this is private to you.
                </p>
                <textarea
                  ref={thinkRef}
                  value={thinkNote}
                  onChange={(e) => setThinkNote(e.target.value)}
                  placeholder="Your private thoughts..."
                  rows={5}
                  className="w-full resize-none rounded-xl border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </GlassCard>

              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => { setDirection(-1); setPhase("questions"); }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                  <ArrowLeft className="size-4" /> Back to questions
                </button>
                <motion.button
                  onClick={startAnswers}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
                >
                  Reveal the answers <Sparkles className="size-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "answers" && (
            <motion.div
              key={`a-${aIndex}`}
              layout
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.9 }}
            >
              {renderSlide(slides.answerSlides[aIndex], aIndex, totalAnswer)}
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              layout
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -15 }}
              transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.9 }}
              className="mx-auto max-w-lg"
            >
              <GlassCard className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
                  className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success/10"
                >
                  <CheckCheck className="size-7 text-success" />
                </motion.div>
                <h3 className="mb-2 text-lg font-bold">Story Complete</h3>
                <p className="text-sm text-muted-foreground">
                  You have finished this story. Reflect on what you have learned.
                </p>
                <motion.button
                  onClick={handleFinish}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
                >
                  Continue <ArrowRight className="size-4" />
                </motion.button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
