import { BUG_STATUS_META } from "@/lib/status-labels";
import type { BugStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: BugStatus; className?: string }) {
  const meta = BUG_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--bf-border)] px-2 py-0.5 text-[12px] font-medium",
        className
      )}
      style={{ color: meta.color }}
    >
      <Icon size={12} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}
