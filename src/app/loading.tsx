import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the dashboard's real layout (src/app/page.tsx) section-for-
// section, so the page doesn't jump around when the real content swaps
// in — only the root segment, meaning any nested route without its own
// loading.tsx would otherwise inherit this; see route-spinner.tsx for
// why every other segment gets its own override instead.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-32" />
        <Skeleton className="mt-5 h-3 w-20" />
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-4 w-24" />
        </div>
        <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>

      <div className="mb-8">
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="mt-2 h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <Skeleton className="mb-3 h-3 w-32" />
        <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          <Skeleton className="h-6 w-full rounded-full" />
        </div>
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-20" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-1.5 h-3 w-16" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-4 h-4 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
