export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-md bg-muted" />
      <div className="h-4 w-80 rounded bg-muted/70" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
