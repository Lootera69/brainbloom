"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { BookOpen, BookX, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCurriculum } from "@/components/ui/skeleton";
import { getPublishedByCategory, categoryHasLessons } from "@/services/puzzle-service";
import { useUserStore } from "@/store/user-store";
import { hasPremiumAccess } from "@/services/entitlement-service";
import { type Puzzle } from "@/types/puzzle";

import {
  NODE_RADIUS,
  ROAD_WIDTH,
  GOLD,
  ROAD_LIGHT,
  ROAD_DARK,
  SECTION_GRADIENT,
} from "./constants";
import {
  type LessonProgress,
  makeIsCompleted,
  buildLessonGroups,
  extrasOf,
  getSubLessonState,
  buildRoadNodes,
  frontierNodeIndex,
} from "./curriculum";
import {
  nodeCenter,
  worldHeight,
  roadPaths,
  sampleRoad,
  roadAngleAtY,
  type Pt,
} from "./geometry";
import { Backdrop } from "./Backdrop";
import { RoadDecorations } from "./RoadDecorations";
import { CheckpointNode, type NodeVisual } from "./CheckpointNode";
import { AvatarCar } from "./AvatarCar";

export type { LessonProgress } from "./curriculum";

interface Props {
  category: string;
  onStartPuzzle: (puzzle: Puzzle, progress?: LessonProgress) => void;
}

// PLACEHOLDER_BODY

