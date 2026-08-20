import { initials } from "@/lib/tester";
import type { DeveloperWorkload } from "@/lib/db";

export function DeveloperCard({ developer }: { developer: DeveloperWorkload }) {
  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--bf-status-warning)]/15 text-[13px] font-semibold text-[color:var(--bf-status-warning)]">
          {initials(developer.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[color:var(--bf-ink-primary)]">{developer.name}</p>
          <p className="truncate text-[12px] text-[color:var(--bf-ink-muted)]">{developer.email}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-y-3 text-[12px]">
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Open</dt>
          <dd className="mt-0.5 text-base font-semibold text-[color:var(--bf-ink-primary)]">{developer.assignedOpenCount}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">In Progress</dt>
          <dd className="mt-0.5 text-base font-semibold" style={{ color: "var(--bf-status-warning)" }}>
            {developer.inProgressCount}
          </dd>
        </div>
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Awaiting QA</dt>
          <dd className="mt-0.5 text-base font-semibold" style={{ color: "var(--bf-status-good)" }}>
            {developer.fixedAwaitingQaCount}
          </dd>
        </div>
      </dl>
    </div>
  );
}
