"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { setStudioRole } from "@/services/puzzle-service";
import { resetAndSeed } from "@/scripts/seed-data/importer";
import seedData from "@/scripts/seed-data/data";

const STEPS = [
  { key: "idle", label: "Ready" },
  { key: "clearing", label: "Clearing existing data..." },
  { key: "groups", label: "Creating lesson groups..." },
  { key: "puzzles", label: "Importing puzzles..." },
  { key: "done", label: "Complete!" },
];

export default function SeedPage() {
  const router = useRouter();
  const [step, setStep] = useState<string>("idle");
  const [progress, setProgress] = useState<string[]>([]);
  const [counts, setCounts] = useState<{ groups: number; puzzles: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const addLog = useCallback((msg: string) => {
    setProgress((prev) => [...prev, msg]);
  }, []);

  const handleSeed = async () => {
    setStep("clearing");
    addLog("Starting seed process...");

    setStudioRole("admin");

    try {
      let groupsImported = 0;
      let puzzlesImported = 0;

      const log = (msg: string) => {
        addLog(msg);
        if (msg.includes("lesson groups")) groupsImported = parseInt(msg.match(/\d+/)?.[0] ?? "0");
        if (msg.includes("puzzles")) puzzlesImported = parseInt(msg.match(/\d+/)?.[0] ?? "0");
      };

      await resetAndSeed(seedData, (msg) => {
        addLog(msg);
        if (msg.startsWith("Creating")) setStep("groups");
        if (msg.startsWith("Importing")) setStep("puzzles");
        if (msg.startsWith("Seed complete")) {
          setStep("done");
          setCounts({ groups: groupsImported, puzzles: puzzlesImported });
        }
      });
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : "Unknown error"}`);
      setStep("idle");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <button
        onClick={() => router.push("/studio")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Studio
      </button>

      <div>
        <h1 className="text-2xl font-bold">Seed Database</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import all lesson groups and puzzles from the seed data file. This will
          replace ALL existing data.
        </p>
      </div>

      {!confirmed && step === "idle" && (
        <GlassCard intensity="strong" className="border-destructive/20 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-6 shrink-0 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Warning: Destructive Action</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This will delete ALL existing puzzles and lesson groups from both
                localStorage and Firestore, then import the seed data. This action
                cannot be undone.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Seed data includes {seedData.puzzles.length} puzzles across{" "}
                {seedData.lessonGroups.length} lesson groups in{" "}
                {new Set(seedData.lessonGroups.map((g) => g.category)).size} categories.
              </p>
              <button
                onClick={() => setConfirmed(true)}
                className="mt-4 flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                <Trash2 className="size-4" />
                I Understand — Seed Now
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {confirmed && step === "idle" && (
        <button
          onClick={handleSeed}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
        >
          <Database className="size-5" />
          Start Import
        </button>
      )}

      <AnimatePresence>
        {step !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Progress steps */}
            <div className="space-y-2">
              {STEPS.filter((s) => s.key !== "idle").map((s) => {
                const isActive = step === s.key;
                const isDone = STEPS.findIndex((x) => x.key === step) > STEPS.findIndex((x) => x.key === s.key);
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                      isDone
                        ? "bg-success/10 text-success"
                        : isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-5 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="size-5 shrink-0 animate-spin" />
                    ) : (
                      <div className="size-5 shrink-0 rounded-full border-2 border-current" />
                    )}
                    {s.label}
                  </div>
                );
              })}
            </div>

            {/* Log */}
            <div className="max-h-48 overflow-y-auto rounded-xl border bg-card p-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {progress.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>

            {/* Done state */}
            {step === "done" && counts && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <GlassCard intensity="strong" className="border-success/20 p-6 text-center">
                  <Sparkles className="mx-auto mb-3 size-10 text-success" />
                  <h2 className="text-lg font-bold">Seed Complete!</h2>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-2xl font-bold text-primary">{counts.groups}</p>
                      <p className="text-xs text-muted-foreground">Lesson groups</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-2xl font-bold text-primary">{counts.puzzles}</p>
                      <p className="text-xs text-muted-foreground">Puzzles</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => router.push("/studio")}
                      className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                    >
                      Back to Studio
                    </button>
                    <button
                      onClick={() => router.push("/learn")}
                      className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium"
                    >
                      Go to Learn
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
