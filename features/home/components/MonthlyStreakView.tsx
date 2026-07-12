"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, Snowflake, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyStreakViewProps {
  activeDates: string[];
  frozenDays: string[];
  brokenDays: string[];
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthlyStreakView({ activeDates, frozenDays, brokenDays }: MonthlyStreakViewProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const directionRef = useRef(1);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const canGoNext = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth());

  const goNextMonth = () => {
    directionRef.current = 1;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else { setViewMonth((m) => m + 1); }
  };

  const goPrevMonth = () => {
    directionRef.current = -1;
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else { setViewMonth((m) => m - 1); }
  };

  const monthKey = `${viewYear}-${viewMonth}`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const todayStr = now.toDateString();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(viewYear, viewMonth - 1, d);
      days.push({ day: d, dateStr: date.toDateString(), isCurrentMonth: false, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      days.push({ day: d, dateStr: date.toDateString(), isCurrentMonth: true, isToday: date.toDateString() === todayStr });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(viewYear, viewMonth + 1, d);
        days.push({ day: d, dateStr: date.toDateString(), isCurrentMonth: false, isToday: false });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  const getStatus = (dateStr: string): "active" | "frozen" | "broken" | "empty" | "future" => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (date.getTime() > todayEnd.getTime()) return "future";
    if (activeDates.includes(dateStr)) return "active";
    if (frozenDays.includes(dateStr)) return "frozen";
    if (brokenDays.includes(dateStr)) return "broken";
    return "empty";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={goPrevMonth}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <motion.span
          key={`title-${monthKey}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-semibold tracking-tight"
        >
          {MONTHS[viewMonth]} {viewYear}
        </motion.span>
        <button
          onClick={goNextMonth}
          disabled={!canGoNext}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors",
            canGoNext ? "text-muted-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground/20",
          )}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d, idx) => (
          <div
            key={`day-${d}-${idx}`}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={monthKey}
            initial={{ opacity: 0, x: directionRef.current * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: directionRef.current * -24 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((cell, i) => {
                const status = getStatus(cell.dateStr);
                const isPast = status !== "future";
                const showDayNum = (status === "empty" || !cell.isCurrentMonth) && !cell.isToday && isPast;

                return (
                  <div
                    key={i}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-lg text-xs transition-all",
                      !cell.isCurrentMonth && "opacity-15",
                    )}
                  >
                    {status === "active" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.002 }}
                        className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm shadow-orange-500/30"
                      >
                        <CheckCircle2 className="size-4 text-white drop-shadow-sm" />
                      </motion.span>
                    )}

                    {status === "frozen" && (
                      <span className="flex size-8 items-center justify-center rounded-full border-2 border-blue-400/60 bg-blue-500/10">
                        <Snowflake className="size-3.5 text-blue-400" />
                      </span>
                    )}

                    {status === "broken" && (
                      <span className="flex size-8 items-center justify-center rounded-full border-2 border-red-400/60 bg-red-500/10">
                        <X className="size-3.5 text-red-400" />
                      </span>
                    )}

                    {showDayNum && (
                      <span className="text-[11px] font-medium text-muted-foreground/25">{cell.day}</span>
                    )}

                    {status === "future" && (
                      <span className="text-[11px] font-medium text-muted-foreground/10">{cell.day}</span>
                    )}

                    {cell.isToday && status === "empty" && (
                      <span className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                        <span className="text-[10px] font-medium text-muted-foreground/40">{cell.day}</span>
                      </span>
                    )}

                    {cell.isToday && (status === "active" || status === "frozen" || status === "broken") && (
                      <div className="pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-background" />
                    )}

                    {status === "active" && !cell.isToday && (
                      <div className="pointer-events-none absolute -bottom-0.5 left-1/2 size-0.5 -translate-x-1/2 rounded-full bg-orange-500/30" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {isCurrentMonth && (
        <div className="text-center text-[11px] text-muted-foreground/50">
          {activeDates.filter((d) => {
            const date = new Date(d);
            return date.getMonth() === viewMonth && date.getFullYear() === viewYear;
          }).length}{" "}
          active days this month
        </div>
      )}

      <div className="flex items-center justify-center gap-4 border-t border-muted/30 pt-3">
        <LegendItem icon={<CheckCircle2 className="size-2.5 text-white" />} bg="bg-gradient-to-br from-orange-500 to-amber-500" label="Active" />
        <LegendItem icon={<Snowflake className="size-2.5 text-blue-400" />} bg="border border-blue-400/60 bg-blue-500/10" label="Frozen" />
        <LegendItem icon={<X className="size-2.5 text-red-400" />} bg="border border-red-400/60 bg-red-500/10" label="Broken" />
        <div className="flex items-center gap-1">
          <span className="size-3.5 rounded-full border-2 border-dashed border-muted-foreground/30" />
          <span className="text-[10px] text-muted-foreground/60">Today</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ icon, bg, label }: { icon: React.ReactNode; bg: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn("flex size-3.5 items-center justify-center rounded-full", bg)}>
        {icon}
      </span>
      <span className="text-[10px] text-muted-foreground/60">{label}</span>
    </div>
  );
}
