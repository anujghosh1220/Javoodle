export default function CodingLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[45fr_55fr]">
      <div className="h-[70vh] animate-pulse rounded-card border-2 border-cream-300/40 bg-cream-100/60" />
      <div className="flex h-[70vh] flex-col gap-4 rounded-card border-2 border-cream-300/40 bg-cream-100/60 p-5">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-cream-200/70" />
        <div className="flex-1 animate-pulse rounded-xl bg-cream-200/50" />
        <div className="h-24 animate-pulse rounded-xl bg-cream-200/50" />
      </div>
    </div>
  );
}
