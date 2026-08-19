import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionDetail } from "@/lib/db";
import { formatPlatformList } from "@/lib/platform";
import { SESSION_STATUS_META, sessionDurationLabel } from "@/lib/auth/session";
import { SEVERITY_META } from "@/lib/severity";
import { TEST_RUN_RESULT_META } from "@/lib/test-case";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { SessionStatusControl } from "@/components/sessions/session-status-control";
import { SessionNotesForm } from "@/components/sessions/session-notes-form";
import { DeleteSessionButton } from "@/components/sessions/delete-session-button";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-[color:var(--bf-ink-muted)] uppercase">{label}</dt>
      <dd className="mt-1 text-lg font-bold" style={{ color: color ?? "var(--bf-ink-primary)" }}>
        {value}
      </dd>
    </div>
  );
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionDetail(id);
  if (!session) notFound();

  const statusMeta = SESSION_STATUS_META[session.status];

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        href="/sessions"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to sessions
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: session.game.coverColor }} />
            {session.game.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">{session.name}</h1>
          <span className="mt-1 flex w-fit items-center gap-1.5 text-[12px] font-medium" style={{ color: statusMeta.color }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusMeta.color }} />
            {statusMeta.label}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <SessionStatusControl sessionId={session.id} status={session.status} />
          <DeleteSessionButton sessionId={session.id} />
        </div>
      </header>

      <dl className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4 sm:grid-cols-4">
        <StatTile label="Build" value={session.build.version} />
        <StatTile label="Platforms" value={formatPlatformList(session.game.platforms)} />
        <StatTile label="Testers" value={String(session.testerCount)} />
        <StatTile label="Duration" value={sessionDurationLabel(session.startedAt, session.endedAt)} />
        <StatTile label="Bugs Found" value={String(session.bugsFound)} />
        <StatTile
          label="Critical"
          value={String(session.criticalCount)}
          color={session.criticalCount > 0 ? "var(--bf-status-critical)" : undefined}
        />
        <StatTile label="Test Cases" value={`${session.testCasesExecuted} executed`} />
        <StatTile label="Coverage" value={session.coveragePercent !== null ? `${session.coveragePercent}%` : "—"} />
      </dl>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Timeline</h2>
        <p className="text-sm text-[color:var(--bf-ink-secondary)]">
          Started {session.startedAt ? dateFormatter.format(session.startedAt) : "—"} · Ended{" "}
          {session.endedAt ? dateFormatter.format(session.endedAt) : "—"}
        </p>
      </section>

      {session.testers.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">
            Testers <span className="text-[color:var(--bf-ink-muted)]">({session.testers.length})</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {session.testers.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-[color:var(--bf-border)] px-2.5 py-1 text-[12px] text-[color:var(--bf-ink-secondary)]"
              >
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">
          Bugs Discovered <span className="text-[color:var(--bf-ink-muted)]">({session.bugs.length})</span>
        </h2>
        {session.bugs.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No bugs reported in this session.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {session.bugs.map((bug) => (
                  <tr key={bug.id} className="border-b border-[color:var(--bf-border)] last:border-b-0 hover:bg-[color:var(--bf-surface)]">
                    <td className="px-4 py-2.5">
                      <Link href={`/bugs/${bug.id}`} className="font-mono text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-brand)]">
                        BUG-{bug.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/bugs/${bug.id}`} className="text-[color:var(--bf-ink-primary)] hover:text-[color:var(--bf-brand)]">
                        {bug.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-[12px] font-medium" style={{ color: SEVERITY_META[bug.severity].color }}>
                        {SEVERITY_META[bug.severity].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">
          Test Runs <span className="text-[color:var(--bf-ink-muted)]">({session.testRuns.length})</span>
        </h2>
        {session.testRuns.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No test cases executed in this session.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {session.testRuns.map((run) => {
                  const meta = TEST_RUN_RESULT_META[run.result] ?? { label: run.result, color: "var(--bf-ink-muted)" };
                  return (
                    <tr key={run.id} className="border-b border-[color:var(--bf-border)] last:border-b-0">
                      <td className="px-4 py-2.5 text-[color:var(--bf-ink-primary)]">{run.testCase.title}</td>
                      <td className="px-4 py-2.5 text-[color:var(--bf-ink-muted)]">{run.tester?.name ?? "Unknown"}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[12px] font-medium" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[color:var(--bf-ink-muted)]">{formatRelativeTime(run.runAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Notes</h2>
        <SessionNotesForm sessionId={session.id} initialNotes={session.notes ?? ""} />
      </section>
    </div>
  );
}
