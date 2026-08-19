import {
  Bug,
  CircleDot,
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  RotateCcw,
  ListChecks,
  HeartPulse,
} from "lucide-react";
import { getDashboardData, getQualityTrend } from "@/lib/db";
import { StatTile } from "@/components/ui/stat-tile";
import { GameCard } from "@/components/dashboard/game-card";
import { QualityScoreCard } from "@/components/dashboard/quality-score-card";
import { QualityTrendChart } from "@/components/dashboard/quality-trend-chart";
import { TrendRangeToggle } from "@/components/ui/trend-range-toggle";
import { SeverityMeter } from "@/components/dashboard/severity-meter";
import { QUALITY_BAND_META } from "@/lib/quality-score";
import { isTrendRangeDays, type TrendRangeDays } from "@/lib/utils/trend-range";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; range?: string }>;
}) {
  const { game: gameSlug, range: rangeParam } = await searchParams;
  const parsedRange = Number(rangeParam);
  const range: TrendRangeDays = isTrendRangeDays(parsedRange) ? parsedRange : 30;

  const [{ games, stats }, trendPoints] = await Promise.all([
    getDashboardData(gameSlug),
    getQualityTrend(gameSlug, range),
  ]);

  const headerGame = games.length === 1 ? games[0] : null;
  const heroScore = headerGame ? headerGame.qualityScore : stats.aggregateQualityScore;
  const heroOpenCounts = headerGame ? headerGame.openSeverityCounts : stats.aggregateOpenSeverityCounts;
  const buildHealthBand = QUALITY_BAND_META[headerGame ? headerGame.qualityBand : stats.aggregateQualityBand];

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
          {headerGame ? headerGame.name : "All Games"}
        </h1>
        <p className="mt-1 font-mono text-sm text-[color:var(--bf-ink-muted)]">
          {headerGame?.latestBuild
            ? `Build ${headerGame.latestBuild.version}`
            : `${games.length} games tracked`}
        </p>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
          QA Health
        </p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <QualityScoreCard score={heroScore} openSeverityCounts={heroOpenCounts} />
        <div className="min-w-0">
          <div className="mb-2 flex justify-end">
            <TrendRangeToggle active={range} />
          </div>
          <QualityTrendChart points={trendPoints} />
        </div>
      </div>

      <div className="mb-8">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
          Key Metrics
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total bugs" value={stats.totalBugs} icon={Bug} />
          <StatTile label="Open bugs" value={stats.totalOpenBugs} icon={CircleDot} />
          <StatTile
            label="Critical bugs"
            value={stats.criticalBugsOpen}
            icon={AlertTriangle}
            accent="var(--bf-status-critical)"
          />
          <StatTile
            label="Discovered this week"
            value={stats.discoveredThisWeek}
            icon={CalendarPlus}
          />
          <StatTile
            label="Fixed this week"
            value={stats.fixedThisWeek}
            icon={CheckCircle2}
            accent="var(--bf-status-good)"
          />
          <StatTile
            label="Regression rate"
            value={`${stats.regressionRate}%`}
            icon={RotateCcw}
            accent="var(--bf-status-warning)"
          />
          <StatTile
            label="Test pass rate"
            value={stats.testPassRate !== null ? `${stats.testPassRate}%` : "—"}
            icon={ListChecks}
            accent="var(--bf-status-good)"
          />
          <StatTile
            label="Current build health"
            value={buildHealthBand.label}
            icon={HeartPulse}
            accent={buildHealthBand.color}
            valueColor={buildHealthBand.color}
          />
        </div>
      </div>

      <div className="mb-8">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
          Bug Distribution
        </p>
        <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
          <SeverityMeter
            counts={headerGame ? headerGame.severityCounts : stats.aggregateSeverityCounts}
            size="lg"
            filterHref={(sev) => `/bugs?game=${headerGame ? headerGame.slug : "all"}&severity=${sev}`}
          />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[13px] font-medium text-[color:var(--bf-ink-muted)]">
          Games
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
}
