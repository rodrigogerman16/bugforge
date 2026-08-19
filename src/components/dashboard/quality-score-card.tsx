import { QUALITY_BAND_META, qualityBand, type QualityScoreFactorBreakdown } from "@/lib/quality-score";
import { SEVERITY_ORDER, SEVERITY_META, type SeverityCounts } from "@/lib/severity";

// Item 67: "make the individual factors visible" — every factor
// computeGameQualityScore actually weighed into the total is listed here
// with its own sub-score and the real weight it carried (never hidden
// behind just the one final number), plus a note when a factor had no data
// yet rather than silently treating it as perfect or zero.
function FactorRow({ factor }: { factor: QualityScoreFactorBreakdown }) {
  const band = QUALITY_BAND_META[qualityBand(factor.subScore)];
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-[12px] text-[color:var(--bf-ink-secondary)]">{factor.label}</p>
        <p className="text-[11px] text-[color:var(--bf-ink-muted)]">
          {factor.valueLabel}
          {factor.available && ` · weighted ${Math.round(factor.weight * 100)}%`}
        </p>
      </div>
      {factor.available ? (
        <span className="shrink-0 text-[12px] font-semibold" style={{ color: band.color }}>
          {factor.subScore}
        </span>
      ) : (
        <span className="shrink-0 text-[11px] text-[color:var(--bf-ink-muted)]">excluded</span>
      )}
    </div>
  );
}

export function QualityScoreCard({
  score,
  openSeverityCounts,
  factors,
}: {
  score: number;
  openSeverityCounts: SeverityCounts;
  factors?: QualityScoreFactorBreakdown[];
}) {
  const band = QUALITY_BAND_META[qualityBand(score)];
  const openTotal = SEVERITY_ORDER.reduce((sum, sev) => sum + openSeverityCounts[sev], 0);

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-6">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        Quality Score
      </p>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-5xl font-semibold text-[color:var(--bf-ink-primary)]">{score}</span>
        <span className="text-lg text-[color:var(--bf-ink-muted)]">/ 100</span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: band.color }} />
        <span className="text-sm font-medium" style={{ color: band.color }}>
          {band.label}
        </span>
      </div>

      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${band.color} 18%, var(--bf-surface))` }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: band.color }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[color:var(--bf-ink-muted)]">
        {openTotal === 0 ? (
          <span>No open bugs — clean build</span>
        ) : (
          SEVERITY_ORDER.filter((sev) => openSeverityCounts[sev] > 0).map((sev) => (
            <span key={sev} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: SEVERITY_META[sev].color }}
              />
              {openSeverityCounts[sev]} {SEVERITY_META[sev].label} open
            </span>
          ))
        )}
      </div>

      {factors && factors.length > 0 && (
        <div className="mt-4 border-t border-[color:var(--bf-border)] pt-1 divide-y divide-[color:var(--bf-border)]">
          {factors.map((factor) => (
            <FactorRow key={factor.key} factor={factor} />
          ))}
        </div>
      )}
    </div>
  );
}
