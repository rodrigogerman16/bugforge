import { ChevronRight } from "lucide-react";
import { BUG_STATUS_META, BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";

function WorkflowChip({ status }: { status: (typeof BUG_WORKFLOW_MAIN)[number] }) {
  const meta = BUG_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2.5 py-1 text-[12px] font-medium"
      style={{ color: meta.color }}
    >
      <Icon size={13} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

export function BugWorkflowLegend() {
  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        Workflow
      </p>
      <div className="flex w-fit items-center gap-1.5">
        {BUG_WORKFLOW_MAIN.map((status, i) => (
          <span key={status} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-[color:var(--bf-ink-muted)]" />}
            <WorkflowChip status={status} />
          </span>
        ))}
        <span className="mx-2 shrink-0 text-[11px] text-[color:var(--bf-ink-muted)]">or, at any point</span>
        {BUG_WORKFLOW_EXITS.map((status, i) => (
          <span key={status} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[11px] text-[color:var(--bf-ink-muted)]">/</span>}
            <WorkflowChip status={status} />
          </span>
        ))}
      </div>
    </div>
  );
}
