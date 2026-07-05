export const dailyChallenge = {
  title: "Today's Puzzle",
  description: "A fresh logic challenge awaits. Solve it to earn bonus XP and keep your streak alive.",
  xp: 50,
  category: "logic",
};

export const categories = [
  {
    id: 1,
    title: "Logic",
    icon: "brain",
    progress: 32,
    color: "#6366f1",
    gradient: "from-[#6366f1] to-[#8b5cf6]",
    lightBg: "bg-indigo-50 dark:bg-indigo-950/30",
    description: "Reason your way through",
  },
  {
    id: 2,
    title: "Riddles",
    icon: "lightbulb",
    progress: 54,
    color: "#06b6d4",
    gradient: "from-[#06b6d4] to-[#22d3ee]",
    lightBg: "bg-cyan-50 dark:bg-cyan-950/30",
    description: "Think outside the box",
  },
  {
    id: 3,
    title: "Science",
    icon: "atom",
    progress: 12,
    color: "#f59e0b",
    gradient: "from-[#f59e0b] to-[#f97316]",
    lightBg: "bg-amber-50 dark:bg-amber-950/30",
    description: "Discover how things work",
  },
  {
    id: 4,
    title: "Sudoku",
    icon: "grid",
    progress: 70,
    color: "#22c55e",
    gradient: "from-[#22c55e] to-[#10b981]",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
    description: "Numbers meet logic",
  },
] as const;