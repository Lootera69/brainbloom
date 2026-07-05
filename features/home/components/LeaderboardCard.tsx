"use client";

import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useUserStore } from "@/store/user-store";

const mockLeaders = [
  { name: "Sara K.", xp: 2840, avatar: "S", color: "from-amber-400 to-orange-500" },
  { name: "Alex M.", xp: 2510, avatar: "A", color: "from-gray-300 to-gray-400" },
  { name: "Jordan P.", xp: 2190, avatar: "J", color: "from-amber-700 to-amber-800" },
  { name: "You", xp: 0, avatar: "", color: "from-primary to-[#8b5cf6]" },
  { name: "Riley C.", xp: 1780, avatar: "R", color: "from-blue-400 to-blue-500" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 0) return <Crown className="size-4 text-amber-400" />;
  if (rank === 1) return <Medal className="size-4 text-gray-400" />;
  if (rank === 2) return <Medal className="size-4 text-amber-700" />;
  return <span className="w-4 text-center text-xs text-muted-foreground">{rank + 1}</span>;
}

export function LeaderboardCard() {
  const userXp = useUserStore((s) => s.xp);
  const userDisplay = useUserStore((s) => s.displayName);

  const leaders = mockLeaders.map((l) =>
    l.name === "You" ? { ...l, xp: userXp, avatar: userDisplay[0]?.toUpperCase() ?? "G" } : l,
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <GlassCard intensity="light" className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-warning" />
          <h3 className="font-heading text-lg font-bold">Leaderboard</h3>
        </div>

        <div className="space-y-2">
          {leaders.map((leader, i) => (
            <div
              key={leader.name}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                leader.name === "You" ? "bg-primary/10" : ""
              }`}
            >
              <RankIcon rank={i} />

              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${leader.color}`}
              >
                {leader.avatar}
              </span>

              <span className="flex-1 text-sm font-medium">{leader.name}</span>

              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {leader.xp.toLocaleString()} XP
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.section>
  );
}
