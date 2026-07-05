"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { type Puzzle, type CrosswordClue } from "@/types/puzzle";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface Props {
  puzzle: Puzzle;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onRetry?: () => void;
  isRepeat?: boolean;
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

export function CrosswordPlay({ puzzle, onComplete, onRetry, isRepeat }: Props) {
  const cd = puzzle.crosswordData;
  if (!cd) return null;

  const size = cd.size;
  const answerGrid = cd.grid;
  const nums = useMemo(() => clueNumbers(answerGrid), [answerGrid]);

  const clueCells = useMemo(() => {
    const set = new Set<string>();
    for (const clue of cd.clues) {
      for (let i = 0; i < clue.answer.length; i++) {
        const r = clue.direction === "across" ? clue.startRow : clue.startRow + i;
        const c = clue.direction === "across" ? clue.startCol + i : clue.startCol;
        set.add(`${r},${c}`);
      }
    }
    return set;
  }, [cd.clues]);

  const isActiveCell = useCallback((r: number, c: number) => {
    return answerGrid[r]?.[c] !== null && clueCells.has(`${r},${c}`);
  }, [answerGrid, clueCells]);

  const [playerGrid, setPlayerGrid] = useState<(string)[][]>(() =>
    Array.from({ length: size }, () => Array(size).fill("")),
  );
  const [selectedRow, setSelectedRow] = useState(-1);
  const [selectedCol, setSelectedCol] = useState(-1);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[][]>(() =>
    Array.from({ length: size }, () => Array(size).fill(false)),
  );
  const [showClues, setShowClues] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    inputRefs.current = Array.from({ length: size }, () => Array(size).fill(null));
  }, [size]);

  useEffect(() => {
    if (selectedRow >= 0 && selectedCol >= 0) {
      const el = inputRefs.current[selectedRow]?.[selectedCol];
      el?.focus();
    }
  }, [selectedRow, selectedCol]);

  const activeClue = useMemo((): CrosswordClue | null => {
    if (selectedRow < 0 || selectedCol < 0) return null;
    const across = cd.clues.find((c) => {
      if (c.direction !== "across") return false;
      for (let i = 0; i < c.answer.length; i++) {
        if (c.startRow === selectedRow && c.startCol + i === selectedCol) return true;
      }
      return false;
    });
    if (across) return across;
    return cd.clues.find((c) => {
      if (c.direction !== "down") return false;
      for (let i = 0; i < c.answer.length; i++) {
        if (c.startRow + i === selectedRow && c.startCol === selectedCol) return true;
      }
      return false;
    }) ?? null;
  }, [selectedRow, selectedCol, cd.clues]);

  const highlightCells = useMemo(() => {
    if (!activeClue) return new Set<string>();
    const set = new Set<string>();
    for (let i = 0; i < activeClue.answer.length; i++) {
      const r = activeClue.direction === "across" ? activeClue.startRow : activeClue.startRow + i;
      const c = activeClue.direction === "across" ? activeClue.startCol + i : activeClue.startCol;
      set.add(`${r},${c}`);
    }
    return set;
  }, [activeClue]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (submitted) return;
    if (!isActiveCell(r, c)) return;
    if (selectedRow === r && selectedCol === c) {
      setSelectedRow(-1);
      setSelectedCol(-1);
    } else {
      setSelectedRow(r);
      setSelectedCol(c);
    }
  }, [submitted, isActiveCell, selectedRow, selectedCol]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, r: number, c: number) => {
    if (submitted) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      for (let nc = c + 1; nc < size; nc++) {
        if (isActiveCell(r, nc)) { setSelectedRow(r); setSelectedCol(nc); return; }
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      for (let nc = c - 1; nc >= 0; nc--) {
        if (isActiveCell(r, nc)) { setSelectedRow(r); setSelectedCol(nc); return; }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      for (let nr = r + 1; nr < size; nr++) {
        if (isActiveCell(nr, c)) { setSelectedRow(nr); setSelectedCol(c); return; }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      for (let nr = r - 1; nr >= 0; nr--) {
        if (isActiveCell(nr, c)) { setSelectedRow(nr); setSelectedCol(c); return; }
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (!isActiveCell(r, c)) return;
      const newGrid = playerGrid.map((row) => [...row]);
      newGrid[r][c] = "";
      let prevR = r, prevC = c - 1;
      if (activeClue?.direction === "across" && prevC >= 0 && isActiveCell(prevR, prevC) && c > activeClue.startCol) {
        setPlayerGrid(newGrid);
        setSelectedRow(prevR); setSelectedCol(prevC);
      } else if (activeClue?.direction === "down") {
        prevR = r - 1; prevC = c;
        if (prevR >= 0 && isActiveCell(prevR, prevC) && r > activeClue.startRow) {
          setPlayerGrid(newGrid);
          setSelectedRow(prevR); setSelectedCol(prevC);
        } else {
          setPlayerGrid(newGrid);
        }
      } else {
        setPlayerGrid(newGrid);
      }
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      e.preventDefault();
      if (!isActiveCell(r, c)) return;
      const letter = e.key.toUpperCase();
      const newGrid = playerGrid.map((row) => [...row]);
      newGrid[r][c] = letter;
      setPlayerGrid(newGrid);
      // Auto-advance in current direction
      if (activeClue?.direction === "across") {
        for (let nc = c + 1; nc < size; nc++) {
          if (isActiveCell(r, nc)) { setSelectedRow(r); setSelectedCol(nc); return; }
        }
      } else if (activeClue?.direction === "down") {
        for (let nr = r + 1; nr < size; nr++) {
          if (isActiveCell(nr, c)) { setSelectedRow(nr); setSelectedCol(c); return; }
        }
      }
    }
  }, [submitted, isActiveCell, size, playerGrid, activeClue, setPlayerGrid, setSelectedRow, setSelectedCol]);

  const handleCheck = useCallback(() => {
    const newResults = playerGrid.map((row, r) =>
      row.map((cell, c) => {
        if (answerGrid[r]?.[c] === null) return true;
        for (const clue of cd.clues) {
          for (let i = 0; i < clue.answer.length; i++) {
            const cr = clue.direction === "across" ? clue.startRow : clue.startRow + i;
            const cc = clue.direction === "across" ? clue.startCol + i : clue.startCol;
            if (cr === r && cc === c) {
              return cell.toUpperCase() === clue.answer[i].toUpperCase();
            }
          }
        }
        return true;
      }),
    );
    setResults(newResults);
    setSubmitted(true);
  }, [playerGrid, answerGrid, cd.clues]);

  const allCorrect = useMemo(() => {
    if (!submitted) return false;
    for (const key of clueCells) {
      const [r, c] = key.split(",").map(Number);
      if (!results[r]?.[c]) return false;
    }
    return true;
  }, [submitted, clueCells, results]);

  const handleContinue = () => {
    onComplete(allCorrect, allCorrect && !isRepeat ? puzzle.xpReward : 0);
  };

  const cellSize = size <= 10 ? "2.5rem" : "2rem";

  const acrossClues = cd.clues.filter((c) => c.direction === "across").sort((a, b) => a.number - b.number);
  const downClues = cd.clues.filter((c) => c.direction === "down").sort((a, b) => a.number - b.number);

  return (
    <div className="mx-auto max-w-lg">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Title */}
        <GlassCard className="mb-6 p-4 text-center sm:p-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {puzzle.difficulty} &middot; Crossword
          </p>
          <h2 className="font-heading text-lg font-bold sm:text-xl">{puzzle.title}</h2>
        </GlassCard>

        {/* Result banner */}
        {submitted && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <GlassCard className={`p-4 text-center ${allCorrect ? "ring-1 ring-success/30" : "ring-1 ring-destructive/20"}`}>
              <div className="flex items-center justify-center gap-2">
                {allCorrect ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-destructive" />}
                <span className="text-sm font-semibold">{allCorrect ? "Complete!" : "Not quite!"}</span>
              </div>
              {!allCorrect && (
                <p className="mt-1 text-xs text-muted-foreground">Wrong answers are highlighted in red. Fix them and try again.</p>
              )}
              {allCorrect && !isRepeat && (
                <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-success">
                  <Zap className="size-4" /> +{puzzle.xpReward} XP
                </p>
              )}
              {allCorrect && isRepeat && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Already solved — no extra XP earned</p>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Grid */}
        <div className="flex justify-center">
          <div
            className={cn("grid border-2 border-foreground/20", submitted && "pointer-events-none")}
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {answerGrid.map((row, r) =>
              row.map((cell, c) => {
                const isClueCell = clueCells.has(`${r},${c}`);
                const num = nums[r]?.[c] ?? 0;
                const isHighlighted = highlightCells.has(`${r},${c}`);
                const isSelected = selectedRow === r && selectedCol === c;
                const hasError = submitted && !results[r][c];
                const isCorrect = submitted && results[r][c] && isClueCell;
                const blocked = !isClueCell || cell === null;
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={cn(
                      "relative flex items-center justify-center border border-foreground/10 text-sm font-bold transition-colors",
                      blocked ? "bg-foreground/40 pointer-events-none" : "cursor-pointer",
                      isSelected && "ring-2 ring-primary",
                      isHighlighted && !isSelected && "bg-primary/8",
                      hasError && "bg-destructive/20",
                      isCorrect && "bg-success/10",
                    )}
                    style={{ width: cellSize, height: cellSize }}
                  >
                    {!blocked && (
                      <>
                        {num > 0 && (
                          <span className="absolute left-0.5 top-0.5 text-[8px] font-bold leading-none text-muted-foreground">
                            {num}
                          </span>
                        )}
                        <span className={cn(
                          "text-sm",
                          playerGrid[r]?.[c] ? "text-foreground" : "text-transparent",
                          hasError && "text-destructive",
                          isCorrect && "text-success",
                        )}>
                          {playerGrid[r]?.[c] || ""}
                        </span>
                        <input
                          ref={(el) => {
                            if (!inputRefs.current[r]) inputRefs.current[r] = [];
                            inputRefs.current[r][c] = el;
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0"
                          onKeyDown={(e) => handleKeyDown(e, r, c)}
                          onFocus={() => handleCellClick(r, c)}
                          tabIndex={0}
                          readOnly
                        />
                      </>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        {/* Current clue */}
        {activeClue && (
          <GlassCard intensity="light" className="mt-4 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {activeClue.direction === "across" ? "Across" : "Down"} &middot; #{activeClue.number}
            </p>
            <p className="mt-0.5 text-sm font-medium">{activeClue.clue}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {activeClue.answer.length} letters
            </p>
          </GlassCard>
        )}

        {/* Clues reference */}
        <div className="mt-4">
          <button type="button" onClick={() => setShowClues(!showClues)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {showClues ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            All clues
          </button>
          {showClues && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Across</p>
                {acrossClues.map((c) => (
                  <button key={`a-${c.number}`} type="button" onClick={() => { setSelectedRow(c.startRow); setSelectedCol(c.startCol); }}
                    className={cn("flex w-full items-start gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] hover:bg-muted",
                      activeClue?.number === c.number && activeClue?.direction === "across" && "bg-primary/10"
                    )}>
                    <span className="shrink-0 font-bold text-primary">{c.number}.</span>
                    <span className="line-clamp-1">{c.clue}</span>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Down</p>
                {downClues.map((c) => (
                  <button key={`d-${c.number}`} type="button" onClick={() => { setSelectedRow(c.startRow); setSelectedCol(c.startCol); }}
                    className={cn("flex w-full items-start gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] hover:bg-muted",
                      activeClue?.number === c.number && activeClue?.direction === "down" && "bg-secondary/10"
                    )}>
                    <span className="shrink-0 font-bold text-secondary">{c.number}.</span>
                    <span className="line-clamp-1">{c.clue}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        {!submitted && (
          <motion.button
            onClick={handleCheck}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]"
          >
            <Zap className="size-5" />
            Check Answers
          </motion.button>
        )}
        {submitted && !allCorrect && (
          <motion.button
            onClick={() => { onRetry?.(); setSubmitted(false); }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
          >
            <XCircle className="size-5" />
            Try Again
          </motion.button>
        )}
        {allCorrect && (
          <motion.button
            onClick={handleContinue}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]"
          >
            Continue <ArrowRight className="size-4" />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
