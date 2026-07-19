"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Eye, Gem, ArrowRight, Crown, Shield, Fingerprint, BadgeCheck, Timer, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { getWeeklyCipher, getWeekStart, getWeekEnd, getCipherPhase } from "@/services/weekly-cipher";
import { useRouter } from "next/navigation";
import { type Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";

interface Props {
  onOpenCipher?: () => void;
}

function SparkleOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute size-0.5 rounded-full bg-amber-500/60 dark:bg-amber-400/60"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function NextSundayCountdown() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = day === 0 ? 7 : 7 - day;
      const next = new Date(now);
      next.setUTCDate(next.getUTCDate() + diff);
      next.setUTCHours(0, 0, 0, 0);
      const ms = next.getTime() - now.getTime();
      if (ms <= 0) return;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTime(`${d.toString().padStart(2, "0")}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono tracking-[0.15em]">{time || "--:--:--:--"}</span>
  );
}

// Counts down to the moment solving closes: Saturday 00:00 UTC.
function SaturdayCloseCountdown() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const day = now.getUTCDay(); // 0=Sun … 6=Sat
      const diff = (6 - day + 7) % 7 || 7; // days until next Saturday (never 0)
      const next = new Date(now);
      next.setUTCDate(next.getUTCDate() + diff);
      next.setUTCHours(0, 0, 0, 0);
      const ms = next.getTime() - now.getTime();
      if (ms <= 0) return;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTime(`${d.toString().padStart(2, "0")}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono tracking-[0.15em]">{time || "--:--:--:--"}</span>
  );
}

