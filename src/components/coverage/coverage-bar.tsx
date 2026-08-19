import { qualityBand, QUALITY_BAND_META } from "@/lib/quality-score";
import { QA_DISCIPLINE_META } from "@/lib/coverage";
import type { DisciplineCoverage } from "@/lib/db";

export function CoverageBar({ coverage }: { coverage: DisciplineCoverage }) {
  const { discipline, totalTestCases, executedTestCases, coveragePercent } = coverage;
  const hasData = coveragePercent !== null;
  const band = hasData ? qualityBand(coveragePercent) : "CRITICAL";
  const color = hasData ? QUALITY_BAND_META[band].color : "var(--bf-ink-muted)";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-[color:var(--bf-ink-primary)]">
          {QA_DISCIPLINE_META[discipline].label}
        </span>
        <span className="font-mono text-sm font-semibold" style={{ color }}>
          {hasData ? `${coveragePercent}%` : "—"}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[color:var(--bf-surface)]">
        {hasData && (
          <div
            className="h-full rounded-full"
            style={{ width: `${coveragePercent}%`, backgroundColor: color }}
          />
        )}
      </div>
      <p className="mt-1 text-[11px] text-[color:var(--bf-ink-muted)]">
        {totalTestCases === 0 ? "No test cases yet" : `${executedTestCases} of ${totalTestCases} executed`}
      </p>
    </div>
  );
}