export function DriveWorld({ category, onStartPuzzle }: Props) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLessons, setHasLessons] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const completedPuzzleIds = useUserStore((s) => s.completedPuzzleIds);
  const experiencedWonderIds = useUserStore((s) => s.experiencedWonderIds);
  const avatarId = useUserStore((s) => s.avatarId);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);
  const premium = hasPremiumAccess(tier, subscriptionExpiry);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const hour = useMemo(() => (mounted ? new Date().getHours() : 12), [mounted]);

  // Scroll container measurements + parallax scroll position.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [viewH, setViewH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const rafPending = useRef(false);
  const didAutoScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setViewH(el.clientHeight);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, [loading, hasLessons]);

  const onScroll = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      setScrollY(scrollRef.current?.scrollTop ?? 0);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    didAutoScroll.current = false;
    (async () => {
      setLoading(true);
      const [all, h] = await Promise.all([
        getPublishedByCategory(category),
        categoryHasLessons(category),
      ]);
      if (cancelled) return;
      setHasLessons(h);
      setPuzzles(all.filter((p) => p.type !== "cipher"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const isCompleted = useMemo(
    () => makeIsCompleted(completedPuzzleIds, experiencedWonderIds),
    [completedPuzzleIds, experiencedWonderIds],
  );
  const groups = useMemo(() => buildLessonGroups(puzzles), [puzzles]);
  const extras = useMemo(() => extrasOf(puzzles), [puzzles]);
  const showRoad = hasLessons && groups.length > 0;

  const nodes = useMemo(
    () => (showRoad ? buildRoadNodes(groups, isCompleted) : []),
    [showRoad, groups, isCompleted],
  );
  const frontierIdx = useMemo(
    () => (nodes.length ? frontierNodeIndex(nodes, groups, isCompleted) : 0),
    [nodes, groups, isCompleted],
  );
  const centers = useMemo<Pt[]>(
    () => (width > 0 ? nodes.map((_, i) => nodeCenter(i, width)) : []),
    [nodes, width],
  );
  const samples = useMemo(() => sampleRoad(centers), [centers]);
  const wh = useMemo(() => worldHeight(nodes.length), [nodes.length]);
  const paths = useMemo(
    () => roadPaths(centers, frontierIdx),
    [centers, frontierIdx],
  );
  const construction = useMemo(() => {
    const set = new Set<number>();
    if (frontierIdx < nodes.length - 1) set.add(frontierIdx);
    return set;
  }, [frontierIdx, nodes.length]);

  const palette = isDark ? ROAD_DARK : ROAD_LIGHT;
  const allCompleted =
    groups.length > 0 && groups.every((g) => g.puzzles.every(isCompleted));

  // Centre the frontier once the world is measured (native scroll, no camera).
  useEffect(() => {
    if (didAutoScroll.current) return;
    const el = scrollRef.current;
    if (!el || !centers.length || !viewH) return;
    const target = centers[frontierIdx]?.y ?? 0;
    el.scrollTop = Math.max(0, target - viewH * 0.55);
    setScrollY(el.scrollTop);
    didAutoScroll.current = true;
  }, [centers, frontierIdx, viewH]);

  const progressFor = useCallback(
    (gi: number, puzzle: Puzzle): LessonProgress => {
      const g = groups[gi];
      return {
        currentOrder: puzzle.lessonOrder ?? 0,
        totalInGroup: g.puzzles.length,
        completedInGroup: g.puzzles.filter(isCompleted).length,
        groupName: g.name || `Group ${gi + 1}`,
        groupNumber: gi + 1,
      };
    },
    [groups, isCompleted],
  );

  const visuals = useMemo<NodeVisual[]>(() => {
    if (centers.length !== nodes.length) return [];
    return nodes.map((n, i) => {
      const gi = n.groupIndex;
      const center = centers[i];
      const bannerText = groups[gi]?.name
        ? `${gi + 1}. ${groups[gi].name}`
        : `Lesson ${gi + 1}`;
      const labelRight = center.x <= width / 2;
      const entranceDelay = Math.min(i, 10) * 0.03;
      const base = { center, isFrontier: i === frontierIdx, labelRight, entranceDelay, bannerHidden: false };

      if (n.kind === "groupDone") {
        return {
          ...base,
          face: GOLD,
          glossy: 0.5,
          icon: "done" as const,
          banner: { text: bannerText, locked: false },
          disabled: false,
          onActivate: () => {
            const first = groups[gi]?.puzzles[0];
            if (first) onStartPuzzle(first, progressFor(gi, first));
          },
        };
      }
      if (n.kind === "groupLocked") {
        return {
          ...base,
          isFrontier: false,
          face: palette.nodeLocked,
          glossy: 0.2,
          icon: "locked" as const,
          banner: { text: bannerText, locked: true },
          disabled: true,
          onActivate: () => {},
        };
      }
      // subLesson
      const state = getSubLessonState(groups, gi, n.subIndex, isCompleted);
      const puzzle = n.puzzle!;
      const num = puzzle.lessonOrder ?? n.subIndex + 1;
      return {
        ...base,
        face:
          state === "completed"
            ? "var(--success)"
            : state === "available"
              ? "var(--primary)"
              : palette.nodeLocked,
        glossy: state === "locked" ? 0.2 : 0.42,
        icon:
          state === "completed"
            ? ("done" as const)
            : state === "locked"
              ? ("locked" as const)
              : { num },
        banner: n.subIndex === 0 ? { text: bannerText, locked: false } : undefined,
        subLabel: {
          text: state === "locked" ? "Locked" : `${gi + 1}.${num} ${puzzle.title}`,
          dim: state === "locked",
        },
        disabled: state === "locked",
        onActivate: () => {
          if (state === "locked") return;
          onStartPuzzle(puzzle, progressFor(gi, puzzle));
        },
      };
    });
  }, [nodes, centers, groups, isCompleted, frontierIdx, width, palette, onStartPuzzle, progressFor]);

  if (loading) return <SkeletonCurriculum />;
  if (puzzles.length === 0) {
    return (
      <EmptyState
        icon={<BookX className="size-5" />}
        title="No puzzles available in this category yet."
      />
    );
  }

  const frontierGroup = nodes[frontierIdx]?.groupIndex ?? 0;
  const unit = frontierGroup + 1;
  const section = Math.floor(frontierGroup / 8) + 1;
  const unitName = groups[frontierGroup]?.name || `Lesson ${unit}`;
  const frontierCenter = centers[frontierIdx];
  const carAngle = frontierCenter
    ? (roadAngleAtY(samples, frontierCenter.y) * 180) / Math.PI
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <BookOpen className="size-3.5" />
        {hasLessons ? "Learning Path" : "Puzzles"}
      </div>

      {showRoad && (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="relative overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl border border-border/60"
          style={{ height: "min(720px, calc(100dvh - 210px))" }}
        >
          <Backdrop scrollY={scrollY} viewH={viewH} isDark={isDark} hour={hour} />

          <div className="relative z-10" style={{ width, height: wh }}>
            {/* SECTION · UNIT banner */}
            <div
              className="sticky top-3 z-30 mx-auto w-fit rounded-full px-4 py-1.5 text-center shadow-lg"
              style={{
                background: `linear-gradient(90deg, ${SECTION_GRADIENT[0]}, ${SECTION_GRADIENT[1]})`,
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/90">
                Section {section} · Unit {unit}
              </div>
              <div className="max-w-[220px] truncate text-[13px] font-extrabold text-white">
                {unitName}
              </div>
            </div>

            {/* Road surface */}
            {width > 0 && (
              <svg
                className="pointer-events-none absolute inset-0"
                width={width}
                height={wh}
                viewBox={`0 0 ${width} ${wh}`}
                aria-hidden
              >
                <path
                  d={paths.full}
                  fill="none"
                  stroke={palette.asphaltEdge}
                  strokeWidth={ROAD_WIDTH + 10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={paths.full}
                  fill="none"
                  stroke={palette.asphaltSurface}
                  strokeWidth={ROAD_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {paths.gold && (
                  <path
                    d={paths.gold}
                    fill="none"
                    stroke={GOLD}
                    strokeWidth={ROAD_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                  />
                )}
                <path
                  d={paths.full}
                  fill="none"
                  stroke={palette.centerDash}
                  strokeWidth={4}
                  strokeDasharray="14 20"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Roadside scenery + roadworks near the frontier */}
            {width > 0 && (
              <RoadDecorations
                centers={centers}
                samples={samples}
                isDark={isDark}
                construction={construction}
              />
            )}

            {/* Checkpoints */}
            {visuals.map((v, i) => (
              <CheckpointNode
                key={i}
                v={{ ...v, bannerHidden: v.center.y - scrollY < 96 }}
              />
            ))}

            {/* Player car at the frontier */}
            {frontierCenter && (
              <motion.div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                initial={false}
                animate={{ left: frontierCenter.x, top: frontierCenter.y }}
                transition={{ type: "spring", stiffness: 90, damping: 20 }}
              >
                <motion.div
                  animate={{ rotate: carAngle }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                >
                  <AvatarCar avatarId={avatarId} premium={premium} />
                </motion.div>
              </motion.div>
            )}

            {/* Bouncing START flag over the frontier */}
            {frontierCenter && !allCompleted && nodes[frontierIdx]?.kind === "subLesson" && (
              <motion.div
                className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary shadow-lg"
                style={{ left: frontierCenter.x, top: frontierCenter.y - NODE_RADIUS - 60 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                Start
                <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-white" />
              </motion.div>
            )}
          </div>
        </div>
      )}

      {allCompleted && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-1 size-6 text-success" />
          <p className="text-sm font-semibold text-success">All lessons completed!</p>
          <p className="text-xs text-muted-foreground">
            Great work — you mastered this category.
          </p>
        </div>
      )}

      {extras.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Zap className="size-3" />
            {showAll
              ? "Hide extra puzzles"
              : `${extras.length} more puzzle${extras.length !== 1 ? "s" : ""}`}
          </button>

          {showAll && (
            <div className="mt-3 space-y-2">
              {extras.map((puzzle) => {
                const done = isCompleted(puzzle);
                return (
                  <motion.button
                    key={puzzle.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onStartPuzzle(puzzle)}
                    className="w-full text-left"
                  >
                    <GlassCard
                      hover
                      intensity="light"
                      className={`flex items-center gap-3 p-3 sm:p-4 ${done ? "ring-1 ring-success/20" : ""}`}
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${done ? "bg-success/10" : "bg-muted"}`}
                      >
                        {done ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <Zap className="size-4 text-muted-foreground" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{puzzle.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {puzzle.difficulty} · {puzzle.xpReward} XP
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </GlassCard>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}








