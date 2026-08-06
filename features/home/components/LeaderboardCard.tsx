"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, LogIn } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";
import { AvatarDisplay } from "@/components/avatars/AvatarDisplay";
import { SkeletonLeaderboard } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getWeeklyLeaderboard, type LeaderboardEntry } from "@/services/leaderboard-service";

const MAX_ROWS = 5;

interface Row {
  id: string | null;
  name: string;
  weeklyXp: number;
  level: number;
  avatarId: string | null;
  photoURL: string | null;
  premium: boolean;
  isUser: boolean;
  rank: number;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="size-4 text-amber-400" />;
  if (rank === 2) return <Medal className="size-4 text-gray-400" />;
  if (rank === 3) return <Medal className="size-4 text-amber-700" />;
  return <span className="w-4 text-center text-xs text-muted-foreground">{rank}</span>;
}

export function LeaderboardCard() {
  const userId = useUserStore((s) => s.userId);
  const isGuest = useUserStore((s) => s.isGuest);
  const displayName = useUserStore((s) => s.displayName);
  const weeklyXp = useUserStore((s) => s.weeklyXp);
  const level = useUserStore((s) => s.level);
  const avatarId = useUserStore((s) => s.avatarId);
  const photoURL = useUserStore((s) => s.photoURL);
  const tier = useUserStore((s) => s.tier);
  const subscriptionExpiry = useUserStore((s) => s.subscriptionExpiry);

  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const isPremium = tier === "premium" && (subscriptionExpiry === null || subscriptionExpiry > Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getWeeklyLeaderboard(isGuest || !userId ? null : userId);
    setLeaders(result.leaders);
    setMyRank(result.rank);
    setUnavailable(result.unavailable);
    setLoading(false);
  }, [userId, isGuest]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const rows = useMemo<{ rows: Row[]; userPinned: boolean }>(() => {
    const entries: Row[] = leaders.map((l) => ({
      id: l.uid,
      name: l.displayName,
      weeklyXp: l.weeklyXp,
      level: l.level,
      avatarId: l.avatarId,
      photoURL: l.photoURL,
      premium: l.tier === "premium",
      isUser: false,
      rank: 0,
    }));

    if (userId && !isGuest) {
      const self: Row = {
        id: userId,
        name: displayName.trim() || "You",
        weeklyXp,
        level,
        avatarId,
        photoURL,
        premium: isPremium,
        isUser: true,
        rank: 0,
      };
      const withoutSelf = entries.filter((e) => e.id !== userId);
      const merged = [...withoutSelf, self].sort((a, b) => b.weeklyXp - a.weeklyXp);
      merged.forEach((r, i) => { r.rank = i + 1; });

      const userIndex = merged.findIndex((r) => r.isUser);
      if (userIndex < MAX_ROWS) return { rows: merged.slice(0, MAX_ROWS), userPinned: false };
      return { rows: [...merged.slice(0, MAX_ROWS - 1), merged[userIndex]], userPinned: true };
    }

    entries.forEach((r, i) => { r.rank = i + 1; });
    return { rows: entries.slice(0, MAX_ROWS), userPinned: false };
  }, [leaders, userId, isGuest, displayName, weeklyXp, level, avatarId, photoURL, isPremium]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {loading ? (
        <SkeletonLeaderboard />
      ) : (
      <GlassCard intensity="light" className="p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Trophy className="size-5 text-warning" />
          <h3 className="font-heading text-lg font-bold">Leaderboard</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Top minds this week</p>

        {unavailable ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/30 px-4 py-8 text-center">
            <Trophy className="size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">The board is taking a breather — try again soon.</p>
          </div>
        ) : rows.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/30 px-4 py-8 text-center">
            <Trophy className="size-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No scores yet this week. Play a puzzle to take the top spot!</p>
            {isGuest && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <LogIn className="size-3" /> Sign in to join the board
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.rows.map((row, i) => (
              <motion.div
                key={row.id ?? `row-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5",
                  row.isUser && "bg-primary/10",
                )}
              >
                <RankIcon rank={row.rank} />

                <AvatarDisplay
                  avatarId={row.avatarId}
                  photoURL={row.photoURL}
                  name={row.name}
                  size={32}
                  premium={row.premium}
                />

                <span className={cn("flex-1 truncate text-sm font-medium", row.isUser && "font-semibold")}>
                  {row.name}
                  {row.isUser && !isGuest && rows.userPinned && myRank !== null && (
                    <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                      #{myRank}
                    </span>
                  )}
                  {row.isUser && isGuest && (
                    <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Guest
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-muted-foreground">
                  <span className="text-[10px] font-medium text-muted-foreground/50">Lv {row.level}</span>
                  {row.weeklyXp.toLocaleString()} XP
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
      )}
    </motion.section>
  );
}