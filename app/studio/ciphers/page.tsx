"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Sparkles,
  ShieldAlert,
  Trash2,
  Plus,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { isAdmin, clearPuzzlesCache } from "@/services/puzzle-service";
import { upsertCiphers, deleteCiphersByIds } from "@/scripts/seed-data/importer";
import cipherSeeds from "@/scripts/seed-data/ciphers.generated";

export default function CiphersPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [strays, setStrays] = useState<string[]>([]);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setAdmin(isAdmin());
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [loading]);

  const addLog = useCallback((msg: string) => {
    setProgress((prev) => [...prev, msg]);
  }, []);

  const handleLoad = async () => {
    if (!isAdmin()) {
      addLog("ERROR: Only admins can load ciphers.");
      return;
    }
    setLoading(true);
    setFailed(null);
    setDone(false);
    setStrays([]);
    setElapsed(0);
    setProgress([]);
    addLog(`Loading ${cipherSeeds.length} ciphers (additive upsert by id)...`);

    try {
      const result = await upsertCiphers(cipherSeeds, addLog);
      clearPuzzlesCache();
      setStrays(result.strays);
      addLog(`Done. Upserted ${result.upserted} ciphers.`);
      if (result.strays.length > 0) {
        addLog(
          `Note: ${result.strays.length} other cipher doc(s) exist outside this set. You can remove them below.`,
        );
      }
      setDone(true);
      setLoading(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      addLog(`ERROR: ${message}`);
      addLog("Safe to retry: upsert is keyed by id, so re-running overwrites, never duplicates.");
      setFailed(message);
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!isAdmin() || strays.length === 0) return;
    setCleaning(true);
    try {
      const n = await deleteCiphersByIds(strays);
      clearPuzzlesCache();
      addLog(`Removed ${n} stray cipher doc(s).`);
      setStrays([]);
    } catch (e) {
      addLog(`ERROR removing strays: ${e instanceof Error ? e.message : e}`);
    }
    setCleaning(false);
  };

  // Group counts by cipher family for the preview.
  const familyCounts = cipherSeeds.reduce<Record<string, number>>((acc, c) => {
    const label = c.cipherData?.cipherType ?? "Other";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

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
                Loading ciphers writes to the shared puzzle bank. Only studio
                admins can run this tool.
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
        <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-[#8b5cf6] bg-clip-text text-transparent">
          Load Ciphers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the weekly-cipher puzzle set to the bank. This is additive: it
          upserts each cipher by a stable id and leaves every other puzzle
          untouched. Safe to run again anytime.
        </p>
      </div>

      {/* Preview of the set */}
      <GlassCard intensity="strong" className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cipher set
          </p>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {cipherSeeds.length} puzzles
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(familyCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => (
              <span
                key={label}
                className="rounded-lg border bg-card px-2 py-1 text-[11px] text-muted-foreground"
              >
                {label}
                {count > 1 ? ` x${count}` : ""}
              </span>
            ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Every ciphertext was encoded and decoded back to its answer at build
          time, so none can be wrong. All are hard, in the puzzles category. The
          weekly cipher picks from this pool automatically.
        </p>
      </GlassCard>

      {!done && (
        <motion.button
          onClick={handleLoad}
          disabled={loading}
          whileTap={loading ? undefined : { scale: 0.98 }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <KeyRound className="size-5" />
          )}
          {loading ? "Loading..." : `Load ${cipherSeeds.length} Ciphers`}
        </motion.button>
      )}

      <AnimatePresence>
        {progress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="max-h-48 overflow-y-auto rounded-xl border bg-card p-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {progress.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
            {loading && (
              <p className="text-xs text-muted-foreground">
                Elapsed: {Math.floor(elapsed / 60)}:
                {String(elapsed % 60).padStart(2, "0")}
              </p>
            )}

            {failed && (
              <GlassCard intensity="strong" className="border-destructive/20 p-4">
                <p className="text-sm font-semibold text-destructive">
                  Load failed: {failed}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upsert is keyed by id, so pressing Load again overwrites in
                  place. Nothing is duplicated.
                </p>
              </GlassCard>
            )}

            {/* Stray cleanup */}
            {done && strays.length > 0 && (
              <GlassCard intensity="strong" className="border-amber-500/20 p-4">
                <p className="text-sm font-semibold text-amber-500">
                  {strays.length} stray cipher doc(s) found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  These cipher puzzles exist in the bank but are not part of this
                  managed set (likely from an older seed). Remove them so the
                  weekly rotation only draws from the curated set.
                </p>
                <button
                  onClick={handleCleanup}
                  disabled={cleaning}
                  className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10 disabled:opacity-60"
                >
                  {cleaning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Remove {strays.length} stray cipher(s)
                </button>
              </GlassCard>
            )}

            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <GlassCard intensity="strong" className="border-success/20 p-6 text-center">
                  <Sparkles className="mx-auto mb-3 size-10 text-success" />
                  <h2 className="text-lg font-bold">Ciphers Loaded</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cipherSeeds.length} ciphers are live in the bank and ready
                    for the weekly rotation.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => router.push("/studio")}
                      className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                    >
                      Back to Studio
                    </button>
                    <button
                      onClick={() => {
                        setDone(false);
                        setProgress([]);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium"
                    >
                      <Plus className="size-4" />
                      Load Again
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
