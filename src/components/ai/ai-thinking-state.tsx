import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// The dedicated loading state for BugForge AI's own results — distinct
// from a generic spinner because an AI action isn't a page navigation,
// it's a request that's actually "thinking," and it fills a results area
// with a specific shape (title, reasoning, confidence) once done. Showing
// that shape mid-load, pulsing, reads as "this is coming together" rather
// than a data-free stall.
export function AiThinkingState({ actionLabel }: { actionLabel: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] font-medium text-[color:var(--bf-brand)]">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--bf-brand-soft)]">
          <Sparkles size={13} className="animate-pulse" />
        </span>
        {actionLabel}…
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-4/5" />
        </div>
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-3/5" />
        </div>
      </div>
    </div>
  );
}