export function WeeklyCipherCard({ onOpenCipher }: Props) {
  const router = useRouter();
  const [cipher, setCipher] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const getCipherState = useUserStore((s) => s.getCipherState);
  const solved = getCipherState() === "solved";
  const phase = getCipherPhase();
  // Solving is open Sun–Fri (active + hint). Saturday closes it and reveals the answer.
  const canSolve = !solved && (phase === "active" || phase === "hint");
  const hintAvailable = phase === "hint";
  // "revealed" = answer shown but NOT solved by the user (Saturday close). Kept
  // mutually exclusive with `solved` so the card's styling cases don't overlap.
  const revealed = !solved && phase === "closed";
  // The decoded answer block shows for both solved and closed states.
  const showAnswer = solved || revealed;

  useEffect(() => {
    (async () => {
      const p = await getWeeklyCipher();
      setCipher(p);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100/80 via-amber-50 to-orange-100/80 dark:from-amber-900/10 dark:via-black/40 dark:to-amber-950/10">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-amber-200/30 dark:via-amber-500/5 to-transparent" />
      </div>
    );
  }

  if (!cipher) return null;

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 18 }}
    >
      <GlassCard className={cn(
        "group relative overflow-hidden rounded-3xl border-2 p-[1px] transition-all duration-700 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100",
        solved && "border-amber-300 dark:border-amber-500/40",
        revealed && "border-amber-300/50 dark:border-amber-600/20",
        !solved && !revealed && "border-amber-200 hover:border-amber-300 dark:border-amber-500/20 dark:hover:border-amber-500/30",
      )}>
        <div className={cn(
          "relative overflow-hidden rounded-[calc(1.5rem-2px)] p-6 sm:p-8",
          solved && "bg-gradient-to-br from-amber-50 via-emerald-50 to-amber-100 dark:from-amber-950/40 dark:via-black/60 dark:to-amber-900/30",
          revealed && "bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/20 dark:via-black/50 dark:to-amber-900/10",
          !solved && !revealed && "bg-gradient-to-br from-amber-50 via-white to-amber-100 dark:from-amber-950/30 dark:via-black/70 dark:to-amber-900/20",
        )}>
          <SparkleOverlay />

          {/* Top glass highlight edge — premium sheen */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent dark:via-amber-400/30" />

          {!solved && !revealed && (
            <motion.div
              animate={{ opacity: [0.03, 0.06, 0.03] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.04),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.15),transparent_70%)]"
            />
          )}

          {solved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.04),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08),transparent_70%)]"
            />
          )}

          <div className="relative">
            {/* Classified badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5 flex items-center gap-3"
            >
              <div className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5",
                solved && "border-amber-200 bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10",
                revealed && "border-amber-200/50 bg-amber-100/50 dark:border-amber-600/20 dark:bg-amber-600/5",
                !solved && !revealed && "border-amber-200 bg-amber-100/80 dark:border-amber-500/20 dark:bg-amber-500/[0.08]",
              )}>
                <Fingerprint className={cn(
                  "size-3.5",
                  solved && "text-amber-600 dark:text-amber-400",
                  revealed && "text-amber-500 dark:text-amber-500/60",
                  !solved && !revealed && "text-amber-600/80 dark:text-amber-400/80",
                )} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em]",
                  solved && "text-amber-600 dark:text-amber-400",
                  revealed && "text-amber-500 dark:text-amber-500/60",
                  !solved && !revealed && "text-amber-600/80 dark:text-amber-400/80",
                )}>
                  CASE FILE
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-amber-200 to-transparent dark:from-amber-500/20 dark:to-transparent" />
            </motion.div>

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={!solved ? { rotate: [0, 4, -4, 0] } : { rotate: 0 }}
                    transition={{ duration: 5, repeat: !solved ? Infinity : 0, ease: "easeInOut" }}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
                      solved && "bg-amber-100 shadow-lg shadow-amber-200/50 dark:bg-amber-500/10 dark:shadow-lg dark:shadow-amber-500/10",
                      revealed && "bg-amber-100/50 dark:bg-amber-600/5",
                      !solved && !revealed && "bg-amber-100/80 dark:bg-amber-500/[0.07]",
                    )}
                  >
                    {solved && <BadgeCheck className="size-5 text-amber-600 dark:text-amber-400" />}
                    {revealed && <Eye className="size-5 text-amber-500/80 dark:text-amber-600/60" />}
                    {!solved && !revealed && (
                      <Shield className="size-5 text-amber-600/80 dark:text-amber-400/80" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className={cn(
                      "font-heading text-sm font-bold tracking-wide",
                      solved && "text-amber-700 dark:text-amber-300",
                      revealed && "text-amber-600/80 dark:text-amber-400/60",
                      !solved && !revealed && "text-amber-700/90 dark:text-amber-300/90",
                    )}>
                      {solved ? "CASE CLOSED" : revealed ? "FILE DECLASSIFIED" : "CIPHER OF THE WEEK"}
                    </h3>
                    {canSolve ? (
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-600/70 dark:text-amber-400/50">
                        <span>{hintAvailable ? "Hint unlocked — closes in" : "Active — closes in"}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold"><SaturdayCloseCountdown /></span>
                      </p>
                    ) : (
                      <p className={cn(
                        "text-[10px] font-mono uppercase tracking-wider",
                        solved && "text-amber-500/80 dark:text-amber-500/60",
                        revealed && "text-amber-500/60 dark:text-amber-600/40",
                      )}>
                        {revealed ? "Answer revealed — new file Sunday" : solved ? "Solved this week" : "New file every Sunday"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {solved && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 dark:border-amber-500/30 dark:bg-amber-500/10"
                >
                  <Crown className="size-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-bold tracking-wide text-amber-600 dark:text-amber-400">SOLVED</span>
                </motion.div>
              )}
            </div>

            {/* Puzzle info */}
            <div className="mb-4 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono uppercase tracking-wider text-amber-600/70 dark:text-amber-500/50">
                <span>{cipher.difficulty}</span>
                <span className="text-amber-600/40 dark:text-amber-500/30">&bull;</span>
                <span>{cipher.cipherData?.cipherType ?? "CIPHER"}</span>
                <span className="text-amber-600/40 dark:text-amber-500/30">&bull;</span>
                <span>CASE #{cipher.id.slice(0, 6).toUpperCase()}</span>
              </div>
              <h4 className={cn(
                "font-heading text-xl font-bold leading-snug tracking-tight",
                solved && "text-amber-800 dark:text-amber-200",
                revealed && "text-amber-700/80 dark:text-amber-300/70",
                !solved && !revealed && "text-amber-800/90 dark:text-amber-200/90",
              )}>
                {cipher.title}
              </h4>
              {/* The cryptic hint (cipherData.hint). Withheld until Friday
                  (hintAvailable), and always shown once the answer is out. */}
              {cipher.cipherData?.hint && (hintAvailable || showAnswer) && (
                <p className={cn(
                  "line-clamp-2 text-sm leading-relaxed",
                  solved && "text-amber-700/60 dark:text-amber-300/60",
                  revealed && "text-amber-600/70 dark:text-amber-400/50",
                  !solved && !revealed && "text-amber-700/60 dark:text-amber-300/60",
                )}>
                  {cipher.cipherData.hint}
                </p>
              )}
            </div>

            {/* Encoded message */}
            {cipher.cipherData?.encodedMessage && (
              <div className={cn(
                "relative mb-5 overflow-hidden rounded-xl border p-5",
                solved && "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/40",
                revealed && "border-amber-200/50 bg-amber-50/50 dark:border-amber-600/10 dark:bg-amber-950/20",
                !solved && !revealed && "border-amber-200 bg-white/60 dark:border-amber-500/15 dark:bg-black/60",
              )}>
                {!solved && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-200/30 to-transparent dark:from-amber-500/[0.03] dark:to-transparent" />
                )}
                {!solved && !revealed && (
                  <motion.div
                    animate={{ opacity: [0, 0.04, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.03),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)]"
                  />
                )}

                {!revealed && !solved && (
                  <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute right-3 top-3"
                  >
                    <Lock className="size-3 text-amber-600/60 dark:text-amber-500/40" />
                  </motion.div>
                )}

                {solved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-3 top-3"
                  >
                    <CheckCircle2 className="size-3.5 text-amber-600/80 dark:text-amber-400/60" />
                  </motion.div>
                )}

                <pre className={cn(
                  "select-all whitespace-pre-wrap break-all font-mono text-xs leading-relaxed tracking-[0.15em] sm:text-sm",
                  solved && "text-amber-700/60 dark:text-amber-300/60",
                  revealed && "text-amber-600/70 dark:text-amber-400/50",
                  !solved && !revealed && "text-amber-800/80 dark:text-amber-200/80",
                )}>
                  {cipher.cipherData.encodedMessage}
                </pre>
              </div>
            )}

            {/* Decoded answer — shown to the solver, and to everyone on Saturday */}
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-500/10 dark:bg-amber-950/30"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-200 to-transparent dark:from-amber-500/20 dark:to-transparent" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-600/70 dark:text-amber-500/50">
                    {solved ? "DECODED MESSAGE" : "DECLASSIFIED INTELLIGENCE"}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-amber-200 to-transparent dark:from-amber-500/20 dark:to-transparent" />
                </div>

                <p className="font-heading text-lg font-bold tracking-tight text-amber-700 dark:text-amber-300">
                  {cipher.correctAnswer}
                </p>
                {cipher.correctExplanation && (
                  <p className="mt-3 text-sm leading-relaxed text-amber-700/60 dark:text-amber-300/60">
                    {cipher.correctExplanation}
                  </p>
                )}
                {cipher.incorrectExplanation && !solved && (
                  <p className="mt-3 text-sm leading-relaxed text-amber-500/70 dark:text-amber-400/50">
                    {cipher.incorrectExplanation}
                  </p>
                )}
                {cipher.acceptedAnswers && cipher.acceptedAnswers.length > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-500/60 dark:text-amber-400/40">
                    <Gem className="size-3" />
                    Also accepted: {cipher.acceptedAnswers.join(", ")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-amber-200 pt-4 dark:border-amber-500/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                {solved ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600/80 dark:text-amber-400/60">
                    <Crown className="size-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Case closed</span>
                  </div>
                ) : revealed ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600/60 dark:text-amber-500/40">
                    <Eye className="size-3.5" />
                    <span>Closed for solving &middot; next file Sunday</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      onOpenCipher?.();
                      router.push(`/learn?cipher=${cipher.id}`);
                    }}
                    className="group/btn h-9 w-full justify-center gap-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-500/20 to-amber-600/20 px-4 text-xs font-bold uppercase tracking-wider text-amber-700 shadow-lg shadow-amber-200/30 backdrop-blur-sm transition-all hover:from-amber-500/30 hover:to-amber-600/30 hover:shadow-xl hover:shadow-amber-200/40 active:scale-[0.97] dark:border-amber-500/30 dark:bg-gradient-to-r dark:from-amber-600/20 dark:to-amber-700/20 dark:text-amber-300 dark:shadow-lg dark:shadow-amber-900/20 dark:hover:from-amber-600/30 dark:hover:to-amber-700/30 dark:hover:shadow-xl dark:hover:shadow-amber-900/30 sm:w-auto"
                  >
                    {hintAvailable ? "Decode with hint" : "Decode"} <ArrowRight className="size-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                  </Button>
                )}
              </div>

              <div className="shrink-0">
                {canSolve && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-amber-600/50 dark:text-amber-500/30">
                    {hintAvailable ? <Lightbulb className="size-3 shrink-0 text-amber-500/70 dark:text-amber-400/60" /> : <Timer className="size-3 shrink-0" />}
                    <span className="uppercase tracking-wider">{hintAvailable ? "Hint unlocked" : "Closes Saturday"}</span>
                    <span className="text-amber-500/70 dark:text-amber-400/50"><SaturdayCloseCountdown /></span>
                  </div>
                )}

                {solved && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-600/60 dark:text-amber-500/40">
                    <BadgeCheck className="size-3 shrink-0" />
                    <span>Solved this week</span>
                  </div>
                )}

                {revealed && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-amber-600/50 dark:text-amber-500/30">
                    <Timer className="size-3 shrink-0" />
                    <span className="uppercase tracking-wider">Next file in</span>
                    <span className="text-amber-500/70 dark:text-amber-400/50"><NextSundayCountdown /></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
