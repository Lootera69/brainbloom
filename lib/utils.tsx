import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function isCloseMatch(input: string, target: string, maxDist = 2): boolean {
  return levenshteinDistance(input.toLowerCase(), target.toLowerCase()) <= maxDist;
}

export function normalizeAnswer(input: string): string {
  return input.trim().toLowerCase();
}

export function checkAnswer(input: string, correctAnswer: string, acceptedAnswers?: string[]): { correct: boolean; close: boolean } {
  const normalized = normalizeAnswer(input);
  const main = normalizeAnswer(correctAnswer);
  if (normalized === main) return { correct: true, close: false };
  if (acceptedAnswers?.some((a) => normalizeAnswer(a) === normalized)) return { correct: true, close: false };
  const close = isCloseMatch(normalized, main) || (acceptedAnswers?.some((a) => isCloseMatch(normalized, a)) ?? false);
  return { correct: false, close };
}