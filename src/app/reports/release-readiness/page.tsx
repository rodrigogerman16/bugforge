import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { getBuildReadinessData, getQualityGates } from "@/lib/data";
import { computeReleaseReadiness } from "@/lib/release-readiness";
import { ReportShell, ReportSection, ReportStat } from "@/components/reports/report-shell";

export default async function ReleaseReadinessReportPage({
  searchParams,
}: {
  searchParams: Promise<{ build?: string }>;
}) {
  const { build: buildId } = await searchParams;
  if (!buildId) notFound();

  const [data, gates] = await Promise.all([getBuildReadinessData(buildId), getQualityGates()]);
  if (!data) notFound();

  const readiness = computeReleaseReadiness(
    {
      criticalBugs: data.criticalBugs,
      testPassRate: data.testPassRate,
      regressionRate: data.regressionRate,
      coverage: data.coverage,
      performance: data.performance,
    },
    gates
  );

  return (
    <ReportShell title="Release Readiness Report" subtitle={`${data.gameName} — Build ${data.version}`}>
      <ReportSection title="Verdict">
        <div className="flex items-center gap-4 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          <p
            className="text-4xl font-bold"
            style={{ color: readiness.score >= 80 ? "var(--bf-status-good)" : readiness.score >= 60 ? "var(--bf-status-warning)" : "var(--bf-status-critical)" }}
          >
            {readiness.score}
            <span className="text-lg font-medium text-[color:var(--bf-ink-muted)]"> / 100</span>
          </p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold"
            style={{
              color: readiness.ready ? "var(--bf-status-good)" : "var(--bf-status-critical)",
              borderColor: readiness.ready
                ? "color-mix(in srgb, var(--bf-status-good) 40%, transparent)"
                : "color-mix(in srgb, var(--bf-status-critical) 40%, transparent)",
            }}
          >
            {readiness.ready ? "READY" : "NOT READY"}
          </span>
        </div>
      </ReportSection>

      <ReportSection title="Quality gates">
        <ul className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)]">
          {readiness.gates.map((gate) => (
            <li key={gate.metric} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
              <span className="flex items-center gap-2">
                {gate.passed ? (
                  <CheckCircle2 size={14} className="text-[color:var(--bf-status-good)]" />
                ) : (
                  <XCircle size={14} className="text-[color:var(--bf-status-critical)]" />
                )}
                <span className="text-[color:var(--bf-ink-primary)]">{gate.label}</span>
                <span className="text-[11px] text-[color:var(--bf-ink-muted)]">{gate.requirementLabel}</span>
              </span>
              <span className="font-mono font-semibold" style={{ color: gate.passed ? "var(--bf-status-good)" : "var(--bf-status-critical)" }}>
                {gate.value === null ? "N/A" : `${gate.value}${gate.metric === "CRITICAL_BUGS" ? "" : "%"}`}
              </span>
            </li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="Blocking issues">
        {readiness.blockingIssues.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No blocking issues found.</p>
        ) : (
          <ul className="space-y-2">
            {readiness.blockingIssues.map((issue, i) => (
              <li
                key={i}
                className="rounded-lg border p-3 text-[13px] text-[color:var(--bf-ink-secondary)]"
                style={{
                  borderColor: "color-mix(in srgb, var(--bf-status-critical) 30%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--bf-status-critical) 6%, transparent)",
                }}
              >
                {issue}
              </li>
            ))}
          </ul>
        )}
      </ReportSection>

      <ReportSection title="Raw metrics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <ReportStat label="Critical bugs" value={String(data.criticalBugs)} />
          <ReportStat label="Test pass rate" value={data.testPassRate === null ? "N/A" : `${data.testPassRate}%`} />
          <ReportStat label="Regression rate" value={`${data.regressionRate}%`} />
          <ReportStat label="Coverage" value={data.coverage === null ? "N/A" : `${data.coverage}%`} />
          <ReportStat label="Performance" value={data.performance === null ? "N/A" : `${data.performance}%`} />
        </div>
      </ReportSection>
    </ReportShell>
  );
}
