"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const mistakeDots = Array.from({ length: MISTAKE_LIMIT }, (_, i) => (
    <span
      key={i}
      className={`inline-block size-2.5 rounded-full border transition-colors ${
        i < (mistakeCount % MISTAKE_LIMIT)
          ? "border-destructive bg-destructive"
          : "border-muted-foreground/30 bg-transparent"
      }`}
    />
  ));

  const isConflictCell = (index: number) => conflictCells.some((c) => c.index === index);

  return (
    <div className="flex flex-col items-center gap-3 px-2 pb-6">
      <div className="flex w-full max-w-md items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center gap-1.5">{mistakeDots}</div>
        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="grid w-full max-w-md aspect-square select-none border-2 border-border rounded-md overflow-hidden bg-card">
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
                  ? "bg-primary/25 text-foreground"
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

      <div className="flex w-full max-w-md flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <button
            onClick={() => setNoteMode(!noteMode)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              noteMode
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            Notes {noteMode ? "ON" : "OFF"}
          </button>
          <span className="text-[10px] text-muted-foreground">
            {selected !== null
              ? isClue(selected)
                ? "Clue"
                : `R${selectedRow + 1}C${selectedCol + 1}`
              : "Tap a cell"}
          </span>
        </div>

        <div className="grid grid-cols-10 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => fillCell(num)}
              disabled={completed}
              className="flex aspect-square items-center justify-center rounded-lg bg-card text-lg font-semibold shadow-sm transition-all hover:bg-primary/20 active:scale-90 disabled:opacity-40"
            >
              {num}
            </button>
          ))}
          <button
            onClick={eraseCell}
            disabled={completed}
            className="flex aspect-square items-center justify-center rounded-lg bg-card text-lg shadow-sm transition-all hover:bg-destructive/20 active:scale-90 disabled:opacity-40"
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
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => {
              setShowResult(false);
              onComplete(true, puzzle.xpReward);
            }}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-5xl">🎉</div>
              <h3 className="mb-1 text-xl font-bold">Sudoku Complete!</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Time: {formatTime(elapsed)} &middot; Mistakes: {mistakeCount}
              </p>
              <p className="mb-6 text-2xl font-bold text-primary">
                +{puzzle.xpReward} XP
              </p>
              <button
                onClick={() => onComplete(true, puzzle.xpReward)}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:brightness-110"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
