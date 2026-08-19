import { notFound } from "next/navigation";
import { getBuildQaReportData } from "@/lib/db";
import { ReportShell, ReportSection, ReportStat } from "@/components/reports/report-shell";
import { SEVERITY_META } from "@/lib/severity";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { BUILD_STATUS_META } from "@/lib/build-status";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function BuildQaReportPage({
  searchParams,
}: {
  searchParams: Promise<{ build?: string }>;
}) {
  const { build: buildId } = await searchParams;
  const data = buildId ? await getBuildQaReportData(buildId) : null;
  if (!data) notFound();

  return (
    <ReportShell
      title="Build QA Report"
      subtitle={`${data.gameName} — Build ${data.version}`}
      exportBase="/api/export/reports/build-qa"
      exportParams={{ build: buildId }}
    >
      <ReportSection title="Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ReportStat label="Status" value={BUILD_STATUS_META[data.status].label} color={BUILD_STATUS_META[data.status].color} />
          <ReportStat label="Released" value={dateFormatter.format(data.releasedAt)} />
          <ReportStat label="Branch" value={data.branch} />
          <ReportStat label="Total bugs" value={String(data.totalBugs)} />
          <ReportStat label="Open bugs" value={String(data.openBugs)} color={data.openBugs > 0 ? "var(--bf-status-warning)" : undefined} />
          <ReportStat label="Regressions" value={String(data.regressionCount)} color={data.regressionCount > 0 ? "var(--bf-status-critical)" : undefined} />
          <ReportStat label="Test pass rate" value={data.testPassRate === null ? "N/A" : `${data.testPassRate}%`} />
        </div>
      </ReportSection>

      <ReportSection title="Bugs by severity">
        <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[color:var(--bf-surface)] text-[11px] uppercase text-[color:var(--bf-ink-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Open</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.bugsBySeverity.map((s) => (
                <tr key={s.severity} className="border-t border-[color:var(--bf-border)]">
                  <td className="px-4 py-2">
                    <span style={{ color: SEVERITY_META[s.severity].color }} className="font-medium">
                      {SEVERITY_META[s.severity].label}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono">{s.open}</td>
                  <td className="px-4 py-2 font-mono">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection title="Top open issues">
        {data.topOpenBugs.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No open bugs on this build.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)]">
            {data.topOpenBugs.map((b) => (
              <li key={b.number} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span className="text-[color:var(--bf-ink-secondary)]">
                  BUG-{b.number} — {b.title}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[11px]">
                  <span style={{ color: SEVERITY_META[b.severity].color }}>{SEVERITY_META[b.severity].label}</span>
                  <span className="text-[color:var(--bf-ink-muted)]">{BUG_STATUS_META[b.status].label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>

      {data.notes && (
        <ReportSection title="Build notes">
          <p className="text-sm text-[color:var(--bf-ink-secondary)]">{data.notes}</p>
        </ReportSection>
      )}
    </ReportShell>
  );
}
