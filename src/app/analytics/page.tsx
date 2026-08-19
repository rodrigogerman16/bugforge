import { getAnalyticsData, getBugLifecycleMetrics, getCurrentUser } from "@/lib/db";
import { resolveAnalyticsRange } from "@/lib/utils/analytics-range";
import { canViewAnalytics } from "@/lib/auth/permissions";
import { RestrictedAccess } from "@/components/ui/restricted-access";
import { AnalyticsRangeToggle } from "@/components/analytics/analytics-range-toggle";
import { TrendChart } from "@/components/analytics/trend-chart";
import { CategoryBarChart } from "@/components/analytics/category-bar-chart";
import { LifecycleMetrics } from "@/components/analytics/lifecycle-metrics";
import { CoverageBar } from "@/components/coverage/coverage-bar";
import { SEVERITY_META } from "@/lib/severity";
import { PLATFORM_LABEL } from "@/lib/platform";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; range?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!canViewAnalytics(user.role)) {
    return <RestrictedAccess message="Analytics is available to Admins, QA Leads, and Producers." />;
  }

  const { game: gameSlug, range, from: fromParam, to: toParam } = await searchParams;
  const { from, to, selection } = resolveAnalyticsRange({ range, from: fromParam, to: toParam });

  const [data, lifecycleMetrics] = await Promise.all([
    getAnalyticsData(gameSlug, from, to),
    getBugLifecycleMetrics(gameSlug, from, to),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Analytics</h1>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
            QA activity and trends for the selected range.
          </p>
        </div>
        <AnalyticsRangeToggle selection={selection} from={from} to={to} />
      </header>

      <div className="mb-4">
        <LifecycleMetrics metrics={lifecycleMetrics} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          title="Bugs over time"
          points={data.bugsOverTime.map((p) => ({ date: p.date, value: p.count }))}
          color="var(--bf-brand)"
        />

        <CategoryBarChart
          title="Bugs by severity"
          data={data.bugsBySeverity.map((s) => ({
            label: SEVERITY_META[s.severity].label,
            value: s.count,
            color: SEVERITY_META[s.severity].color,
          }))}
        />

        <CategoryBarChart
          title="Bugs by area"
          data={data.bugsByArea.map((a) => ({ label: a.area, value: a.count }))}
        />

        <CategoryBarChart
          title="Bugs by build"
          data={data.bugsByBuild.map((b) => ({ label: b.build, value: b.count }))}
        />

        <CategoryBarChart
          title="Bugs by platform"
          data={data.bugsByPlatform.map((p) => ({ label: PLATFORM_LABEL[p.platform], value: p.count }))}
        />

        <CategoryBarChart
          title="Resolution time (avg days)"
          data={data.resolutionTimeBySeverity
            .filter((r) => r.count > 0)
            .map((r) => ({
              label: SEVERITY_META[r.severity].label,
              value: r.avgDays ?? 0,
              color: SEVERITY_META[r.severity].color,
            }))}
          valueLabel={(v) => `${v}d`}
          emptyMessage="No bugs resolved in this range yet."
        />

        <TrendChart
          title="Regression rate"
          points={data.regressionRateTrend.map((p) => ({ date: p.date, value: p.rate }))}
          color="var(--bf-status-warning)"
          unit="%"
          maxValue={Math.max(10, ...data.regressionRateTrend.map((p) => p.rate))}
        />

        <TrendChart
          title="Test pass rate"
          points={data.testPassRateTrend.map((p) => ({ date: p.date, value: p.rate }))}
          color="var(--bf-status-good)"
          unit="%"
          maxValue={100}
        />

        <CategoryBarChart
          title="Tester activity"
          data={data.testerActivity.map((t) => ({ label: t.tester, value: t.total }))}
          valueLabel={(v) => `${v} actions`}
          emptyMessage="No tester activity in this range yet."
        />

        <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
            QA coverage
          </p>
          <div className="space-y-4">
            {data.coverageByDiscipline.map((c) => (
              <CoverageBar key={c.discipline} coverage={c} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[color:var(--bf-ink-muted)]">
            Coverage reflects current test execution status, not the selected date range.
          </p>
        </div>
      </div>
    </div>
  );
}
