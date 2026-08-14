import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, ShieldAlert, SkipForward } from "lucide-react";
import { getTestRunDetail } from "@/lib/data";
import { TEST_RUN_RESULT_META } from "@/lib/test-case";
import { formatRelativeTime } from "@/lib/relative-time";

const RESULT_ICON: Record<string, typeof CheckCircle2> = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  BLOCKED: ShieldAlert,
  SKIPPED: SkipForward,
};

export default async function TestRunDetailPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const run = await getTestRunDetail(runId);
  if (!run || run.testCase.id !== id) notFound();

  const overallMeta = TEST_RUN_RESULT_META[run.result] ?? { label: run.result, color: "var(--bf-ink-muted)" };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link
        href={`/test-cases/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to test case
      </Link>

      <header className="mb-6">
        <p className="font-mono text-[12px] text-[color:var(--bf-ink-muted)]">
          TC-{String(run.testCase.number).padStart(5, "0")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--bf-ink-primary)]">{run.testCase.title}</h1>
        <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">
          Run by {run.tester?.name ?? "Unknown"} · {run.session.name} ({run.session.build.version}) ·{" "}
          {formatRelativeTime(run.runAt)}
        </p>
      </header>

      <div
        className="mb-6 rounded-lg border-2 px-6 py-6 text-center"
        style={{
          borderColor: overallMeta.color,
          backgroundColor: `color-mix(in srgb, ${overallMeta.color} 10%, transparent)`,
        }}
      >
        <p className="text-[12px] font-semibold tracking-wide text-[color:var(--bf-ink-muted)] uppercase">Test Result</p>
        <p className="mt-2 text-2xl font-extrabold tracking-wide uppercase" style={{ color: overallMeta.color }}>
          {overallMeta.label}
        </p>
        {run.createdBug && (
          <p className="mt-3 text-sm text-[color:var(--bf-ink-secondary)]">
            <Link
              href={`/bugs/${run.createdBug.id}`}
              className="font-semibold hover:underline"
              style={{ color: "var(--bf-status-critical)" }}
            >
              BUG-{run.createdBug.number}
            </Link>{" "}
            created automatically
          </p>
        )}
      </div>

      {run.stepResults.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Steps</h2>
          <div className="space-y-2">
            {run.stepResults.map((step) => {
              const meta = TEST_RUN_RESULT_META[step.result] ?? { label: step.result, color: "var(--bf-ink-muted)" };
              const Icon = RESULT_ICON[step.result] ?? CheckCircle2;
              return (
                <div key={step.id} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[color:var(--bf-ink-primary)]">
                      {step.stepIndex + 1}. {step.stepText}
                    </p>
                    <span
                      className="flex shrink-0 items-center gap-1 text-[12px] font-medium"
                      style={{ color: meta.color }}
                    >
                      <Icon size={13} />
                      {meta.label}
                    </span>
                  </div>
                  {step.notes && <p className="mt-2 text-[13px] text-[color:var(--bf-ink-muted)]">{step.notes}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
