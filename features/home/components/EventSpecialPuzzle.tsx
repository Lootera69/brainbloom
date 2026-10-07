"use client";

// Event "Moments" — the themed "special question" card on Home (port of Flutter
// `event_special_puzzle.dart`). Surfaces the active Moment's multiple-choice
// question in a dark, palette-tinted card; grades on tap, awards XP once, then
// shows its factoid. Answered state persists per event per day.

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Check, X, CheckCircle2 } from "lucide-react";
import { useActiveMoment } from "@/hooks/use-active-moment";
import { useUserStore } from "@/store/user-store";
import { playCorrect, playWrong } from "@/services/sound-service";
import {
  eventDayToken,
} from "@/lib/events/event-runtime";
import { type Rgba, rgba, lerp, hex, WHITE, fromArgb } from "@/lib/events/event-colors";
import type { EventTheme } from "@/lib/events/event-theme";
import { answerMoment, readMomentResult } from "@/services/player-actions";
import { toast } from "sonner";

const GREEN = hex(0x22c55e);
const RED = hex(0xef4444);
const DARK = hex(0x0b0b12);

interface Skin { bg: string; accent: Rgba; ink: Rgba; }

/** Per-event skin. batman_day + halloween get bespoke palettes; everything else
 *  is a dark card tinted toward the event's own dark accent. */
function skinFor(event: EventTheme): Skin {
  if (event.id === "batman_day") {
    return { bg: `linear-gradient(135deg, #0B0B0F, #14151C, #0B0B0F)`, accent: hex(0xfacc15), ink: hex(0xf4f4f5) };
  }
  if (event.id === "halloween") {
    return { bg: `linear-gradient(135deg, #1A0B2E, #2E1065, #3B0A1E)`, accent: hex(0xfb923c), ink: hex(0xf8f4ff) };
  }
  const a = fromArgb(event.darkPalette.accent);
  const s = (t: number) => rgba(lerp(DARK, a, t));
  return { bg: `linear-gradient(135deg, ${s(0.12)}, ${s(0.24)}, ${s(0.1)})`, accent: a, ink: lerp(WHITE, a, 0.06) };
}

