import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the analytics page's real layout (header, lifecycle strip, grid
// of trend/category charts).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-40 rounded-lg" />
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
            <Skeleton className="mb-4 h-3 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
