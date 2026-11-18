import { cn } from "@/lib/utils";

/** Shimmer skeleton block — subtle, respects reduced motion via CSS. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-cream-200/70",
        className
      )}
    />
  );
}

/** Skeleton for a stat card row. */
export function SkeletonStatCard() {
  return (
    <div className="flex items-center gap-3 rounded-card border-2 border-cream-300/40 bg-cream-100/60 p-4">
      <Skeleton className="h-10 w-10 rounded-2xl" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Skeleton for a content card. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-card border-2 border-cream-300/40 bg-cream-100/60 p-5">
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a table / list of rows. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border-2 border-cream-300/40 bg-cream-100/60 p-4"
        >
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
