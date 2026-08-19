import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Settings2 } from "lucide-react";
import { getBuildReadinessData, getQualityGates, getCurrentUser } from "@/lib/data";
import { computeReleaseReadiness } from "@/lib/release-readiness";
import { canViewReleaseReadiness } from "@/lib/permissions";
import { RestrictedAccess } from "@/components/restricted-access";
import { cn } from "@/lib/utils";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--bf-status-good)";
  if (score >= 60) return "var(--bf-status-warning)";
  return "var(--bf-status-critical)";
}

function GateRow({
  label,
  value,
  requirementLabel,
  passed,
}: {
  label: string;
  value: string;
  requirementLabel: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-2 min-w-0">
        {passed ? (
          <CheckCircle2 size={15} className="shrink-0 text-[color:var(--bf-status-good)]" />
        ) : (
          <XCircle size={15} className="shrink-0 text-[color:var(--bf-status-critical)]" />
        )}
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-[color:var(--bf-ink-primary)]">{label}</span>
          <span className="block text-[11px] text-[color:var(--bf-ink-muted)]">{requirementLabel}</span>
        </span>
      </span>
      <span
        className="shrink-0 font-mono text-sm font-semibold"
        style={{ color: passed ? "var(--bf-status-good)" : "var(--bf-status-critical)" }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function BuildReadinessPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!canViewReleaseReadiness(user.role)) {
    return <RestrictedAccess message="Release Readiness is available to Admins, QA Leads, and Producers." />;
  }

  const { id } = await params;
  const [data, gates] = await Promise.all([getBuildReadinessData(id), getQualityGates()]);
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
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/builds?game=${data.gameSlug}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
        >
          <ArrowLeft size={13} />
          Back to builds
        </Link>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
        >
          <Settings2 size={13} />
          Edit requirements
        </Link>
      </div>

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
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Quality Gates</h2>
        {readiness.gates.length === 0 ? (
          <p className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3 text-sm text-[color:var(--bf-ink-muted)]">
            No quality gates are configured yet.
          </p>
        ) : (
          <dl className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)]">
            {readiness.gates.map((gate) => (
              <GateRow
                key={gate.metric}
                label={gate.label}
                value={gate.value === null ? "N/A" : `${gate.value}${gate.metric === "CRITICAL_BUGS" ? "" : "%"}`}
                requirementLabel={gate.requirementLabel}
                passed={gate.passed}
              />
            ))}
          </dl>
        )}
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
                className={cn("flex items-start gap-2 rounded-lg border p-3 text-[13px] text-[color:var(--bf-ink-secondary)]")}
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
