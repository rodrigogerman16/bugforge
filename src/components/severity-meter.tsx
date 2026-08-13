import Link from "next/link";
import { SEVERITY_META, SEVERITY_ORDER, type SeverityCounts } from "@/lib/severity";
import type { BugSeverity } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function SeverityMeter({
  counts,
  size = "sm",
  filterHref,
}: {
  counts: SeverityCounts;
  size?: "sm" | "lg";
  filterHref?: (severity: BugSeverity) => string;
}) {
  const total = SEVERITY_ORDER.reduce((sum, sev) => sum + counts[sev], 0);

  return (
    <div>
      <div
        className={cn(
          "flex w-full gap-0.5 overflow-hidden rounded-full bg-[color:var(--bf-surface-raised)]",
          size === "lg" ? "h-3" : "h-1.5"
        )}
      >
        {SEVERITY_ORDER.map((sev) => {
          const count = counts[sev];
          if (total === 0 || count === 0) return null;
          const pct = (count / total) * 100;
          const style = { width: `${pct}%`, backgroundColor: SEVERITY_META[sev].color };
          const label = `${SEVERITY_META[sev].label}: ${count}`;

          if (filterHref) {
            return (
              <Link
                key={sev}
                href={filterHref(sev)}
                title={label}
                aria-label={`Filter bugs by ${label}`}
                style={style}
                className="h-full transition-opacity first:rounded-l-full last:rounded-r-full hover:opacity-75"
              />
            );
          }
          return (
            <div
              key={sev}
              title={label}
              style={style}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {SEVERITY_ORDER.map((sev) => {
          const content = (
            <>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SEVERITY_META[sev].color }}
                />
                <span className="truncate text-[11px] text-[color:var(--bf-ink-muted)]">
                  {SEVERITY_META[sev].label}
                </span>
              </div>
              <span
                className={cn(
                  "font-semibold tabular-nums text-[color:var(--bf-ink-primary)]",
                  size === "lg" ? "text-lg" : "text-sm"
                )}
              >
                {counts[sev]}
              </span>
            </>
          );

          if (filterHref) {
            return (
              <Link
                key={sev}
                href={filterHref(sev)}
                className="-m-1 flex flex-col gap-1 rounded-md p-1 hover:bg-[color:var(--bf-surface-raised)]"
              >
                {content}
              </Link>
            );
          }
          return (
            <div key={sev} className="flex flex-col gap-1">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
