import Link from "next/link";
import { Users, Timer, Bug as BugIcon, AlertTriangle, ListChecks } from "lucide-react";
import { formatPlatformList } from "@/lib/platform";
import { SESSION_STATUS_META, sessionDurationLabel } from "@/lib/auth/session";
import type { SessionSummary } from "@/lib/db";

export function SessionCard({ session }: { session: SessionSummary }) {
  const statusMeta = SESSION_STATUS_META[session.status];
  const duration = sessionDurationLabel(session.startedAt, session.endedAt);

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4 hover:border-[color:var(--bf-border-strong)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: session.game.coverColor }} />
            {session.game.name}
          </div>
          <p className="mt-0.5 text-base font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">{session.name}</p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--bf-border)] px-2 py-0.5 text-[11px] font-medium"
          style={{ color: statusMeta.color }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusMeta.color }} />
          {statusMeta.label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Build</dt>
          <dd className="mt-0.5 font-mono font-semibold text-[color:var(--bf-ink-primary)]">{session.build.version}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Platforms</dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--bf-ink-primary)]">{formatPlatformList(session.game.platforms)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[color:var(--bf-ink-muted)] uppercase">
            <Users size={11} /> Testers
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--bf-ink-primary)]">{session.testerCount}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[color:var(--bf-ink-muted)] uppercase">
            <Timer size={11} /> Duration
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--bf-ink-primary)]">{duration}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[color:var(--bf-ink-muted)] uppercase">
            <BugIcon size={11} /> Bugs Found
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--bf-ink-primary)]">{session.bugsFound}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[color:var(--bf-ink-muted)] uppercase">
            <AlertTriangle size={11} /> Critical
          </dt>
          <dd className="mt-0.5 font-semibold" style={{ color: session.criticalCount > 0 ? "var(--bf-status-critical)" : undefined }}>
            {session.criticalCount}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="flex items-center gap-1 text-[color:var(--bf-ink-muted)] uppercase">
            <ListChecks size={11} /> Test Cases
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--bf-ink-primary)]">
            {session.testCasesExecuted} executed
            {session.coveragePercent !== null && (
              <span className="ml-1.5 font-normal text-[color:var(--bf-ink-muted)]">({session.coveragePercent}% coverage)</span>
            )}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
