import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { getTestCaseDetail, getGameSessions } from "@/lib/data";
import { TEST_CASE_PRIORITY_META, TEST_CASE_STATUS_META, TEST_RUN_RESULT_META } from "@/lib/test-case";
import { PLATFORM_LABEL } from "@/lib/platform";
import { formatRelativeTime } from "@/lib/relative-time";
import { DeleteTestCaseButton } from "@/components/test-cases/delete-test-case-button";
import { LogTestRunForm } from "@/components/test-cases/log-test-run-form";

function parseSteps(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function MetaField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-[color:var(--bf-ink-muted)] uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-semibold" style={{ color: color ?? "var(--bf-ink-primary)" }}>
        {value}
      </dd>
    </div>
  );
}

export default async function TestCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testCase = await getTestCaseDetail(id);
  if (!testCase) notFound();

  const sessions = await getGameSessions(testCase.gameId);
  const priorityMeta = TEST_CASE_PRIORITY_META[testCase.priority];
  const statusMeta = TEST_CASE_STATUS_META[testCase.status];

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        href="/test-cases"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to test cases
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] text-[color:var(--bf-ink-muted)]">TC-{String(testCase.number).padStart(5, "0")}</p>
          <h1 className="mt-1 text-2xl font-bold text-[color:var(--bf-ink-primary)]">{testCase.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: testCase.game.coverColor }} />
            {testCase.game.name}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/test-cases/${testCase.id}/execute`}
            className="flex items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
          >
            <Play size={12} />
            Execute
          </Link>
          <Link
            href={`/test-cases/${testCase.id}/edit`}
            className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-3 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
          >
            <Pencil size={12} />
            Edit
          </Link>
          <DeleteTestCaseButton testCaseId={testCase.id} />
        </div>
      </header>

      <dl className="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
        <MetaField label="Category" value={testCase.category?.name ?? "—"} />
        <MetaField label="Priority" value={priorityMeta.label} color={priorityMeta.color} />
        <MetaField label="Status" value={statusMeta.label} color={statusMeta.color} />
      </dl>

      {testCase.description && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Description</h2>
          <p className="text-sm leading-relaxed text-[color:var(--bf-ink-secondary)]">{testCase.description}</p>
        </section>
      )}

      {testCase.preconditions && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Preconditions</h2>
          <p className="text-sm leading-relaxed text-[color:var(--bf-ink-secondary)]">{testCase.preconditions}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Steps</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[color:var(--bf-ink-secondary)]">
          {parseSteps(testCase.steps).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Expected Result</h2>
        <p className="text-sm leading-relaxed text-[color:var(--bf-ink-secondary)]">{testCase.expected}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Platform</h2>
        <p className="text-sm text-[color:var(--bf-ink-secondary)]">{PLATFORM_LABEL[testCase.platform]}</p>
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Log a Test Run</h2>
        <LogTestRunForm testCaseId={testCase.id} sessions={sessions.map((s) => ({ id: s.id, name: s.name, build: s.build }))} />
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">
          Run History{testCase.runs.length > 0 && <span className="text-[color:var(--bf-ink-muted)]"> ({testCase.runs.length})</span>}
        </h2>
        {testCase.runs.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No runs logged yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] text-left text-[12px] text-[color:var(--bf-ink-muted)]">
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium">Session</th>
                  <th className="px-4 py-2.5 font-medium">Tester</th>
                  <th className="px-4 py-2.5 font-medium">Bug</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {testCase.runs.map((run) => {
                  const resultMeta = TEST_RUN_RESULT_META[run.result] ?? { label: run.result, color: "var(--bf-ink-muted)" };
                  return (
                    <tr key={run.id} className="border-b border-[color:var(--bf-border)] last:border-b-0 hover:bg-[color:var(--bf-surface)]">
                      <td className="px-4 py-3">
                        <Link href={`/test-cases/${testCase.id}/runs/${run.id}`} className="font-medium hover:underline" style={{ color: resultMeta.color }}>
                          {resultMeta.label}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">
                        {run.session.name} ({run.session.build.version})
                      </td>
                      <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">{run.tester?.name ?? "Unknown"}</td>
                      <td className="px-4 py-3">
                        {run.createdBug ? (
                          <Link href={`/bugs/${run.createdBug.id}`} className="text-[color:var(--bf-status-critical)] hover:underline">
                            BUG-{run.createdBug.number}
                          </Link>
                        ) : (
                          <span className="text-[color:var(--bf-ink-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--bf-ink-muted)]">{formatRelativeTime(run.runAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
