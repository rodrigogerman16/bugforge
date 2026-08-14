import Link from "next/link";
import { TESTER_ROLE_META, initials } from "@/lib/tester";
import type { TesterProfileSummary } from "@/lib/data";

export function TesterCard({ tester }: { tester: TesterProfileSummary }) {
  const roleMeta = TESTER_ROLE_META[tester.role];

  return (
    <Link
      href={`/testers/${tester.id}`}
      className="block rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4 hover:border-[color:var(--bf-border-strong)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--bf-brand-soft)] text-[13px] font-semibold text-[color:var(--bf-brand)]">
          {initials(tester.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[color:var(--bf-ink-primary)]">{tester.name}</p>
          <p className="text-[12px]" style={{ color: roleMeta.color }}>
            {roleMeta.label}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-3 text-[12px]">
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Bugs Reported</dt>
          <dd className="mt-0.5 text-base font-semibold text-[color:var(--bf-ink-primary)]">{tester.bugsReported}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Test Cases Executed</dt>
          <dd className="mt-0.5 text-base font-semibold text-[color:var(--bf-ink-primary)]">{tester.testCasesExecuted}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Confirmed</dt>
          <dd className="mt-0.5 text-base font-semibold text-[color:var(--bf-status-good)]">{tester.bugsConfirmed}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--bf-ink-muted)] uppercase">Rejected</dt>
          <dd className="mt-0.5 text-base font-semibold text-[color:var(--bf-ink-secondary)]">{tester.bugsRejected}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-[color:var(--bf-border)] pt-3 text-[12px] text-[color:var(--bf-ink-muted)]">
        {tester.reproductionQuality !== null
          ? `${tester.reproductionQuality}% of reported bugs confirmed`
          : "No reported bugs yet"}
      </div>
    </Link>
  );
}
