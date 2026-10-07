"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { BookOpen, BookX, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRoad } from "@/components/ui/skeleton";
import { getPublishedByCategory } from "@/services/player-content";
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
  // TEMP DEV OVERRIDE: localStorage.setItem("brainbloom-drive-hour","6"|"12"|"18"|"23")
  // REVERT: remove the localStorage check to restore real clock time.
  const hour = useMemo(() => {
    if (typeof window !== "undefined") {
      const forced = localStorage.getItem("brainbloom-drive-hour");
      if (forced != null && forced !== "") return Number(forced);
    }
    return mounted ? new Date().getHours() : 12;
  }, [mounted]);

  // Scroll container measurements + scroll-linked refs. Scroll position never
  // sets React state — it feeds refs/rigs, so gliding never re-renders the
  // world (only the rare banner-crossing set below does).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [viewH, setViewH] = useState(0);
  const scrollYRef = useRef(0);
  const didAutoScroll = useRef(false);
  // Virtual smooth scroll: wheel deltas accumulate into `target`, a rAF loop
  // lerps scrollTop toward it (frame-rate normalised exponential easing).
  const smooth = useRef({ target: 0, last: 0, raf: 0, lastT: 0 });
  const scrollApi = useRef<{ scrollTo: (y: number, tau?: number) => void } | null>(null);
  const centersRef = useRef<Pt[]>([]);
  const [hiddenBanners, setHiddenBanners] = useState<ReadonlySet<number>>(() => new Set());

  // Full-bleed + fill metrics: the road escapes the centred page container to
  // span the whole main scroller (sidebar-aware), and fills every remaining
  // pixel of height so the world covers the screen instead of sitting in a box.
  const [box, setBox] = useState<{ h: number; ml: number; mr: number } | null>(null);
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const scroller = root.closest("main");
    if (!scroller) return;
    const sRect = scroller.getBoundingClientRect();
    const rRect = root.getBoundingClientRect();
    const padB = parseFloat(getComputedStyle(scroller).paddingBottom) || 0;
    const ml = Math.max(0, rRect.left - sRect.left);
    const mr = Math.max(0, sRect.left + scroller.clientWidth - rRect.right);
    // Desktop (nav hidden via md:) paints into main's vestigial 4rem nav pad
    // — the browse view's negative bottom margin absorbs it so no scroll
    // appears. Mobile reserves the pad so the road stops above BottomNav.
    const navHidden =
      typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    const reserve = navHidden ? 0 : padB;
    const road = scrollRef.current;
    const topInContent = road
      ? road.getBoundingClientRect().top - sRect.top + scroller.scrollTop
      : rRect.top - sRect.top + scroller.scrollTop + 34; // label row + gap (skeleton)
    const h = Math.max(320, scroller.clientHeight - reserve - topInContent);
    setBox((prev) =>
      prev && prev.h === h && prev.ml === ml && prev.mr === mr ? prev : { h, ml, mr },
    );
  }, []);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure, loading, hasLessons]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setViewH(el.clientHeight);
      measure();
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, [loading, hasLessons, measure]);

  useEffect(() => {
    let cancelled = false;
    didAutoScroll.current = false;
    (async () => {
      setLoading(true);
      // One cached read per open — the category service serves memory /
      // persisted data with zero server reads inside its TTL, so reopening
      // a category never refetches the bank.
      const all = await getPublishedByCategory(category);
      if (cancelled) return;
      setHasLessons(all.some((p) => p.lessonOrder != null));
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
  useEffect(() => { centersRef.current = centers; }, [centers]);
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

  // Group banners hide as their node slides under the sticky section pill —
  // a rare threshold set, so ordinary scrolling never triggers a re-render.
  const recomputeHiddenBanners = useCallback((y: number) => {
    const cs = centersRef.current;
    const next = new Set<number>();
    for (let i = 0; i < cs.length; i++) {
      if (cs[i].y - y < 96) next.add(i);
    }
    setHiddenBanners((prev) => {
      if (prev.size === next.size) {
        let same = true;
        next.forEach((i) => {
          if (!prev.has(i)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
  }, []);

  // ── Ultra-smooth virtual scroll ──────────────────────────────────────────
  // Wheel input accumulates into a target the rAF loop eases toward (buttery
  // on desktop mouse + trackpad); touch keeps native momentum; at the road's
  // edges the wheel is handed to the page scroller so nothing dead-ends.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const s = smooth.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    s.target = el.scrollTop;
    s.last = el.scrollTop;
    s.raf = 0;
    s.lastT = 0;
    let tau = 90;

    const maxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);

    const tick = (now: number) => {
      const raw = now - s.lastT;
      const dt = raw > 0 && raw < 64 ? raw : 16;
      s.lastT = now;
      const cur = el.scrollTop;
      if (Math.abs(cur - s.last) > 1) {
        // External scroll (keyboard, find-in-page, native touch) → adopt it.
        s.target = cur;
        s.last = cur;
      }
      const diff = s.target - cur;
      if (Math.abs(diff) < 0.35) {
        el.scrollTop = s.target;
        s.last = s.target;
        s.raf = 0;
        return;
      }
      el.scrollTop = cur + diff * (1 - Math.exp(-dt / tau));
      s.last = el.scrollTop;
      s.raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (s.raf) return;
      s.lastT = performance.now();
      s.raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || reduced) return; // pinch-zoom / reduced motion → native
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16; // lines (Firefox)
      else if (e.deltaMode === 2) dy *= el.clientHeight; // pages
      if (!dy) return;
      const max = maxScroll();
      const atLimit =
        (dy > 0 && s.target >= max - 0.5) || (dy < 0 && s.target <= 0.5);
      e.preventDefault();
      if (atLimit) {
        // Road is at its edge — keep the page moving under the cursor.
        if (Math.abs(s.target - el.scrollTop) < 2) {
          const main = el.closest("main");
          if (main) main.scrollTop += dy;
        }
        return;
      }
      s.target = Math.max(0, Math.min(max, s.target + dy));
      tau = 90;
      kick();
    };

    const onScroll = () => {
      const y = el.scrollTop;
      scrollYRef.current = y;
      if (!s.raf) {
        s.target = y;
        s.last = y;
      }
      recomputeHiddenBanners(y);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll);
    const initRaf = requestAnimationFrame(() => recomputeHiddenBanners(el.scrollTop));

    scrollApi.current = {
      scrollTo(y, smoothTau = 90) {
        const target = Math.max(0, Math.min(maxScroll(), y));
        if (reduced) {
          el.scrollTop = target;
          s.target = target;
          s.last = target;
          scrollYRef.current = target;
          recomputeHiddenBanners(target);
          return;
        }
        tau = smoothTau;
        s.target = target;
        recomputeHiddenBanners(target);
        kick();
      },
    };

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(initRaf);
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      scrollApi.current = null;
    };
  }, [showRoad, recomputeHiddenBanners]);

  // Glide the frontier into view once the world is measured — never a hard
  // jump, so arriving on the road always feels like pulling up to your car.
  useEffect(() => {
    if (didAutoScroll.current) return;
    const el = scrollRef.current;
    if (!el || !centers.length || !viewH) return;
    const target = Math.max(0, (centers[frontierIdx]?.y ?? 0) - viewH * 0.55);
    if (scrollApi.current) scrollApi.current.scrollTo(target, 220);
    else el.scrollTop = target;
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
      const base = { center, isFrontier: i === frontierIdx, labelRight, entranceDelay };

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

  // Full-bleed box: spans the main scroller edge-to-edge and fills the height
  // down to the nav pad — falls back to a viewport calc before first measure.
  const bleedStyle: React.CSSProperties = box
    ? { height: box.h, marginLeft: -box.ml, marginRight: -box.mr }
    : { height: "calc(100dvh - 190px)" };

  if (loading)
    return (
      <div ref={rootRef}>
        <SkeletonRoad style={bleedStyle} />
      </div>
    );
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
    <div className="space-y-4" ref={rootRef}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <BookOpen className="size-3.5" />
        {hasLessons ? "Learning Path" : "Puzzles"}
      </div>

      {showRoad && (
        <div
          ref={scrollRef}
          className="scrollbar-none relative overflow-y-auto overflow-x-hidden overscroll-contain"
          style={bleedStyle}
        >
          <Backdrop scrollRef={scrollYRef} viewH={viewH} isDark={isDark} hour={hour} />

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
              <CheckpointNode key={i} v={v} bannerHidden={hiddenBanners.has(i)} />
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

            {/* Bouncing START flag just below the frontier (mirrors Flutter's Go
                prompt — placing it above collided with the section pill at the
                top of the world) */}
            {frontierCenter && !allCompleted && nodes[frontierIdx]?.kind === "subLesson" && (
              <motion.div
                className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary shadow-lg"
                style={{ left: frontierCenter.x, top: frontierCenter.y + NODE_RADIUS + 14 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="absolute left-1/2 bottom-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[7px] border-x-transparent border-b-white" />
                Start
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








