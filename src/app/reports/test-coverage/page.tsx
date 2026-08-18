import { getCoverageByDiscipline, getShellGames } from "@/lib/data";
import { qualityBand } from "@/lib/quality-score";
import { QA_DISCIPLINE_META } from "@/lib/coverage";
import { ReportShell, ReportSection, ReportStat } from "@/components/reports/report-shell";
import { CoverageBar } from "@/components/coverage/coverage-bar";

export default async function TestCoverageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const [coverage, games] = await Promise.all([getCoverageByDiscipline(gameSlug), getShellGames()]);

  const scopeLabel = !gameSlug || gameSlug === "all" ? "All Games" : games.find((g) => g.slug === gameSlug)?.name ?? "All Games";

  const disciplinesWithData = coverage.filter((c) => c.totalTestCases > 0);
  const overallExecuted = disciplinesWithData.reduce((sum, c) => sum + c.executedTestCases, 0);
  const overallTotal = disciplinesWithData.reduce((sum, c) => sum + c.totalTestCases, 0);
  const overallCoverage = overallTotal > 0 ? Math.round((overallExecuted / overallTotal) * 1000) / 10 : null;

  const needsAttention = coverage.filter((c) => c.coveragePercent === null || qualityBand(c.coveragePercent) !== "HEALTHY");

  return (
    <ReportShell
      title="Test Coverage Report"
      subtitle={scopeLabel}
      exportBase="/api/export/reports/test-coverage"
      exportParams={{ game: gameSlug }}
    >
      <ReportSection title="Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ReportStat label="Overall coverage" value={overallCoverage === null ? "N/A" : `${overallCoverage}%`} />
          <ReportStat label="Test cases executed" value={`${overallExecuted} / ${overallTotal}`} />
          <ReportStat label="Disciplines needing attention" value={String(needsAttention.length)} color={needsAttention.length > 0 ? "var(--bf-status-warning)" : undefined} />
        </div>
      </ReportSection>

      {needsAttention.length > 0 && (
        <ReportSection title="Needs attention">
          <p className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3 text-[13px] text-[color:var(--bf-ink-secondary)]">
            {needsAttention.map((c) => QA_DISCIPLINE_META[c.discipline].label).join(", ")}
          </p>
        </ReportSection>
      )}

      <ReportSection title="Coverage by discipline">
        <div className="space-y-5 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          {coverage.map((c) => (
            <CoverageBar key={c.discipline} coverage={c} />
          ))}
        </div>
      </ReportSection>
    </ReportShell>
  );
}
