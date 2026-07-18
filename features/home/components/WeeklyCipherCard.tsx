"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Eye, Gem, ArrowRight, Crown, Shield, Fingerprint, BadgeCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { getWeeklyCipher, getWeekStart, getWeekEnd } from "@/services/weekly-cipher";
import { isSunday } from "@/services/weekly-cipher";
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
          className="absolute size-0.5 rounded-full bg-amber-400/60"
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

export function WeeklyCipherCard({ onOpenCipher }: Props) {
  const router = useRouter();
  const [cipher, setCipher] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const getCipherState = useUserStore((s) => s.getCipherState);
  const cipherState = getCipherState();
  const dayState = isSunday() ? "sunday" : "week-reveal";
  const isAttemptDay = dayState === "sunday";
  const solved = cipherState === "solved";
  const revealed = cipherState === "revealed";

  useEffect(() => {
    (async () => {
      const p = await getWeeklyCipher();
      setCipher(p);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/10 via-black/40 to-amber-950/10">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-amber-500/5 to-transparent" />
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
        "group relative overflow-hidden rounded-3xl border-2 p-[1px] transition-all duration-700",
        solved && "border-amber-500/40",
        revealed && "border-amber-600/20",
        !solved && !revealed && "border-amber-500/20 hover:border-amber-500/30",
      )}>
        <div className={cn(
          "relative overflow-hidden rounded-[calc(1.5rem-2px)] p-6 sm:p-8",
          solved && "bg-gradient-to-br from-amber-950/40 via-black/60 to-amber-900/30",
          revealed && "bg-gradient-to-br from-amber-950/20 via-black/50 to-amber-900/10",
          !solved && !revealed && "bg-gradient-to-br from-amber-950/30 via-black/70 to-amber-900/20",
        )}>
          <SparkleOverlay />

          {!solved && !revealed && (
            <motion.div
              animate={{ opacity: [0.03, 0.06, 0.03] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.15),transparent_70%)]"
            />
          )}

          {solved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08),transparent_70%)]"
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
                solved && "border-amber-500/30 bg-amber-500/10",
                revealed && "border-amber-600/20 bg-amber-600/5",
                !solved && !revealed && "border-amber-500/20 bg-amber-500/[0.08]",
              )}>
                <Fingerprint className={cn(
                  "size-3.5",
                  solved && "text-amber-400",
                  revealed && "text-amber-500/60",
                  !solved && !revealed && "text-amber-400/80",
                )} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em]",
                  solved && "text-amber-400",
                  revealed && "text-amber-500/60",
                  !solved && !revealed && "text-amber-400/80",
                )}>
                  CASE FILE
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
            </motion.div>

            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={!solved ? { rotate: [0, 4, -4, 0] } : { rotate: 0 }}
                    transition={{ duration: 5, repeat: !solved ? Infinity : 0, ease: "easeInOut" }}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl transition-all duration-500",
                      solved && "bg-amber-500/10 shadow-lg shadow-amber-500/10",
                      revealed && "bg-amber-600/5",
                      !solved && !revealed && "bg-amber-500/[0.07]",
                    )}
                  >
                    {solved && <BadgeCheck className="size-5 text-amber-400" />}
                    {revealed && <Eye className="size-5 text-amber-600/60" />}
                    {!solved && !revealed && (
                      <Shield className="size-5 text-amber-400/80" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className={cn(
                      "font-heading text-sm font-bold tracking-wide",
                      solved && "text-amber-300",
                      revealed && "text-amber-400/60",
                      !solved && !revealed && "text-amber-300/90",
                    )}>
                      {solved ? "CASE CLOSED" : revealed ? "FILE DECLASSIFIED" : "CIPHER OF THE WEEK"}
                    </h3>
                    {isAttemptDay && !solved && !revealed ? (
                      <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400/50">
                        <span>ACTIVE — expires in</span>
                        <span className="text-amber-400 font-semibold"><NextSundayCountdown /></span>
                      </p>
                    ) : (
                      <p className={cn(
                        "text-[10px] font-mono uppercase tracking-wider",
                        solved && "text-amber-500/60",
                        revealed && "text-amber-600/40",
                      )}>
                        {revealed ? "Declassified until Saturday" : solved ? "Case closed" : "New file every Sunday"}
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
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5"
                >
                  <Crown className="size-3 text-amber-400" />
                  <span className="text-[10px] font-bold tracking-wide text-amber-400">SOLVED</span>
                </motion.div>
              )}
            </div>

            {/* Puzzle info */}
            <div className="mb-4 space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-500/50">
                <span>{cipher.difficulty}</span>
                <span className="text-amber-500/30">&bull;</span>
                <span>{cipher.cipherData?.cipherType ?? "CIPHER"}</span>
                <span className="text-amber-500/30">&bull;</span>
                <span>CASE #{cipher.id.slice(0, 6).toUpperCase()}</span>
              </div>
              <h4 className={cn(
                "font-heading text-xl font-bold leading-snug tracking-tight",
                solved && "text-amber-200",
                revealed && "text-amber-300/70",
                !solved && !revealed && "text-amber-200/90",
              )}>
                {cipher.title}
              </h4>
              {cipher.question && (
                <p className={cn(
                  "line-clamp-2 text-sm leading-relaxed",
                  solved && "text-amber-300/60",
                  revealed && "text-amber-400/50",
                  !solved && !revealed && "text-amber-300/60",
                )}>
                  {cipher.question}
                </p>
              )}
            </div>

            {/* Encoded message */}
            {cipher.cipherData?.encodedMessage && (
              <div className={cn(
                "relative mb-5 overflow-hidden rounded-xl border p-5",
                solved && "border-amber-500/20 bg-amber-950/40",
                revealed && "border-amber-600/10 bg-amber-950/20",
                !solved && !revealed && "border-amber-500/15 bg-black/60",
              )}>
                {!solved && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] to-transparent" />
                )}
                {!solved && !revealed && (
                  <motion.div
                    animate={{ opacity: [0, 0.04, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)]"
                  />
                )}

                {!revealed && !solved && (
                  <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute right-3 top-3"
                  >
                    <Lock className="size-3 text-amber-500/40" />
                  </motion.div>
                )}

                {solved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-3 top-3"
                  >
                    <CheckCircle2 className="size-3.5 text-amber-400/60" />
                  </motion.div>
                )}

                <pre className={cn(
                  "select-all whitespace-pre-wrap break-all font-mono text-xs leading-relaxed tracking-[0.15em] sm:text-sm",
                  solved && "text-amber-300/60",
                  revealed && "text-amber-400/50",
                  !solved && !revealed && "text-amber-200/80",
                )}>
                  {cipher.cipherData.encodedMessage}
                </pre>
              </div>
            )}

            {/* Revealed answer (Mon-Sat or after wrong) */}
            {(revealed || solved) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 overflow-hidden rounded-xl border border-amber-500/10 bg-amber-950/30 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-500/50">
                    {solved ? "DECODED MESSAGE" : "DECLASSIFIED INTELLIGENCE"}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-amber-500/20 to-transparent" />
                </div>

                <p className="font-heading text-lg font-bold tracking-tight text-amber-300">
                  {cipher.correctAnswer}
                </p>
                {cipher.correctExplanation && (
                  <p className="mt-3 text-sm leading-relaxed text-amber-300/60">
                    {cipher.correctExplanation}
                  </p>
                )}
                {cipher.incorrectExplanation && !solved && (
                  <p className="mt-3 text-sm leading-relaxed text-amber-400/50">
                    {cipher.incorrectExplanation}
                  </p>
                )}
                {cipher.acceptedAnswers && cipher.acceptedAnswers.length > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-400/40">
                    <Gem className="size-3" />
                    Also accepted: {cipher.acceptedAnswers.join(", ")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-amber-500/10 pt-4">
              <div className="flex items-center gap-2.5">
                {solved ? (
                  <div className="flex items-center gap-2 text-xs text-amber-400/60">
                    <Crown className="size-3.5 text-amber-400" />
                    <span>
                      <span className="font-semibold text-amber-400">25 gems</span>
                      {cipher.xpReward > 0 && (
                        <> &middot; +{cipher.xpReward} XP</>
                      )}
                    </span>
                  </div>
                ) : revealed ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500/40">
                    <Eye className="size-3.5" />
                    <span>File declassifies {weekEnd}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-400/60">
                    <Gem className="size-3.5 text-amber-400" />
                    <span>
                      <span className="font-semibold text-amber-400">25 gems</span>
                      {cipher.xpReward > 0 && (
                        <> &middot; +{cipher.xpReward} XP</>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div>
                {isAttemptDay && !solved && !revealed && (
                  <Button
                    onClick={() => {
                      onOpenCipher?.();
                      router.push(`/learn?cipher=${cipher.id}`);
                    }}
                    className="h-10 gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-600/20 to-amber-700/20 px-5 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-lg shadow-amber-900/20 backdrop-blur-sm transition-all hover:from-amber-600/30 hover:to-amber-700/30 hover:shadow-xl hover:shadow-amber-900/30 active:scale-[0.97]"
                  >
                    Decode <ArrowRight className="size-3.5" />
                  </Button>
                )}

                {isAttemptDay && !solved && !revealed && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-amber-500/30">
                    <Timer className="size-3" />
                    <span className="uppercase tracking-wider">Time remaining</span>
                    <span className="text-amber-400/50"><NextSundayCountdown /></span>
                  </div>
                )}

                {!isAttemptDay && !solved && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-amber-500/30">
                    <Timer className="size-3" />
                    <span className="uppercase tracking-wider">Next file in</span>
                    <span className="text-amber-400/50"><NextSundayCountdown /></span>
                  </div>
                )}

                {solved && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-500/40">
                    <BadgeCheck className="size-3" />
                    <span>Case closed this week</span>
                  </div>
                )}

                {isAttemptDay && revealed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-500/40">
                    <Eye className="size-3" />
                    <span>Solution revealed</span>
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
