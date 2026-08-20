import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the bug table's real layout (header, toolbar, table rows).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </header>

      <Skeleton className="mb-6 h-14 w-full rounded-lg" />

      <div className="mb-4 flex gap-2">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
        <div className="flex items-center gap-4 border-b border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-2.5">
          {["w-10", "w-16", "flex-1", "w-20", "w-20", "w-20", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[color:var(--bf-border)] px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-14 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
