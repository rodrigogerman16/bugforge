import { Loader2 } from "lucide-react";

// The generic loading.tsx fallback for routes that don't have a
// purpose-built skeleton. Segments with one (dashboard, bugs, bug detail,
// analytics, test cases, build readiness) override this via their own
// loading.tsx — Next nests loading.tsx boundaries, so without an override
// here a child route would otherwise inherit its ancestor's skeleton,
// which looks wrong when the shapes don't match (e.g. a bug-table
// skeleton behind the "new bug" form).
export function RouteSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 px-8 py-24 text-sm text-[color:var(--bf-ink-muted)]">
      <Loader2 size={16} className="animate-spin" />
      Loading...
    </div>
  );
}
