import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-shimmer shimmer-bg rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card/60 backdrop-blur-sm p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card/60 backdrop-blur-sm p-6", className)}>
      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="mb-1.5 flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border bg-card p-4", className)}>
      <Skeleton className="size-10 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="size-8 rounded-lg shrink-0" />
    </div>
  );
}

function SkeletonCategoryCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border bg-card p-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

function SkeletonLessonGroup({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="size-4" />
      </div>
    </div>
  );
}

function SkeletonSubLesson({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl bg-muted/30 p-3", className)}>
      <Skeleton className="size-8 rounded-lg shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="size-3.5" />
    </div>
  );
}

function SkeletonLeaderboard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card/60 backdrop-blur-sm p-5", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-5" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <Skeleton className="size-6 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonActivity({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card/60 backdrop-blur-sm p-5", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-5" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonDailyChallenge({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 p-6 sm:p-8", className)}>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl bg-muted/80" />
        <Skeleton className="h-5 w-28 rounded-full bg-muted/80" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4 bg-muted/80" />
        <Skeleton className="h-4 w-full bg-muted/80" />
        <Skeleton className="h-4 w-2/3 bg-muted/80" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-5 w-24 bg-muted/80" />
          <Skeleton className="h-5 w-16 bg-muted/80" />
        </div>
        <Skeleton className="mt-5 h-12 w-40 rounded-xl bg-muted/80" />
      </div>
    </div>
  );
}

function SkeletonStreakBar({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-2xl border bg-card/60 backdrop-blur-sm p-4", className)}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-5" />
        </div>
      ))}
    </div>
  );
}

function SkeletonContinueLearning({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card/60 backdrop-blur-sm p-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="size-4" />
      </div>
    </div>
  );
}

function SkeletonPuzzleList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

function SkeletonCategoryGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCategoryCard key={i} />
      ))}
    </div>
  );
}

function SkeletonForm({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function SkeletonFilterBar({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-xl" />
      ))}
    </div>
  );
}

function SkeletonCurriculum({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-5 w-28" />
      <SkeletonLessonGroup />
      <div className="ml-5 space-y-1 border-l-2 border-muted pl-4">
        <SkeletonSubLesson />
        <SkeletonSubLesson />
        <SkeletonSubLesson />
      </div>
      <SkeletonLessonGroup />
      <SkeletonLessonGroup />
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonRow,
  SkeletonCategoryCard,
  SkeletonLessonGroup,
  SkeletonSubLesson,
  SkeletonLeaderboard,
  SkeletonActivity,
  SkeletonDailyChallenge,
  SkeletonStreakBar,
  SkeletonContinueLearning,
  SkeletonPuzzleList,
  SkeletonCategoryGrid,
  SkeletonForm,
  SkeletonFilterBar,
  SkeletonCurriculum,
};
