"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { type CrosswordData, type CrosswordClue } from "@/types/puzzle";
import { cn } from "@/lib/utils";

interface Props {
  value: CrosswordData;
  onChange: (data: CrosswordData) => void;
}

function emptyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(""));
}

function clueNumbers(grid: (string | null)[][]): number[][] {
  const size = grid.length;
  const nums: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  let n = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) continue;
      const across = c === 0 || grid[r][c - 1] === null;
      const down = r === 0 || grid[r - 1][c] === null;
      const hasAcrossSpace = across && c + 1 < size && grid[r][c + 1] !== null;
      const hasDownSpace = down && r + 1 < size && grid[r + 1][c] !== null;
      if (hasAcrossSpace || hasDownSpace) nums[r][c] = n++;
    }
  }
  return nums;
}

export function CrosswordForm({ value, onChange }: Props) {
  const [preview, setPreview] = useState(false);
  const [showClues, setShowClues] = useState(true);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const { grid, size } = value;
  const nums = useMemo(() => clueNumbers(grid), [grid]);

  const acrossClues = value.clues.filter((c) => c.direction === "across");
  const downClues = value.clues.filter((c) => c.direction === "down");

  const setSize = useCallback(
    (newSize: number) => {
      const clamped = Math.max(5, Math.min(15, newSize));
      const g = emptyGrid(clamped);
      for (let r = 0; r < Math.min(size, clamped); r++) {
        for (let c = 0; c < Math.min(size, clamped); c++) {
          g[r][c] = grid[r]?.[c] ?? "";
        }
      }
      onChange({ size: clamped, grid: g, clues: [] });
    },
    [grid, size, onChange],
  );

  const toggleCell = useCallback(
    (row: number, col: number) => {
      const g = grid.map((r) => [...r]);
      g[row][col] = g[row][col] === null ? "" : null;
      const valid = value.clues.filter((c) => {
        if (c.direction === "across") {
          for (let i = 0; i < c.answer.length; i++) {
            if (g[c.startRow]?.[c.startCol + i] === null) return false;
          }
        } else {
          for (let i = 0; i < c.answer.length; i++) {
            if (g[c.startRow + i]?.[c.startCol] === null) return false;
          }
        }
        return true;
      });
      onChange({ ...value, grid: g, clues: valid });
    },
    [grid, value, onChange],
  );

  const saveClue = useCallback(
    (clue: CrosswordClue) => {
      const idx = value.clues.findIndex(
        (c) => c.startRow === clue.startRow && c.startCol === clue.startCol && c.direction === clue.direction,
      );
      const clues =
        idx >= 0
          ? value.clues.map((c, i) => (i === idx ? clue : c))
          : [...value.clues, clue];
      onChange({ ...value, clues });
    },
    [value, onChange],
  );

  const removeClue = useCallback(
    (row: number, col: number, direction: "across" | "down") => {
      onChange({
        ...value,
        clues: value.clues.filter(
          (c) => !(c.startRow === row && c.startCol === col && c.direction === direction),
        ),
      });
    },
    [value, onChange],
  );

  const clueAt = (row: number, col: number, direction?: "across" | "down") =>
    value.clues.find(
      (c) =>
        c.startRow === row &&
        c.startCol === col &&
        (direction === undefined || c.direction === direction),
    );

  const cellNum = (row: number, col: number): number | null => {
    const n = nums[row]?.[col] ?? 0;
    return n > 0 ? n : null;
  };

  return (
    <div className="space-y-6">
      {/* Size + preview controls */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Grid:</label>
        <button type="button" onClick={() => setSize(size - 1)} disabled={size <= 5}
          className="flex size-8 items-center justify-center rounded-lg border text-sm hover:bg-muted disabled:opacity-30">-</button>
        <span className="w-8 text-center font-mono text-sm font-bold">{size}</span>
        <button type="button" onClick={() => setSize(size + 1)} disabled={size >= 15}
          className="flex size-8 items-center justify-center rounded-lg border text-sm hover:bg-muted disabled:opacity-30">+</button>
        <span className="text-xs text-muted-foreground">{size}×{size}</span>
        <button type="button" onClick={() => setPreview(!preview)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
          {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {preview ? "Edit" : "Preview"}
        </button>
        <span className="text-xs text-muted-foreground">
          {value.clues.length} clue{value.clues.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      <div className="flex justify-center">
        <div
          className={cn("grid border-2 border-foreground/20", preview && "pointer-events-none")}
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: `${size * 2.25}rem`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const num = cellNum(r, c);
              const aClue = clueAt(r, c, "across");
              const dClue = clueAt(r, c, "down");
              const isEditing = editingCell?.row === r && editingCell?.col === c;
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => {
                    if (preview) return;
                    if (cell === null) { toggleCell(r, c); return; }
                    setEditingCell(isEditing ? null : { row: r, col: c });
                  }}
                  className={cn(
                    "relative flex items-center justify-center border border-foreground/10 text-sm font-bold transition-colors",
                    cell === null ? "bg-foreground/20" : "bg-card hover:bg-primary/5 cursor-pointer",
                    preview && cell !== null && "bg-background",
                  )}
                  style={{ width: "2.25rem", height: "2.25rem" }}
                >
                  {cell !== null && (
                    <>
                      {num && <span className="absolute left-0.5 top-0.5 text-[8px] font-bold leading-none text-muted-foreground">{num}</span>}
                      {preview ? (
                        <span className="text-sm">{cell || ""}</span>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground/30">{cell ? cell : "-"}</span>
                          {(aClue || dClue) && (
                            <span className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                              {aClue && <span className="size-1 rounded-full bg-primary" />}
                              {dClue && <span className="size-1 rounded-full bg-secondary" />}
                            </span>
                          )}
                        </>
                      )}
                      {isEditing && <span className="absolute inset-0 rounded-sm ring-2 ring-primary" />}
                    </>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Clue editor */}
      <AnimatePresence>
        {editingCell && grid[editingCell.row]?.[editingCell.col] !== null && (
          <motion.div
            key={`editor-${editingCell.row}-${editingCell.col}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border bg-card p-4"
          >
            <CellClueEditor
              row={editingCell.row}
              col={editingCell.col}
              grid={grid}
              nums={nums}
              existingAcross={clueAt(editingCell.row, editingCell.col, "across") ?? null}
              existingDown={clueAt(editingCell.row, editingCell.col, "down") ?? null}
              onSave={saveClue}
              onRemove={removeClue}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clues list */}
      <div>
        <button type="button" onClick={() => setShowClues(!showClues)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {showClues ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Clues ({value.clues.length})
        </button>
        {showClues && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Across</h4>
              {acrossClues.length === 0 && <p className="text-xs text-muted-foreground/60">No across clues.</p>}
              <div className="space-y-1.5">
                {acrossClues.sort((a, b) => a.number - b.number).map((c) => (
                  <button key={`a-${c.number}`} type="button" onClick={() => setEditingCell({ row: c.startRow, col: c.startCol })}
                    className="flex w-full items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left text-xs hover:bg-muted">
                    <span className="shrink-0 font-bold text-primary">{c.number}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{c.clue || "(no clue)"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{c.answer.toUpperCase()} ({c.answer.length})</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Down</h4>
              {downClues.length === 0 && <p className="text-xs text-muted-foreground/60">No down clues.</p>}
              <div className="space-y-1.5">
                {downClues.sort((a, b) => a.number - b.number).map((c) => (
                  <button key={`d-${c.number}`} type="button" onClick={() => setEditingCell({ row: c.startRow, col: c.startCol })}
                    className="flex w-full items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left text-xs hover:bg-muted">
                    <span className="shrink-0 font-bold text-secondary">{c.number}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{c.clue || "(no clue)"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{c.answer.toUpperCase()} ({c.answer.length})</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CellClueEditorProps {
  row: number;
  col: number;
  grid: (string | null)[][];
  nums: number[][];
  existingAcross: CrosswordClue | null;
  existingDown: CrosswordClue | null;
  onSave: (clue: CrosswordClue) => void;
  onRemove: (row: number, col: number, dir: "across" | "down") => void;
}

function CellClueEditor({ row, col, grid, nums, existingAcross, existingDown, onSave, onRemove }: CellClueEditorProps) {
  const [tab, setTab] = useState<"across" | "down">(existingAcross ? "across" : "down");
  const existing = tab === "across" ? existingAcross : existingDown;
  const [clueText, setClueText] = useState(existing?.clue ?? "");
  const [answer, setAnswer] = useState(existing?.answer ?? "");

  const maxLen =
    tab === "across"
      ? grid[row].slice(col).filter((c) => c !== null).length
      : grid.slice(row).filter((r) => r[col] !== null).length;

  const num = nums[row]?.[col] ?? 0;

  const handleSave = () => {
    if (!clueText.trim() || !answer.trim()) return;
    onSave({
      number: existing?.number ?? (num > 0 ? num : Math.max(grid.flat().filter((c) => c !== null).length, 1)),
      clue: clueText.trim(),
      answer: answer.trim().toUpperCase(),
      startRow: row,
      startCol: col,
      direction: tab,
    });
    setClueText("");
    setAnswer("");
  };

  const handleRemove = () => {
    onRemove(row, col, tab);
    setClueText("");
    setAnswer("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Cell ({row + 1}, {col + 1}) {num > 0 && <span className="text-muted-foreground">— #{num}</span>}
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={() => { setTab("across"); setClueText(existingAcross?.clue ?? ""); setAnswer(existingAcross?.answer ?? ""); }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${tab === "across" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            Across
          </button>
          <button type="button" onClick={() => { setTab("down"); setClueText(existingDown?.clue ?? ""); setAnswer(existingDown?.answer ?? ""); }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${tab === "down" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
            Down
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Clue</label>
        <input value={clueText} onChange={(e) => setClueText(e.target.value)}
          placeholder="e.g. Capital of France"
          className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Answer <span className="text-muted-foreground/60">(max {maxLen})</span>
        </label>
        <input value={answer} onChange={(e) => setAnswer(e.target.value.slice(0, maxLen).toUpperCase())}
          placeholder={maxLen > 0 ? "PARIS" : "No space"}
          disabled={maxLen === 0}
          className="w-full rounded-lg border bg-card px-3 py-2 font-mono text-sm uppercase outline-none focus:border-primary disabled:opacity-40" />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave}
          disabled={!clueText.trim() || !answer.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40">
          {existing ? "Update" : "Add"}
        </button>
        {existing && (
          <button type="button" onClick={handleRemove}
            className="flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3.5" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
