import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 w-64 rounded-2xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
