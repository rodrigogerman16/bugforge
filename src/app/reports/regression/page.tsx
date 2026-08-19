import Link from "next/link";
import { getRegressionReportData, getShellGames } from "@/lib/db";
import { resolveAnalyticsRange } from "@/lib/utils/analytics-range";
import { ReportShell, ReportSection, ReportStat } from "@/components/reports/report-shell";
import { SEVERITY_META } from "@/lib/severity";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function RegressionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; range?: string }>;
}) {
  const { game: gameSlug, range: rangeParam } = await searchParams;
  const { from, to, selection } = resolveAnalyticsRange({ range: rangeParam });
  const days = selection === "custom" ? 30 : selection;

  const [data, games] = await Promise.all([getRegressionReportData(gameSlug, from, to), getShellGames()]);

  const scopeLabel = !gameSlug || gameSlug === "all" ? "All Games" : games.find((g) => g.slug === gameSlug)?.name ?? "All Games";

  return (
    <ReportShell
      title="Regression Report"
      subtitle={`${scopeLabel} — last ${days} days (${dateFormatter.format(from)} to ${dateFormatter.format(to)})`}
      exportBase="/api/export/reports/regression"
      exportParams={{ game: gameSlug, range: rangeParam }}
    >
      <ReportSection title="Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ReportStat
            label="Confirmed regressions"
            value={String(data.entries.length)}
            color={data.entries.length > 0 ? "var(--bf-status-critical)" : undefined}
          />
          <ReportStat label="Areas affected" value={String(data.byArea.length)} />
        </div>
      </ReportSection>

      {data.byArea.length > 0 && (
        <ReportSection title="Regressions by area">
          <ul className="divide-y divide-[color:var(--bf-border)] rounded-lg border border-[color:var(--bf-border)]">
            {data.byArea.map((a) => (
              <li key={a.area} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
                <span className="text-[color:var(--bf-ink-secondary)]">{a.area}</span>
                <span className="font-mono font-semibold text-[color:var(--bf-ink-primary)]">{a.count}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      <ReportSection title="Regressions">
        {data.entries.length === 0 ? (
          <p className="text-sm text-[color:var(--bf-ink-muted)]">No confirmed regressions in this window.</p>
        ) : (
          <ul className="space-y-2">
            {data.entries.map((e) => (
              <li key={e.regressionBugId} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/bugs/${e.regressionBugId}`} className="font-medium text-[color:var(--bf-ink-primary)] hover:text-[color:var(--bf-brand)]">
                    BUG-{e.regressionBugNumber} — {e.title}
                  </Link>
                  <span style={{ color: SEVERITY_META[e.severity].color }} className="shrink-0 text-[11px] font-medium">
                    {SEVERITY_META[e.severity].label}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">
                  {e.gameName} · {e.areaName ?? "Unassigned"} · reproduced in {e.reproducedBuild}
                </p>
                <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">
                  Regression of{" "}
                  <Link href={`/bugs/${e.originalBugId}`} className="text-[color:var(--bf-brand)] hover:underline">
                    BUG-{e.originalBugNumber}
                  </Link>{" "}
                  — previously fixed in {e.originalFixedBuild}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>
    </ReportShell>
  );
}
