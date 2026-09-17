"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Database,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { isAdmin } from "@/services/puzzle-service";
import { resetAndSeed, type SeedData } from "@/scripts/seed-data/importer";
import seedData from "@/scripts/seed-data/data";

interface BundleManifest {
  version: number;
  generatedAt: string;
  counts: { puzzles: number; lessonGroups: number };
  categories: string[];
}

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
  const [importing, setImporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [source, setSource] = useState<"legacy" | "forge">("forge");
  const [manifest, setManifest] = useState<BundleManifest | null>(null);
  const [manifestError, setManifestError] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Role lives in sessionStorage, so it can only be read after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setAdmin(isAdmin());
    // Manifest is tiny (counts only); the multi-MB bundle loads on Start.
    fetch("/seed/forge-manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((m: BundleManifest) => setManifest(m))
      .catch(() => setManifestError(true));
  }, []);

  // Elapsed clock while importing.
  useEffect(() => {
    if (!importing) return;
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [importing]);

  const addLog = useCallback((msg: string) => {
    setProgress((prev) => [...prev, msg]);
  }, []);

  const handleSeed = async () => {
    // Seeding is destructive and admin-only. Never self-promote the caller.
    if (!isAdmin()) {
      addLog("ERROR: Only admins can seed the database.");
      return;
    }

    setImporting(true);
    setFailed(null);
    setElapsed(0);
    setStep("clearing");
    addLog("Starting seed process...");

    try {
      let data: SeedData = seedData;
      if (source === "forge") {
        setStep("clearing");
        addLog("Downloading forge bundle (~5MB)...");
        const res = await fetch("/seed/forge-bundle.json");
        if (!res.ok) throw new Error(`Bundle download failed (HTTP ${res.status}).`);
        const bundle = (await res.json()) as SeedData & {
          counts?: { puzzles: number; lessonGroups: number };
        };
        if (!Array.isArray(bundle.puzzles) || bundle.puzzles.length === 0) {
          throw new Error("Bundle is empty or invalid — aborting before any wipe.");
        }
        addLog(
          `Bundle ready: ${bundle.puzzles.length} puzzles, ${bundle.lessonGroups.length} groups.`,
        );
        data = bundle;
      }

      let groupsImported = 0;
      let puzzlesImported = 0;

      const log = (msg: string) => {
        addLog(msg);
        if (msg.includes("lesson groups")) groupsImported = parseInt(msg.match(/\d+/)?.[0] ?? "0");
        if (msg.includes("puzzles")) puzzlesImported = parseInt(msg.match(/\d+/)?.[0] ?? "0");
      };

      await resetAndSeed(data, (msg) => {
        log(msg);
        if (msg.startsWith("Creating")) setStep("groups");
        if (msg.startsWith("Importing")) setStep("puzzles");
        if (msg.startsWith("Seed complete")) {
          setStep("done");
          setCounts({ groups: groupsImported, puzzles: puzzlesImported });
        }
      });
      setImporting(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      // Wipe-then-load is idempotent: a failed run leaves a partial bank, and
      // re-running Seed wipes it clean before retrying. Nothing is half-merged.
      addLog(`ERROR: ${message}`);
      addLog("Safe to retry: pressing Start Import again wipes partial data first.");
      setFailed(message);
      setStep("idle");
      setImporting(false);
    }
  };

  // Contributors can reach this route directly; block them from the tool.
  if (mounted && !admin) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <button
          onClick={() => router.push("/studio")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Studio
        </button>
        <GlassCard intensity="strong" className="border-destructive/20 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-6 shrink-0 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Admins only</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Seeding replaces all puzzles and lesson groups. Only studio
                admins can run this tool. Reach out to an admin if you need a
                database reset.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

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
        <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">Seed Database</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import lesson groups and puzzles from a seed source. This will
          replace ALL existing data.
        </p>
      </div>

      {step === "idle" && !importing && (
        <GlassCard intensity="strong" className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seed source</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSource("forge")}
              disabled={manifestError}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
                source === "forge" ? "border-primary bg-primary/10" : "hover:border-primary/50"
              }`}
            >
              <p className="font-semibold">Forge bank {manifest ? `(${manifest.counts.puzzles.toLocaleString()})` : ""}</p>
              <p className="text-xs text-muted-foreground">
                {manifest
                  ? `${manifest.counts.puzzles.toLocaleString()} AI questions + 2 keepers across ${manifest.counts.lessonGroups} groups`
                  : manifestError
                    ? "Bundle manifest missing — rebuild it (build-bundle.mjs)"
                    : "Loading bundle info..."}
              </p>
            </button>
            <button
              onClick={() => setSource("legacy")}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                source === "legacy" ? "border-primary bg-primary/10" : "hover:border-primary/50"
              }`}
            >
              <p className="font-semibold">Legacy seed ({seedData.puzzles.length})</p>
              <p className="text-xs text-muted-foreground">
                {seedData.puzzles.length} hand-written puzzles across {seedData.lessonGroups.length} groups
              </p>
            </button>
          </div>
        </GlassCard>
      )}

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
                {source === "forge" && manifest
                  ? `Forge bundle holds ${manifest.counts.puzzles.toLocaleString()} puzzles across ${manifest.counts.lessonGroups} lesson groups in ${manifest.categories.length} categories (built ${new Date(manifest.generatedAt).toLocaleDateString()}).`
                  : `Seed data includes ${seedData.puzzles.length} puzzles across ${seedData.lessonGroups.length} lesson groups in ${new Set(seedData.lessonGroups.map((g) => g.category)).size} categories.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Seeding wipes first, then loads — if it fails halfway, just run
                it again; partial data is wiped before every retry.
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
        <motion.button
          onClick={handleSeed}
          disabled={importing}
          whileTap={importing ? undefined : { scale: 0.98 }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 disabled:opacity-60"
        >
          {importing ? (
            <span className="relative flex size-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
              <span className="relative inline-flex size-5 rounded-full bg-white" />
            </span>
          ) : <Database className="size-5" />}
          {importing ? "Starting..." : "Start Import"}
        </motion.button>
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
                const stepIdx = STEPS.findIndex((x) => x.key === step);
                const sIdx = STEPS.findIndex((x) => x.key === s.key);
                const isDone = stepIdx > sIdx || step === "done";
                const isActive = step === s.key && step !== "done";
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
            {importing && (
              <p className="text-xs text-muted-foreground">
                Elapsed: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} — large banks take several minutes; keep this tab open.
              </p>
            )}
            {failed && (
              <GlassCard intensity="strong" className="border-destructive/20 p-4">
                <p className="text-sm font-semibold text-destructive">Seed failed: {failed}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nothing is half-merged — pressing Start Import again wipes the
                  partial bank first, so retrying is safe.
                </p>
              </GlassCard>
            )}

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
