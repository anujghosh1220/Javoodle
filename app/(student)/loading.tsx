export default function StudentLoading() {
  return (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-cream-200/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-card border-2 border-cream-300/40 bg-cream-100/60" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-card border-2 border-cream-300/40 bg-cream-100/60" />
      </div>
    </main>
  );
}
