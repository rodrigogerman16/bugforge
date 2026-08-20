import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the bug detail page's real layout (header, badges, meta row,
// description, environment grid, evidence, comments, activity).
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-7 w-full max-w-lg" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 border-y border-[color:var(--bf-border)] py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </header>

      <section className="mb-6">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-5/6" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
      </section>

      <section className="mb-6">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-14" />
              <Skeleton className="mt-1.5 h-4 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <Skeleton className="mb-3 h-4 w-20" />
        <div className="flex gap-3">
          <Skeleton className="h-24 w-32 rounded-lg" />
          <Skeleton className="h-24 w-32 rounded-lg" />
        </div>
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <Skeleton className="mb-4 h-4 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-3 flex gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-1.5 h-3 w-full" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
