import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the test cases list's real layout (header, table rows).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </header>

      <div className="hidden overflow-hidden rounded-lg border border-[color:var(--bf-border)] md:block">
        <div className="flex items-center gap-4 border-b border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-2.5">
          {["w-14", "flex-1", "w-24", "w-16", "w-16", "w-16", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[color:var(--bf-border)] px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-4 w-14 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>

      <ul className="space-y-2 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-1.5 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </li>
        ))}
      </ul>
    </div>
  );
}
