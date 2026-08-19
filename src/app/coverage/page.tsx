import { AlertTriangle } from "lucide-react";
import { getCoverageByDiscipline } from "@/lib/db";
import { qualityBand } from "@/lib/quality-score";
import { QA_DISCIPLINE_META } from "@/lib/coverage";
import { CoverageBar } from "@/components/coverage/coverage-bar";

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const coverage = await getCoverageByDiscipline(gameSlug);

  // Weakest-covered areas surface first — the whole point of this page is
  // spotting what hasn't been tested enough, not admiring what has.
  const sorted = [...coverage].sort((a, b) => (a.coveragePercent ?? -1) - (b.coveragePercent ?? -1));

  const needsAttention = coverage.filter(
    (c) => c.coveragePercent === null || qualityBand(c.coveragePercent) !== "HEALTHY"
  );

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
          QA Coverage
        </h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
          Share of test cases executed at least once, by discipline
        </p>
      </header>

      {needsAttention.length > 0 && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3 text-[13px] text-[color:var(--bf-ink-secondary)]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[color:var(--bf-status-warning)]" />
          <span>
            {needsAttention.length} of {coverage.length} areas haven&apos;t received enough testing:{" "}
            {needsAttention.map((c) => QA_DISCIPLINE_META[c.discipline].label).join(", ")}.
          </span>
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
        {sorted.map((c) => (
          <CoverageBar key={c.discipline} coverage={c} />
        ))}
      </div>
    </div>
  );
}
