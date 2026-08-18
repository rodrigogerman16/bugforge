import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getBuildReadinessData } from "@/lib/data";
import { computeReleaseReadiness, RELEASE_TARGETS } from "@/lib/release-readiness";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--bf-status-good)";
  if (score >= 60) return "var(--bf-status-warning)";
  return "var(--bf-status-critical)";
}

function BreakdownRow({
  label,
  value,
  meetsTarget,
}: {
  label: string;
  value: string;
  meetsTarget: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[13px] text-[color:var(--bf-ink-secondary)]">{label}</span>
      <span className="flex items-center gap-2">
        {meetsTarget !== null && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: meetsTarget ? "var(--bf-status-good)" : "var(--bf-status-critical)" }}
          />
        )}
        <span className="font-mono text-sm font-semibold text-[color:var(--bf-ink-primary)]">{value}</span>
      </span>
    </div>
  );
}

export default async function BuildReadinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBuildReadinessData(id);
  if (!data) notFound();

  const readiness = computeReleaseReadiness({
    criticalBugs: data.criticalBugs,
    testPassRate: data.testPassRate,
    regressionRate: data.regressionRate,
    coverage: data.coverage,
    performance: data.performance,
  });

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link
        href={`/builds?game=${data.gameSlug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to builds
      </Link>

      <p className="text-[12px] text-[color:var(--bf-ink-muted)]">{data.gameName}</p>
      <h1 className="mt-1 font-mono text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
        Build {data.version}
      </h1>

      <div className="mt-6 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-6 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
          Release Readiness
        </p>
        <p className="mt-2 text-5xl font-bold" style={{ color: scoreColor(readiness.score) }}>
          {readiness.score} <span className="text-xl font-medium text-[color:var(--bf-ink-muted)]">/ 100</span>
        </p>
        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold"
          style={{
            color: readiness.ready ? "var(--bf-status-good)" : "var(--bf-status-critical)",
            borderColor: readiness.ready
              ? "color-mix(in srgb, var(--bf-status-good) 40%, transparent)"
              : "color-mix(in srgb, var(--bf-status-critical) 40%, transparent)",
          }}
        >
          {readiness.ready ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {readiness.ready ? "READY" : "NOT READY"}
        </span>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Breakdown</h2>
        <dl className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)]">
          <BreakdownRow label="Critical bugs" value={String(data.criticalBugs)} meetsTarget={data.criticalBugs === 0} />
          <BreakdownRow
            label="Test pass rate"
            value={data.testPassRate === null ? "N/A" : `${data.testPassRate}%`}
            meetsTarget={data.testPassRate === null ? false : data.testPassRate >= RELEASE_TARGETS.testPassRate}
          />
          <BreakdownRow
            label="Regression rate"
            value={`${data.regressionRate}%`}
            meetsTarget={data.regressionRate <= RELEASE_TARGETS.regressionRate}
          />
          <BreakdownRow
            label="Coverage"
            value={data.coverage === null ? "N/A" : `${data.coverage}%`}
            meetsTarget={data.coverage === null ? false : data.coverage >= RELEASE_TARGETS.coverage}
          />
          <BreakdownRow
            label="Performance"
            value={data.performance === null ? "N/A" : `${data.performance}%`}
            meetsTarget={data.performance === null ? null : data.performance >= RELEASE_TARGETS.performance}
          />
        </dl>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Blocking Issues</h2>
        {readiness.blockingIssues.length === 0 ? (
          <p className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3 text-sm text-[color:var(--bf-ink-muted)]">
            No blocking issues found.
          </p>
        ) : (
          <ul className="space-y-2">
            {readiness.blockingIssues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border p-3 text-[13px] text-[color:var(--bf-ink-secondary)]"
                style={{
                  borderColor: "color-mix(in srgb, var(--bf-status-critical) 30%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--bf-status-critical) 6%, transparent)",
                }}
              >
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[color:var(--bf-status-critical)]" />
                {issue}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
