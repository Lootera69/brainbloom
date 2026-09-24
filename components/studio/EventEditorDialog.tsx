"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Calendar, HelpCircle, Palette } from "lucide-react";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { cn } from "@/lib/utils";
import {
  argbToCss,
  scheduleSummary,
  type EventDay,
  type EventQuestion,
  type EventSchedule,
  type EventTheme,
} from "@/lib/events/event-theme";

interface Props {
  open: boolean;
  event: EventTheme | null;
  canEdit: boolean;
  onClose: () => void;
  onSave: (updated: EventTheme) => void;
}

const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"][i],
}));
const WEEKDAY_OPTS = [
  { value: "1", label: "Monday" }, { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" }, { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" }, { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];
const ORDINAL_OPTS = [
  { value: "1", label: "1st" }, { value: "2", label: "2nd" }, { value: "3", label: "3rd" },
  { value: "4", label: "4th" }, { value: "5", label: "5th" }, { value: "-1", label: "Last" },
];

function isoFromDay(d: EventDay): string {
  return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
}
function dayFromIso(iso: string): EventDay | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function EventEditorDialog({ open, event, canEdit, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<EventTheme | null>(event);

  useEffect(() => {
    // Reset the working copy whenever a different event is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(event);
  }, [event]);

  if (!draft) return null;

  const patch = (p: Partial<EventTheme>) => setDraft({ ...draft, ...p });
  const patchSchedule = (s: EventSchedule) => setDraft({ ...draft, schedule: s });

  const field = (label: string, node: React.ReactNode) => (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {node}
    </label>
  );

  const textInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
  ) => (
    <input
      type="text"
      value={value}
      disabled={!canEdit}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
    />
  );

  const numInput = (
    value: number,
    onChange: (v: number) => void,
    min?: number,
    max?: number,
  ) => (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={!canEdit}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
    />
  );

  const s = draft.schedule;
  const nowYear = new Date().getFullYear();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-xl"
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{draft.emoji}</span>
                <div>
                  <h2 className="font-heading text-lg font-bold">{draft.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {scheduleSummary(draft.schedule)} · <code className="text-[11px]">{draft.id}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basics */}
              <section className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {field("Title", textInput(draft.title, (v) => patch({ title: v })))}
                  {field("Short label", textInput(draft.short, (v) => patch({ short: v })))}
                  {field("Emoji", textInput(draft.emoji, (v) => patch({ emoji: v })))}
                </div>
                {field("Banner greeting", textInput(draft.bannerCopy, (v) => patch({ bannerCopy: v })))}
                {field("Banner subtitle", textInput(draft.bannerSubtitle ?? "", (v) => patch({ bannerSubtitle: v || undefined })))}
              </section>

              {/* Palette preview (read-only for now) */}
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Palette className="size-3.5" /> Palette (preview)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["lightPalette", "darkPalette"] as const).map((mode) => {
                    const p = draft[mode];
                    return (
                      <div key={mode} className="rounded-xl border p-3">
                        <p className="mb-2 text-[11px] font-medium capitalize text-muted-foreground">
                          {mode === "lightPalette" ? "Light" : "Dark"}
                        </p>
                        <div className="flex gap-1.5">
                          {[p.accent, p.bannerFrom, p.bannerTo, p.orb1, p.orb2, p.orb3].map((c, i) => (
                            <span
                              key={i}
                              className="size-6 rounded-md border border-black/10"
                              style={{ background: argbToCss(c) }}
                              title={"#" + (c >>> 0).toString(16).padStart(8, "0")}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Schedule */}
              <section className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Calendar className="size-3.5" /> Schedule · {s.type}
                </p>

                {s.type === "fixedDate" && (
                  <div className="grid grid-cols-2 gap-3">
                    {field("Month", (
                      <SelectDropdown value={String(s.month)} onChange={(v) => patchSchedule({ ...s, month: Number(v) })} options={MONTH_OPTS} ariaLabel="Month" />
                    ))}
                    {field("Day", numInput(s.day, (v) => patchSchedule({ ...s, day: v }), 1, 31))}
                  </div>
                )}

                {s.type === "nthWeekday" && (
                  <div className="grid grid-cols-3 gap-3">
                    {field("Ordinal", (
                      <SelectDropdown value={String(s.ordinal)} onChange={(v) => patchSchedule({ ...s, ordinal: Number(v) })} options={ORDINAL_OPTS} ariaLabel="Ordinal" />
                    ))}
                    {field("Weekday", (
                      <SelectDropdown value={String(s.weekday)} onChange={(v) => patchSchedule({ ...s, weekday: Number(v) })} options={WEEKDAY_OPTS} ariaLabel="Weekday" />
                    ))}
                    {field("Month", (
                      <SelectDropdown value={String(s.month)} onChange={(v) => patchSchedule({ ...s, month: Number(v) })} options={MONTH_OPTS} ariaLabel="Month" />
                    ))}
                  </div>
                )}

                {s.type === "dateWindow" && (
                  <div className="grid grid-cols-2 gap-3">
                    {field("Start month", (
                      <SelectDropdown value={String(s.startMonth)} onChange={(v) => patchSchedule({ ...s, startMonth: Number(v) })} options={MONTH_OPTS} ariaLabel="Start month" />
                    ))}
                    {field("Start day", numInput(s.startDay, (v) => patchSchedule({ ...s, startDay: v }), 1, 31))}
                    {field("End month", (
                      <SelectDropdown value={String(s.endMonth)} onChange={(v) => patchSchedule({ ...s, endMonth: Number(v) })} options={MONTH_OPTS} ariaLabel="End month" />
                    ))}
                    {field("End day", numInput(s.endDay, (v) => patchSchedule({ ...s, endDay: v }), 1, 31))}
                  </div>
                )}

                {s.type === "computed" && (
                  <p className="rounded-xl border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    Rule-based schedule: <b>{s.kind}</b>. No fixed date to edit.
                  </p>
                )}

                {s.type === "perYearDates" && (
                  <div className="space-y-2">
                    {Object.keys(s.ranges).sort().map((yr) => {
                      const r = s.ranges[yr];
                      const missingFuture = Number(yr) < nowYear;
                      return (
                        <div key={yr} className={cn("flex items-center gap-2 rounded-xl border p-2", missingFuture && "opacity-50")}>
                          <span className="w-12 shrink-0 text-center text-sm font-semibold">{yr}</span>
                          <input
                            type="date"
                            value={isoFromDay(r.start)}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const nd = dayFromIso(e.target.value);
                              if (!nd) return;
                              patchSchedule({ ...s, ranges: { ...s.ranges, [yr]: { ...r, start: nd } } });
                            }}
                            className="flex-1 rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                          />
                          <span className="text-muted-foreground">→</span>
                          <input
                            type="date"
                            value={isoFromDay(r.end)}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const nd = dayFromIso(e.target.value);
                              if (!nd) return;
                              patchSchedule({ ...s, ranges: { ...s.ranges, [yr]: { ...r, end: nd } } });
                            }}
                            className="flex-1 rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                          />
                          {canEdit && (
                            <button
                              onClick={() => {
                                const next = { ...s.ranges };
                                delete next[yr];
                                patchSchedule({ ...s, ranges: next });
                              }}
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Remove year"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {canEdit && (
                      <button
                        onClick={() => {
                          const years = Object.keys(s.ranges).map(Number);
                          const nextYear = years.length ? Math.max(...years) + 1 : nowYear;
                          const seed = years.length ? s.ranges[String(Math.max(...years))] : { start: { y: nextYear, m: 1, d: 1 }, end: { y: nextYear, m: 1, d: 1 } };
                          patchSchedule({
                            ...s,
                            ranges: {
                              ...s.ranges,
                              [String(nextYear)]: {
                                start: { ...seed.start, y: nextYear },
                                end: { ...seed.end, y: nextYear },
                              },
                            },
                          });
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Plus className="size-3.5" /> Add year {(Object.keys(s.ranges).length ? Math.max(...Object.keys(s.ranges).map(Number)) + 1 : nowYear)}
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground/70">
                      Lunar / computed holidays need a date set for each upcoming year.
                    </p>
                  </div>
                )}
              </section>

              {/* Question */}
              <QuestionEditor
                question={draft.question}
                canEdit={canEdit}
                onChange={(q) => patch({ question: q })}
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted"
              >
                {canEdit ? "Cancel" : "Close"}
              </button>
              {canEdit && (
                <button
                  onClick={() => onSave(draft)}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  Apply changes
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QuestionEditor({
  question,
  canEdit,
  onChange,
}: {
  question?: EventQuestion;
  canEdit: boolean;
  onChange: (q: EventQuestion | undefined) => void;
}) {
  const q = question;

  const inputCls =
    "w-full rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60";

  if (!q) {
    return (
      <section>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <HelpCircle className="size-3.5" /> Special question
        </p>
        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          No themed question yet.
          {canEdit && (
            <button
              onClick={() =>
                onChange({ kicker: "", prompt: "", options: ["", "", "", ""], correctIndex: 0, xp: 30, factoid: "" })
              }
              className="ml-2 font-medium text-primary hover:underline"
            >
              Add one
            </button>
          )}
        </div>
      </section>
    );
  }

  const set = (p: Partial<EventQuestion>) => onChange({ ...q, ...p });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <HelpCircle className="size-3.5" /> Special question
        </p>
        {canEdit && (
          <button
            onClick={() => onChange(undefined)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3" /> Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input disabled={!canEdit} value={q.kicker} onChange={(e) => set({ kicker: e.target.value })} placeholder="Kicker (e.g. EARTH DAY QUIZ)" className={cn(inputCls, "col-span-2")} />
        <input disabled={!canEdit} type="number" value={q.xp} onChange={(e) => set({ xp: Number(e.target.value) })} placeholder="XP" className={inputCls} />
      </div>
      <textarea disabled={!canEdit} value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="Question prompt" rows={2} className={inputCls} />
      <div className="space-y-1.5">
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => set({ correctIndex: i })}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
                q.correctIndex === i ? "border-success bg-success text-white" : "text-muted-foreground",
              )}
              title={q.correctIndex === i ? "Correct answer" : "Mark correct"}
            >
              {String.fromCharCode(65 + i)}
            </button>
            <input
              disabled={!canEdit}
              value={opt}
              onChange={(e) => {
                const next = [...q.options];
                next[i] = e.target.value;
                set({ options: next });
              }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className={inputCls}
            />
          </div>
        ))}
      </div>
      <textarea disabled={!canEdit} value={q.factoid} onChange={(e) => set({ factoid: e.target.value })} placeholder="Factoid shown after answering" rows={2} className={inputCls} />
    </section>
  );
}
