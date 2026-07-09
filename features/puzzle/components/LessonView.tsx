"use client";

import { motion } from "framer-motion";
import { BookOpen, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { type Puzzle } from "@/types/puzzle";
import { useUserStore } from "@/store/user-store";

interface Props {
  puzzle: Puzzle;
  onStartQuiz: () => void;
}

export function LessonView({ puzzle, onStartQuiz }: Props) {
  const hasCompletedPuzzle = useUserStore((s) => s.hasCompletedPuzzle);
  const completed = hasCompletedPuzzle(puzzle.id);
  const facts = (puzzle.lessonContent ?? "").split("\n").filter((l) => l.trim());

  return (
    <div className="mx-auto max-w-lg">
      <motion.div
        key="lesson"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <GlassCard className="mb-6 p-6 text-center sm:p-8">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10"
          >
            <BookOpen className="size-7 text-primary" />
          </motion.span>

          <h2 className="font-heading text-xl font-bold sm:text-2xl">{puzzle.title}</h2>

          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {puzzle.category} &middot; Lesson {puzzle.lessonOrder ?? "-"}
          </p>

          {(puzzle.lessonImageUrl ?? puzzle.imageUrl) && (
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              src={puzzle.lessonImageUrl ?? puzzle.imageUrl!}
              alt="Lesson illustration"
              className="mx-auto mt-4 max-h-48 w-full rounded-xl object-contain"
            />
          )}

          {facts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-5 space-y-2 text-left"
            >
              {facts.map((fact, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 rounded-xl bg-muted/50 p-3"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">{fact}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </GlassCard>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {completed ? (
            <div className="rounded-2xl border border-success/20 bg-success/5 p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 size-8 text-success" />
              <p className="font-semibold text-success">Lesson Completed</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You already passed the quiz for this lesson.
              </p>
            </div>
          ) : (
            <motion.button
              onClick={onStartQuiz}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]"
            >
              <Zap className="size-5" />
              Start Quiz
              <ArrowRight className="size-4" />
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
