import { QUALITY_BAND_META, qualityBand } from "@/lib/quality-score";
import { SEVERITY_ORDER, SEVERITY_META, type SeverityCounts } from "@/lib/severity";

export function QualityScoreCard({
  score,
  openSeverityCounts,
}: {
  score: number;
  openSeverityCounts: SeverityCounts;
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
    </div>
  );
}