export function EventSpecialPuzzle() {
  const { event } = useActiveMoment();
  const tokens = useUserStore((s) => s.answeredEventTokens);
  const uid = useUserStore((s) => s.userId);
  const [busy, setBusy] = useState(false);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const generation = useRef(0);
  const question = event?.question ?? null;
  const token = event ? eventDayToken(event.id, new Date()) : "";
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scope = ++generation.current;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setPicked(null);
      setBusy(false);
      setConfirmedIndex(null);
      setExplanation(null);
      setEarned(null);
    });
    return () => { cancelled = true; generation.current = scope + 1; };
  }, [token, uid]);

  const saved = tokens.includes(token);
  const eventId = event?.id;
  useEffect(() => {
    if (!saved || !eventId || confirmedIndex !== null) return;
    let cancelled = false;
    const attempt = generation.current;
    void readMomentResult(eventId).then((result) => {
      if (cancelled || generation.current !== attempt || !result || result.token !== token) return;
      setConfirmedIndex(result.correctIndex);
      setPicked(result.choice ?? null);
      setExplanation(result.explanation);
      setEarned(result.xpEarned);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [saved, eventId, token, uid, confirmedIndex]);

  const skin = useMemo(() => (event ? skinFor(event) : null), [event]);

  if (!event || !question || !skin) return null;

  const answered = tokens.includes(token) || confirmedIndex !== null;
  const { accent, ink } = skin;

  const answer = async (i: number) => {
    if (answered || busy) return;
    const attempt = generation.current;
    setBusy(true);
    setPicked(i);
    try {
      const result = await answerMoment(event.id, i);
      if (generation.current !== attempt) return;
      if (result.token !== token) return;
      setConfirmedIndex(result.correctIndex);
      setPicked(result.choice ?? i);
      setExplanation(result.explanation);
      setEarned(result.xpEarned);
      if (result.correct) playCorrect();
      else playWrong();
    } catch (error) {
      if (generation.current !== attempt) return;
      setPicked(null);
      toast.error(error instanceof Error ? error.message : 'Connect and retry.');
    } finally {
      if (generation.current === attempt) setBusy(false);
    }
  };

  const stateFor = (i: number): "idle" | "correct" | "wrong" | "dimmed" => {
    if (!answered) return "idle";
    if (i === confirmedIndex) return "correct";
    if (i === picked) return "wrong";
    return "dimmed";
  };

  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-[22px]" style={{ background: skin.bg }}>
        {/* Generic motif backdrop — two soft accent orbs. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full"
          style={{ background: `radial-gradient(circle, ${rgba(accent, 0.26)}, ${rgba(accent, 0)})` }}
          animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-10 size-36 rounded-full"
          style={{ background: `radial-gradient(circle, ${rgba(accent, 0.16)}, ${rgba(accent, 0)})` }}
          animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />

        <div className="relative flex flex-col p-[18px] pt-4">
          {/* Header. */}
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
              style={{ background: rgba(accent, 0.16), border: `1px solid ${rgba(accent, 0.4)}` }}
            >
              {event.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-black uppercase" style={{ color: rgba(accent), letterSpacing: "1.4px" }}>
                {question.kicker}
              </p>
              <p className="mt-px truncate text-[12.5px] font-semibold" style={{ color: rgba(ink, 0.78) }}>
                Special {event.short} question
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-[3px] rounded-full px-[9px] py-[5px]" style={{ background: rgba(accent, 0.16) }}>
              <Zap className="size-[13px]" style={{ color: rgba(accent) }} fill="currentColor" />
              <span className="text-[12px] font-black" style={{ color: rgba(accent) }}>+{earned ?? (answered ? 0 : question.xp)}</span>
            </span>
          </div>

          {/* Prompt. */}
          <p className="mt-3.5 text-[17px] font-extrabold leading-[1.25]" style={{ color: rgba(ink) }}>
            {question.prompt}
          </p>

          {/* Options. */}
          <div className="mt-3.5 flex flex-col gap-2.5">
            {question.options.map((opt, i) => (
              <OptionTile key={i} label={opt} state={stateFor(i)} ink={ink} onClick={() => void answer(i)} disabled={busy || answered} />
            ))}
          </div>

          {busy && <p className="mt-2 text-sm" aria-live="polite">Checking...</p>}

          {/* Factoid footer. */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3.5 flex items-start gap-2.5"
              >
                <CheckCircle2 className="mt-px size-5 shrink-0" style={{ color: rgba(accent) }} />
                <p className="text-[13px] font-semibold" style={{ color: rgba(ink, 0.9) }}>{explanation ?? "Answered today. Connect to view your result."}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function OptionTile({ label, state, ink, onClick, disabled }: {
  label: string; state: "idle" | "correct" | "wrong" | "dimmed"; ink: Rgba; onClick: () => void; disabled: boolean;
}) {
  const border = state === "correct" ? GREEN : state === "wrong" ? RED
    : state === "dimmed" ? rgba(ink, 0.12) : rgba(ink, 0.22);
  const fill = state === "correct" ? rgba(GREEN, 0.18) : state === "wrong" ? rgba(RED, 0.16)
    : state === "dimmed" ? "transparent" : rgba(ink, 0.06);
  const text = state === "dimmed" ? rgba(ink, 0.45) : rgba(ink);
  const borderCss = typeof border === "string" ? border : rgba(border);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-[14px] px-3.5 py-[13px] text-left transition-transform active:scale-[0.99]"
      style={{ background: fill, border: `${state === "idle" || state === "dimmed" ? 1 : 1.6}px solid ${borderCss}` }}
    >
      <span className="text-[14.5px] font-bold" style={{ color: text }}>{label}</span>
      {state === "correct" && <Check className="size-[18px]" style={{ color: rgba(GREEN) }} />}
      {state === "wrong" && <X className="size-[18px]" style={{ color: rgba(RED) }} />}
    </button>
  );
}
