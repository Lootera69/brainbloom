import { Skeleton } from "@/components/ui/skeleton";

export function ShopLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 space-y-3">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      <div className="mb-6 flex justify-center gap-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default ShopLoading;
