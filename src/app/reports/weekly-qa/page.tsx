import { getDashboardData, getAnalyticsData, getBugLifecycleMetrics } from "@/lib/db";
import { resolveAnalyticsRange } from "@/lib/utils/analytics-range";
import { ReportShell, ReportSection, ReportStat } from "@/components/reports/report-shell";
import { SEVERITY_META } from "@/lib/severity";
import { QUALITY_BAND_META } from "@/lib/quality-score";

export default async function WeeklyQaReportPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const { from, to } = resolveAnalyticsRange({ range: "7" });

  const [{ games, stats }, analytics, lifecycle] = await Promise.all([
    getDashboardData(gameSlug),
    getAnalyticsData(gameSlug, from, to),
    getBugLifecycleMetrics(gameSlug, from, to),
  ]);

  const scopeLabel = games.length === 1 ? games[0].name : `${games.length} games`;
  const rangeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

  return (
    <ReportShell
      title="Weekly QA Report"
      subtitle={`${scopeLabel} — ${rangeFormatter.format(from)} to ${rangeFormatter.format(to)}`}
      exportBase="/api/export/reports/weekly-qa"
      exportParams={{ game: gameSlug }}
    >
      <ReportSection title="This week at a glance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReportStat label="Discovered" value={String(stats.discoveredThisWeek)} />
          <ReportStat label="Fixed" value={String(stats.fixedThisWeek)} color="var(--bf-status-good)" />
          <ReportStat label="Regression rate" value={`${stats.regressionRate}%`} />
          <ReportStat
            label="Quality score"
            value={`${stats.aggregateQualityScore} / 100`}
            color={QUALITY_BAND_META[stats.aggregateQualityBand].color}
          />
          <ReportStat label="Open bugs" value={String(stats.totalOpenBugs)} />
          <ReportStat label="Critical open" value={String(stats.criticalBugsOpen)} color={stats.criticalBugsOpen > 0 ? "var(--bf-status-critical)" : undefined} />
          <ReportStat label="Active sessions" value={String(stats.activeSessions)} />
          <ReportStat label="Test pass rate" value={stats.testPassRate === null ? "N/A" : `${stats.testPassRate}%`} />
        </div>
      </ReportSection>

      <ReportSection title="Bug lifecycle this week">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Time to Confirm", metric: lifecycle.timeToConfirm },
            { label: "Time to Fix", metric: lifecycle.timeToFix },
            { label: "Time to Verify", metric: lifecycle.timeToVerify },
            { label: "Total Resolution", metric: lifecycle.totalResolutionTime },
          ].map((row) => (
            <ReportStat
              key={row.label}
              label={row.label}
              value={row.metric.avgHours === null ? "—" : `${row.metric.avgHours < 24 ? `${row.metric.avgHours}h` : `${Math.round((row.metric.avgHours / 24) * 10) / 10}d`}`}
            />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="New bugs by severity">
        <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[color:var(--bf-surface)] text-[11px] uppercase text-[color:var(--bf-ink-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {analytics.bugsBySeverity.map((s) => (
                <tr key={s.severity} className="border-t border-[color:var(--bf-border)]">
                  <td className="px-4 py-2">
                    <span style={{ color: SEVERITY_META[s.severity].color }} className="font-medium">
                      {SEVERITY_META[s.severity].label}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection title="Top tester activity">
        {analytics.testerActivity.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No tester activity this week.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)]">
            {analytics.testerActivity.slice(0, 6).map((t) => (
              <li key={t.tester} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
                <span className="text-[color:var(--bf-ink-secondary)]">{t.tester}</span>
                <span className="font-mono text-[color:var(--bf-ink-primary)]">
                  {t.bugsReported} bugs · {t.testRunsLogged} runs
                </span>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>
    </ReportShell>
  );
}
