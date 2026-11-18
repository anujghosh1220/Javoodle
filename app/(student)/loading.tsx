import { Skeleton, SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";

export default function StudentLoading() {
  return (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3.5 w-80 max-w-full" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-card border-2 border-cream-300/40 bg-cream-100/60 p-4">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        <SkeletonRows rows={3} />
      </div>
    </main>
  );
}
