import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-3.5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-card border-2 border-cream-300/40 bg-cream-100/60 p-4">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
        <SkeletonRows rows={4} />
      </div>
    </main>
  );
}
