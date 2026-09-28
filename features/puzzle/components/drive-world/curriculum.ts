// Pure curriculum logic for the road — a verbatim mirror of the grouping,
// unlock and sub-lesson-state rules in `CurriculumPath.tsx`, plus the
// Duolingo-style collapse model that turns groups into road checkpoints.
import { type Puzzle } from "@/types/puzzle";

export interface LessonProgress {
  currentOrder: number;
  totalInGroup: number;
  completedInGroup: number;
  groupName: string;
  groupNumber: number;
}

export interface LessonGroup {
  name: string;
  order: number;
  puzzles: Puzzle[];
}

export type SubLessonState = "locked" | "available" | "completed";

/** Completion predicate — wonders live in a separate set (no XP/streak). */
export function makeIsCompleted(completedIds: string[], wonderIds: string[]) {
  return (p: Puzzle): boolean =>
    p.type === "wonder" ? wonderIds.includes(p.id) : completedIds.includes(p.id);
}

/** Lesson puzzles only, sorted by (groupOrder, lessonOrder). */
export function buildLessonGroups(puzzles: Puzzle[]): LessonGroup[] {
  const lesson = puzzles
    .filter((p) => p.lessonOrder != null)
    .sort((a, b) => {
      const go = (a.lessonGroupOrder ?? 999) - (b.lessonGroupOrder ?? 999);
      if (go !== 0) return go;
      return (a.lessonOrder ?? 0) - (b.lessonOrder ?? 0);
    });
  const map = new Map<string, Puzzle[]>();
  for (const p of lesson) {
    const key = p.lessonGroup || "__default__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  const result: LessonGroup[] = [];
  for (const [name, groupPuzzles] of map) {
    result.push({
      name: name === "__default__" ? "" : name,
      order: groupPuzzles[0]?.lessonGroupOrder ?? 0,
      puzzles: groupPuzzles,
    });
  }
  result.sort((a, b) => a.order - b.order);
  return result;
}

/** Puzzles with no lesson slot — shown as bonus below the road. */
export function extrasOf(puzzles: Puzzle[]): Puzzle[] {
  return puzzles.filter((p) => p.lessonOrder == null);
}

export function isGroupCompleted(
  group: LessonGroup,
  isCompleted: (p: Puzzle) => boolean,
): boolean {
  return group.puzzles.length > 0 && group.puzzles.every(isCompleted);
}

export function isGroupUnlocked(
  groups: LessonGroup[],
  gi: number,
  isCompleted: (p: Puzzle) => boolean,
): boolean {
  if (gi === 0) return true;
  return isGroupCompleted(groups[gi - 1], isCompleted);
}

export function getSubLessonState(
  groups: LessonGroup[],
  gi: number,
  subIndex: number,
  isCompleted: (p: Puzzle) => boolean,
): SubLessonState {
  const puzzle = groups[gi].puzzles[subIndex];
  if (isCompleted(puzzle)) return "completed";
  if (!isGroupUnlocked(groups, gi, isCompleted)) return "locked";
  if (subIndex === 0) return "available";
  const prev = groups[gi].puzzles[subIndex - 1];
  if (prev && isCompleted(prev)) return "available";
  return "locked";
}

/** First group with work remaining (-1 when empty or fully complete). */
export function firstIncompleteGroupIndex(
  groups: LessonGroup[],
  isCompleted: (p: Puzzle) => boolean,
): number {
  if (groups.length === 0) return -1;
  const all = groups.every((g) => isGroupCompleted(g, isCompleted));
  if (all) return -1;
  return groups.findIndex(
    (g, gi) =>
      !isGroupCompleted(g, isCompleted) &&
      (gi === 0 || isGroupCompleted(groups[gi - 1], isCompleted)),
  );
}

export type NodeKind = "groupDone" | "subLesson" | "groupLocked";

export interface RoadNode {
  kind: NodeKind;
  groupIndex: number;
  groupName: string;
  /** -1 for group nodes. */
  subIndex: number;
  /** null for group nodes. */
  puzzle: Puzzle | null;
}

/**
 * Collapse model: finished (and, when all-done, every) group → one `groupDone`
 * node; the first incomplete unlocked group → one `subLesson` node per puzzle;
 * upcoming groups → one `groupLocked` node each.
 */
export function buildRoadNodes(
  groups: LessonGroup[],
  isCompleted: (p: Puzzle) => boolean,
): RoadNode[] {
  const cur = firstIncompleteGroupIndex(groups, isCompleted);
  const nodes: RoadNode[] = [];
  groups.forEach((g, gi) => {
    const groupName = g.name || `Lesson ${gi + 1}`;
    if (gi === cur) {
      g.puzzles.forEach((puzzle, subIndex) =>
        nodes.push({ kind: "subLesson", groupIndex: gi, groupName, subIndex, puzzle }),
      );
    } else if (cur < 0 || gi < cur) {
      nodes.push({ kind: "groupDone", groupIndex: gi, groupName, subIndex: -1, puzzle: null });
    } else {
      nodes.push({ kind: "groupLocked", groupIndex: gi, groupName, subIndex: -1, puzzle: null });
    }
  });
  return nodes;
}

/** Frontier = first available sub-lesson, else the last node. */
export function frontierNodeIndex(
  nodes: RoadNode[],
  groups: LessonGroup[],
  isCompleted: (p: Puzzle) => boolean,
): number {
  const idx = nodes.findIndex(
    (n) =>
      n.kind === "subLesson" &&
      getSubLessonState(groups, n.groupIndex, n.subIndex, isCompleted) === "available",
  );
  return idx >= 0 ? idx : Math.max(0, nodes.length - 1);
}
