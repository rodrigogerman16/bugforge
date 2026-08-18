import { CircleDot, Wrench, BadgeCheck, CheckCheck, type LucideIcon } from "lucide-react";
import type { BugLifecycleMetrics, LifecycleStageMetric } from "@/lib/data";

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function LifecycleTile({
  label,
  metric,
  icon: Icon,
  color,
}: {
  label: string;
  metric: LifecycleStageMetric;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${color}1f` }}>
          <Icon size={14} strokeWidth={2} style={{ color }} />
        </span>
        <p className="text-[12px] text-[color:var(--bf-ink-muted)]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[color:var(--bf-ink-primary)]">
        {metric.avgHours !== null ? formatDuration(metric.avgHours) : "—"}
      </p>
      <p className="mt-0.5 text-[11px] text-[color:var(--bf-ink-muted)]">
        {metric.sampleCount === 0
          ? "No bugs reached this stage yet"
          : `avg. across ${metric.sampleCount} bug${metric.sampleCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

// The four bug-lifecycle stage durations, reconstructed from each bug's own
// real STATUS_CHANGED history (see getBugLifecycleMetrics) — never a
// blanket createdAt-to-updatedAt guess.
export function LifecycleMetrics({ metrics }: { metrics: BugLifecycleMetrics }) {
  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        Bug lifecycle
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <LifecycleTile label="Time to Confirm" metric={metrics.timeToConfirm} icon={CircleDot} color="var(--bf-brand)" />
        <LifecycleTile label="Time to Fix" metric={metrics.timeToFix} icon={Wrench} color="var(--bf-status-warning)" />
        <LifecycleTile label="Time to Verify" metric={metrics.timeToVerify} icon={BadgeCheck} color="var(--bf-status-good)" />
        <LifecycleTile
          label="Total Resolution Time"
          metric={metrics.totalResolutionTime}
          icon={CheckCheck}
          color="var(--bf-status-low)"
        />
      </div>
    </div>
  );
}
