"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Archive, BadgeCheck, ChevronLeft, Ghost, Lock, Play, Shield, Swords } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { getPuzzle } from "@/services/puzzle-service";
import { getCipherHistory, getCipherPhase, getWeekEnd, getWeekStart, type CipherHistoryEntry } from "@/services/weekly-cipher";
import { CipherPlay } from "@/features/puzzle/components/CipherPlay";
import type { Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";

interface ArchiveEntry extends CipherHistoryEntry {
  puzzle: Puzzle | null;
}

export default function ArchivePage() {
  const router = useRouter();
  const cipherSolvedWeeks = useUserStore((s) => s.cipherSolvedWeeks);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [practicePuzzle, setPracticePuzzle] = useState<Puzzle | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const history = await getCipherHistory();
        const withPuzzles = await Promise.all(
          history.map(async (h) => ({ ...h, puzzle: await getPuzzle(h.puzzleId) })),
        );
        setEntries(withPuzzles.filter((e) => e.puzzle));
      } catch (e) {
        console.error("Failed to load cipher archive:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentWeek = getWeekStart();
  const solvedCount = useMemo(
    () => entries.filter((e) => cipherSolvedWeeks.includes(e.weekStart)).length,
    [entries, cipherSolvedWeeks],
  );

  const handlePracticeDone = (correct: boolean) => {
    if (correct) toast.success("Archive replay complete — no XP earned in practice.");
    setPracticePuzzle(null);
  };

  if (practicePuzzle) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setPracticePuzzle(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Archive
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-400/60">
            <Swords className="size-3" /> Practice Replay
          </span>
        </div>
        <CipherPlay puzzle={practicePuzzle} onComplete={handlePracticeDone} practice />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Archive className="size-5 text-amber-500" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold">Cipher Archive</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading classified files..." : `${entries.length} cases on file · ${solvedCount} solved`}
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card/60" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <GlassCard intensity="light" className="p-8 text-center">
          <Ghost className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="font-heading font-semibold">No ciphers on file yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A new case lands every Sunday. Check back then.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const isCurrent = entry.weekStart === currentWeek;
            const solved = cipherSolvedWeeks.includes(entry.weekStart);
            return (
              <motion.div
                key={entry.weekStart}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard
                  intensity="light"
                  className={cn(
                    "flex items-center gap-4 p-4 sm:p-5",
                    isCurrent && "ring-1 ring-amber-500/20",
                  )}
                >
                  <span className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    solved ? "bg-amber-500/15" : "bg-primary/10",
                  )}>
                    {solved ? (
                      <BadgeCheck className="size-5 text-amber-500" />
                    ) : (
                      <Lock className="size-5 text-muted-foreground/60" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-sm font-semibold sm:text-base">
                        {entry.puzzle?.title ?? "Classified Case"}
                      </p>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400">
                          <Shield className="size-2.5" /> Live
                        </span>
                      )}
                      {solved && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-amber-500/80">
                          <BadgeCheck className="size-2.5" /> Solved
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.weekStart} — {getWeekEnd(entry.weekStart)} · {entry.puzzle?.cipherData?.cipherType ?? "CIPHER"}
                    </p>
                  </div>

                  {isCurrent ? (
                    <button
                      onClick={() => router.push(`/learn?cipher=${entry.puzzleId}`)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-transform active:scale-95"
                    >
                      <Play className="size-3.5" /> Solve
                    </button>
                  ) : (
                    <button
                      onClick={() => entry.puzzle && setPracticePuzzle(entry.puzzle)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/20 px-3.5 py-2.5 text-xs font-bold text-primary transition-all active:scale-95"
                    >
                      <Swords className="size-3.5" /> Practice
                    </button>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {getCipherPhase() === "closed" && entries.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Saturday: the week&apos;s answer has been revealed on the home card.
        </p>
      )}
    </main>
  );
}
