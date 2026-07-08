import { type Puzzle } from "@/types/puzzle";
import { getPuzzles } from "@/services/puzzle-service";

export interface AnalyticsData {
  totalPuzzles: number;
  publishedPuzzles: number;
  totalCompletions: number;
  totalXpAvailable: number;
  categories: string[];
  byType: Record<string, { count: number; completions: number }>;
  byCategory: Record<string, { count: number; completions: number; published: number }>;
  byStatus: Record<string, number>;
  topPuzzles: Puzzle[];
  recentPuzzles: Puzzle[];
}

export async function getAnalytics(timeRange?: "7d" | "30d" | "all"): Promise<AnalyticsData> {
  const allPuzzles = await getPuzzles();
  const cutoff = timeRange && timeRange !== "all"
    ? Date.now() - (timeRange === "7d" ? 7 : 30) * 86400000
    : 0;
  const puzzles = cutoff > 0 ? allPuzzles.filter((p) => p.createdAt >= cutoff) : allPuzzles;

  const totalPuzzles = puzzles.length;
  const publishedPuzzles = puzzles.filter((p) => p.published).length;
  const totalCompletions = puzzles.reduce((sum, p) => sum + (p.completedBy || 0), 0);
  const totalXpAvailable = puzzles.reduce((sum, p) => sum + (p.xpReward || 0), 0);

  const categorySet = new Set<string>();
  puzzles.forEach((p) => {
    if (p.category) categorySet.add(p.category);
  });
  const categories = Array.from(categorySet).sort();

  const byType: Record<string, { count: number; completions: number }> = {};
  const byCategory: Record<string, { count: number; completions: number; published: number }> = {};
  const byStatus: Record<string, number> = {};

  for (const p of puzzles) {
    if (!byType[p.type]) byType[p.type] = { count: 0, completions: 0 };
    byType[p.type].count++;
    byType[p.type].completions += p.completedBy || 0;

    if (!byCategory[p.category]) byCategory[p.category] = { count: 0, completions: 0, published: 0 };
    byCategory[p.category].count++;
    byCategory[p.category].completions += p.completedBy || 0;
    if (p.published) byCategory[p.category].published++;

    if (!byStatus[p.reviewStatus]) byStatus[p.reviewStatus] = 0;
    byStatus[p.reviewStatus]++;
  }

  const topPuzzles = [...puzzles]
    .filter((p) => (p.completedBy || 0) > 0)
    .sort((a, b) => (b.completedBy || 0) - (a.completedBy || 0))
    .slice(0, 10);

  const recentPuzzles = [...puzzles]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  return {
    totalPuzzles,
    publishedPuzzles,
    totalCompletions,
    totalXpAvailable,
    categories,
    byType,
    byCategory,
    byStatus,
    topPuzzles,
    recentPuzzles,
  };
}
