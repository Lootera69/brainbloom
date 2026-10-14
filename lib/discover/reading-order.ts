import type { DiscoverProgress } from "@/store/discover-store";
import type { DiscoverLesson } from "@/types/discover";

export function getDiscoverReadingStatus(lesson: DiscoverLesson, progress?: DiscoverProgress) {
  if (!progress || progress.lessonUpdatedAt !== lesson.updatedAt) return "new";
  if (progress.completed) return "completed";
  return progress.stepIndex > 0 ? "in-progress" : "new";
}

export function sortDiscoverLessonsForReader(
  lessons: readonly DiscoverLesson[],
  progress?: Readonly<Record<string, DiscoverProgress>>,
): DiscoverLesson[] {
  const difficultyOrder = { beginner: 0, intermediate: 1 };

  return [...lessons].sort((a, b) => {
    const aCompleted = getDiscoverReadingStatus(a, progress?.[a.id]) === "completed";
    const bCompleted = getDiscoverReadingStatus(b, progress?.[b.id]) === "completed";
    return Number(aCompleted) - Number(bCompleted) || difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });
}
