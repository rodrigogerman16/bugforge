import { SEVERITY_META } from "@/lib/severity";
import type { BugSeverity } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

// Mirrors StatusBadge's icon+label+color pattern — severity is never
// communicated by color alone (see SEVERITY_META).
export function SeverityBadge({ severity, className }: { severity: BugSeverity; className?: string }) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;

  return (
    <span
      className={cn("inline-flex w-fit items-center gap-1 whitespace-nowrap text-[12px] font-medium", className)}
      style={{ color: meta.color }}
    >
      <Icon size={12} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}
