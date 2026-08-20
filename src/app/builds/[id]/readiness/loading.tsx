import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the build readiness page's real layout (score card, gates
// list, blocking issues list).
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>

      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-1.5 h-7 w-40" />

      <div className="mt-6 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-6 text-center">
        <Skeleton className="mx-auto h-3 w-32" />
        <Skeleton className="mx-auto mt-3 h-11 w-24" />
        <Skeleton className="mx-auto mt-3 h-6 w-24 rounded-full" />
      </div>

      <div className="mt-6">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <div>
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
