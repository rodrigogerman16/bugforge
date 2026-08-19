import { PRIORITY_META } from "@/lib/priority";
import type { BugPriority } from "@/generated/prisma/enums";

// Deliberately square-cornered and code-first (P0/P1/…), unlike the rounded
// dot-and-label severity badge — the two axes should never be visually
// confusable at a glance, even before reading either label.
export function PriorityBadge({ priority }: { priority: BugPriority }) {
  const meta = PRIORITY_META[priority];

  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[12px]"
      style={{ borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)` }}
    >
      <span className="font-bold" style={{ color: meta.color }}>
        {meta.code}
      </span>
      <span className="text-[color:var(--bf-ink-muted)]">{meta.label}</span>
    </span>
  );
}
