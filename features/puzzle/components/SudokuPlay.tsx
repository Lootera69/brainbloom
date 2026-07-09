"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Zap, Sparkles, Clock, Pencil } from "lucide-react";
import type { Puzzle } from "@/types/puzzle";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

interface SudokuPlayProps {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onWrongAttempt?: () => void;
  isRepeat?: boolean;
}

type CellValue = number | null;

const SIZE = 9;
const MISTAKE_LIMIT = 3;
const SAVE_KEY = (id: string) => `brainbloom-sudoku-${id}`;

interface Conflict {
  index: number;
  number: number;
}

interface SavedData {
  cells: CellValue[];
  notes: number[][];
  mistakeCount: number;
  elapsed: number;
}

const MistakeDots = ({ count }: { count: number }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: MISTAKE_LIMIT }, (_, i) => (
        <motion.span
          key={i}
          initial={i < count ? { scale: 1.3 } : { scale: 1 }}
          animate={{ scale: 1 }}
          className={cn(
            "inline-block size-2.5 rounded-full border transition-colors",
            i < count
              ? "border-destructive bg-destructive"
              : "border-muted-foreground/30 bg-transparent",
          )}
        />
      ))}
    </div>
  );
};

export function SudokuPlay({ puzzle, onComplete, onWrongAttempt, isRepeat }: SudokuPlayProps) {
  const sudokuData = puzzle.sudokuData!;
  const initialClues = sudokuData.puzzle;
  const solution = sudokuData.solution;

  const freshCells = initialClues.map((v) => (v > 0 ? v : null));

  const [cells, setCells] = useState<CellValue[]>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY(puzzle.id));
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        if (data.cells && data.cells.length === SIZE * SIZE) return data.cells;
      }
    } catch {}
    return freshCells;
  });

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [notes, setNotes] = useState<Set<number>[]>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY(puzzle.id));
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        if (data.notes) return data.notes.map((n) => new Set(n));
      }
    } catch {}
    return Array.from({ length: SIZE * SIZE }, () => new Set<number>());
  });

  const [completed, setCompleted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [elapsed, setElapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY(puzzle.id));
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        return data.elapsed ?? 0;
      }
    } catch {}
    return 0;
  });
  const [mistakeCount, setMistakeCount] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY(puzzle.id));
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        return data.mistakeCount ?? 0;
      }
    } catch {}
    return 0;
  });
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const [conflictCells, setConflictCells] = useState<Conflict[]>([]);

  const isClue = (index: number) => initialClues[index] > 0;

  const selected = selectedCell;
  const selectedRow = selected !== null ? Math.floor(selected / SIZE) : -1;
  const selectedCol = selected !== null ? selected % SIZE : -1;
  const selectedBoxRow = selectedRow >= 0 ? Math.floor(selectedRow / 3) : -1;
  const selectedBoxCol = selectedCol >= 0 ? Math.floor(selectedCol / 3) : -1;

  const isHighlighted = (index: number) => {
    if (selected === null || index === selected) return false;
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    return (
      row === selectedRow ||
      col === selectedCol ||
      (Math.floor(row / 3) === selectedBoxRow && Math.floor(col / 3) === selectedBoxCol)
    );
  };

  const isSameNumber = (index: number) => {
    if (selected === null || cells[selected] === null) return false;
    return cells[index] === cells[selected];
  };

  function findConflicts(index: number, num: number): Conflict[] {
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const found: Conflict[] = [];
    for (let c = 0; c < SIZE; c++) {
      const idx = row * SIZE + c;
      if (idx !== index && cells[idx] === num) found.push({ index: idx, number: num });
    }
    for (let r = 0; r < SIZE; r++) {
      const idx = r * SIZE + col;
      if (idx !== index && cells[idx] === num) found.push({ index: idx, number: num });
    }
    for (let r = boxRow; r < boxRow + 3; r++)
      for (let c = boxCol; c < boxCol + 3; c++) {
        const idx = r * SIZE + c;
        if (idx !== index && cells[idx] === num && !found.some((f) => f.index === idx))
          found.push({ index: idx, number: num });
      }
    return found;
  }

  useEffect(() => {
    if (completed) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [completed]);

  useEffect(() => {
    if (completed) {
      localStorage.removeItem(SAVE_KEY(puzzle.id));
      return;
    }
    const data: SavedData = {
      cells,
      notes: notes.map((s) => [...s]),
      mistakeCount,
      elapsed,
    };
    localStorage.setItem(SAVE_KEY(puzzle.id), JSON.stringify(data));
  }, [cells, notes, mistakeCount, elapsed, completed, puzzle.id]);

  const checkCompletion = useCallback(
    (currentCells: CellValue[]) => {
      const allFilled = currentCells.every((c) => c !== null);
      if (!allFilled) return;
      const allCorrect = currentCells.every((c, i) => c === solution[i]);
      if (allCorrect) {
        localStorage.removeItem(SAVE_KEY(puzzle.id));
        setCompleted(true);
        setTimeout(() => {
          setShowResult(true);
          onComplete(true, puzzle.xpReward);
        }, 600);
      }
    },
    [solution, onComplete, puzzle.xpReward],
  );

  const doMistake = useCallback(() => {
    const newCount = mistakeCount + 1;
    setMistakeCount(newCount);
    if (newCount % MISTAKE_LIMIT === 0) {
      onWrongAttempt?.();
      const hearts = useUserStore.getState().hearts;
      if (hearts <= 0) {
        localStorage.removeItem(SAVE_KEY(puzzle.id));
        setCompleted(true);
        setTimeout(() => onComplete(false, 0), 400);
      }
    }
  }, [mistakeCount, onWrongAttempt, onComplete]);

  const fillCell = useCallback(
    (num: number) => {
      if (completed) return;

      let target = selected;
      if (target === null) {
        const firstEmpty = cells.indexOf(null);
        if (firstEmpty === -1) return;
        target = firstEmpty;
        setSelectedCell(firstEmpty);
      }

      if (isClue(target)) return;

      const conflicts = findConflicts(target, num);
      const isWrong = !noteMode && num !== solution[target];
      const isError = !noteMode && (conflicts.length > 0 || isWrong);

      if (conflicts.length > 0) {
        setShakeIndex(target);
        setConflictCells(conflicts);
        setTimeout(() => {
          setShakeIndex(null);
          setConflictCells([]);
        }, 600);
        if (noteMode) return;
        if (isError) {
          doMistake();
          return;
        }
      }

      if (isError) {
        setShakeIndex(target);
        setTimeout(() => setShakeIndex(null), 600);
        doMistake();
        return;
      }

      if (noteMode) {
        setNotes((prev) => {
          const next = [...prev];
          const s = new Set(next[target]);
          s.has(num) ? s.delete(num) : s.add(num);
          next[target] = s;
          return next;
        });
        return;
      }

      const next = [...cells];
      next[target] = num;
      setCells(next);
      setNotes((prev) => {
        const n = [...prev];
        n[target] = new Set();
        const row = Math.floor(target / SIZE);
        const col = target % SIZE;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < n.length; i++) {
          if (i === target) continue;
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const inRow = r === row;
          const inCol = c === col;
          const inBox = r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3;
          if (inRow || inCol || inBox) {
            const s = new Set(n[i]);
            if (s.has(num)) {
              s.delete(num);
              n[i] = s;
            }
          }
        }
        return n;
      });

      const nextEmpty = next.findIndex((c, i) => c === null && i !== target);
      if (nextEmpty !== -1) {
        setSelectedCell(nextEmpty);
      }

      checkCompletion(next);
    },
    [completed, selected, cells, isClue, noteMode, solution, doMistake, checkCompletion],
  );

  const eraseCell = useCallback(() => {
    if (selected === null || completed) return;
    if (isClue(selected)) return;
    setCells((prev) => {
      const next = [...prev];
      next[selected] = null;
      return next;
    });
    setNotes((prev) => {
      const next = [...prev];
      next[selected] = new Set();
      return next;
    });
  }, [selected, completed, isClue]);

  const handleCellClick = useCallback((index: number) => {
    setSelectedCell((prev) => (prev === index ? null : index));
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const filledCells = cells.filter((v) => v !== null).length;
  const progress = filledCells / (SIZE * SIZE);

  const isConflictCell = (index: number) => conflictCells.some((c) => c.index === index);

  return (
    <div className="flex flex-col items-center gap-3 px-2 pb-6">
      {/* Status bar */}
      <div className="flex w-full max-w-md items-center justify-between rounded-2xl bg-card/80 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span className="tabular-nums font-medium">{formatTime(elapsed)}</span>
        </div>
        <MistakeDots count={mistakeCount % MISTAKE_LIMIT} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{Math.round(progress * 100)}%</span>
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress * 100, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid w-full max-w-md aspect-square select-none border-2 border-border rounded-lg overflow-hidden bg-card shadow-lg">
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const row = Math.floor(i / SIZE);
          const col = i % SIZE;
          const value = cells[i];
          const cellNotes = notes[i];
          const isClueCell = isClue(i);
          const isSelected = selected === i;
          const isShaking = shakeIndex === i;
          const isConflict = isConflictCell(i);

          return (
            <motion.button
              key={i}
              onClick={() => handleCellClick(i)}
              animate={isShaking ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "relative flex items-center justify-center font-medium outline-none transition-colors",
                "border-r border-b border-border/40",
                col % 3 === 2 && col !== 8 ? "border-r-[2.5px] border-r-border" : "",
                row % 3 === 2 && row !== 8 ? "border-b-[2.5px] border-b-border" : "",
                isClueCell
                  ? "bg-card font-bold text-foreground"
                  : "bg-card/60 text-foreground",
                isSelected
                  ? "bg-primary/25 text-foreground ring-2 ring-primary/40 z-10"
                  : isHighlighted(i)
                    ? "bg-primary/8"
                    : "",
                isShaking ? "bg-destructive/25 text-destructive" : "",
                isConflict ? "bg-destructive/20" : "",
                !isClueCell && value === null
                  ? "cursor-pointer"
                  : "",
                isSameNumber(i) && !isSelected
                  ? "bg-primary/15"
                  : "",
                completed ? "text-green-600 dark:text-green-400" : "",
              )}
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
                fontSize: "clamp(0.875rem, 4vw, 1.25rem)",
              }}
            >
              {value !== null ? (
                <motion.span
                  key={value}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {value}
                </motion.span>
              ) : cellNotes.size > 0 ? (
                <div className="grid grid-cols-3 gap-0 text-[0.5rem] leading-none opacity-60">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span key={n} className="flex h-2.5 w-2.5 items-center justify-center">
                      {cellNotes.has(n) ? n : ""}
                    </span>
                  ))}
                </div>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex w-full max-w-md flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <motion.button
            onClick={() => setNoteMode(!noteMode)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-medium transition-all",
              noteMode
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted hover:border-primary/30",
            )}
          >
            <Pencil className="size-3.5" />
            Notes {noteMode ? "ON" : "OFF"}
          </motion.button>
          <span className="text-[10px] text-muted-foreground">
            {selected !== null
              ? isClue(selected)
                ? "Clue cell"
                : `R${selectedRow + 1}C${selectedCol + 1}`
              : "Tap a cell"}
          </span>
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-10 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              onClick={() => fillCell(num)}
              disabled={completed}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className="flex aspect-square items-center justify-center rounded-xl bg-card text-lg font-semibold shadow-sm transition-all hover:bg-primary/20 hover:shadow-md hover:shadow-primary/10 active:scale-90 disabled:opacity-40"
            >
              {num}
            </motion.button>
          ))}
          <motion.button
            onClick={eraseCell}
            disabled={completed}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="flex aspect-square items-center justify-center rounded-xl bg-card text-lg shadow-sm transition-all hover:bg-destructive/20 hover:shadow-md hover:shadow-destructive/10 active:scale-90 disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Completion modal */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-success/30 bg-card p-6 text-center shadow-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background sparkle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="absolute -top-10 -right-10"
              >
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Sparkles className="size-28 text-success/10" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10"
              >
                <CheckCircle2 className="size-8 text-success" />
              </motion.div>

              <h3 className="relative mb-1 text-xl font-bold">Sudoku Complete!</h3>
              <p className="relative mb-4 text-sm text-muted-foreground">
                Solved in {formatTime(elapsed)} with {mistakeCount} mistake{mistakeCount !== 1 ? "s" : ""}
              </p>

              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative mb-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-success/20 to-emerald-500/20 px-4 py-2"
              >
                <Zap className="size-5 text-success" />
                <span className="text-lg font-bold text-success">+{puzzle.xpReward} XP</span>
              </motion.div>

              <motion.button
                onClick={() => { setShowResult(false); onComplete(true, puzzle.xpReward); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="relative w-full rounded-xl bg-gradient-to-br from-primary to-[#8b5cf6] py-3 font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
