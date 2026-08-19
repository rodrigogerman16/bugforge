import type { SeverityCounts } from "@/lib/severity";

export type QualityBand = "HEALTHY" | "AT_RISK" | "CRITICAL";

export const QUALITY_BAND_META: Record<QualityBand, { label: string; color: string }> = {
  HEALTHY: { label: "Healthy", color: "var(--bf-status-good)" },
  AT_RISK: { label: "At Risk", color: "var(--bf-status-warning)" },
  CRITICAL: { label: "Critical", color: "var(--bf-status-critical)" },
};

export function qualityBand(score: number): QualityBand {
  if (score >= 75) return "HEALTHY";
  if (score >= 45) return "AT_RISK";
  return "CRITICAL";
}

// ---------------------------------------------------------------------------
// Bug health — the one factor every quality score below is built from, and
// the only one cheap enough to reconstruct for a historical point-in-time
// trend (see getQualityTrend), since it only needs each bug's own severity
// and open/closed state as of that day, not a same-day snapshot of test
// runs or coverage.
//
// Starts at 100 (nothing open is shippable) and loses points for every
// currently-open bug. Blocker and Critical bugs cost their full weight per
// bug (each one is a real release blocker on its own), while High/Medium/Low
// costs grow with the square root of the count, so the 10th open low-
// priority bug costs far less than the 1st — a game doesn't read as equally
// unhealthy for 3 vs 30 minor bugs.
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: SeverityCounts = {
  BLOCKER: 20,
  CRITICAL: 12,
  HIGH: 5,
  MEDIUM: 1.6,
  LOW: 0.5,
};

export function computeBugHealthScore(openSeverityCounts: SeverityCounts): number {
  const penalty =
    openSeverityCounts.BLOCKER * SEVERITY_WEIGHT.BLOCKER +
    openSeverityCounts.CRITICAL * SEVERITY_WEIGHT.CRITICAL +
    Math.sqrt(openSeverityCounts.HIGH) * SEVERITY_WEIGHT.HIGH +
    Math.sqrt(openSeverityCounts.MEDIUM) * SEVERITY_WEIGHT.MEDIUM +
    Math.sqrt(openSeverityCounts.LOW) * SEVERITY_WEIGHT.LOW;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

// Kept as the historical-trend entry point (getQualityTrend reconstructs
// this one factor day-by-day; it never had access to a same-day snapshot of
// test runs or coverage to begin with, so the trend line has always been a
// bug-health trend specifically, not the full composite below).
export const computeQualityScore = computeBugHealthScore;

// ---------------------------------------------------------------------------
// Composite quality score — item 67: "create a transparent quality score"
// combining critical bugs, test pass rate, regression rate, coverage, open
// high-priority bugs, and resolution velocity. Every factor is a real,
// computed number (see lib/db/games.ts and lib/db/builds.ts for what feeds
// each one in) — nothing here is guessed, and nothing is hidden: the
// function returns each factor's own 0-100 sub-score and how much weight it
// actually carried, so the UI can show the breakdown, not just the total.
//
// Each factor is normalized to its own 0-100 sub-score, then combined as a
// weighted average — not summed penalties — specifically so a factor with
// no data yet (a build with no test runs logged, a game with no coverage
// data) can be *excluded* rather than guessed at, with its weight
// redistributed proportionally across the factors that do have data. A
// brand-new build with zero bugs and zero test runs should score on its
// (perfect) bug health alone, not get penalized for a "0% test pass rate"
// that's really "nothing has run yet".
//
// Fixed weights, chosen by how directly and immediately each factor
// reflects release risk:
//   - Bug health (40%): the dominant signal — real, currently-open bugs,
//     weighted by severity. Always available, so it's the only factor that
//     can never be excluded.
//   - Open high-priority bugs (15%): P0/P1 bugs specifically, since
//     priority (urgency to work) is tracked independently of severity
//     (technical impact) in this app — two bugs of the same severity can
//     carry very different priority, and this factor is what catches that.
//   - Test pass rate (15%): whether what has been tested is passing.
//   - Regression rate (15%): a build re-breaking previously-fixed bugs is a
//     process signal bug health alone doesn't capture.
//   - Coverage (10%): how much of the real test suite has actually been
//     run — necessary context for how much the other factors can be
//     trusted, but not as urgent as any of the above.
//   - Resolution velocity (5%): how quickly bugs actually get fixed once
//     found — the slowest-moving, most secondary signal, so it carries the
//     least weight.
// ---------------------------------------------------------------------------

export type QualityScoreFactors = {
  openSeverityCounts: SeverityCounts;
  /** Currently-open bugs at priority P0 or P1. */
  openHighPriorityCount: number;
  /** 0-100, or null if no test runs have been logged yet. */
  testPassRate: number | null;
  /** 0-100 — percentage of bugs that are confirmed regressions. */
  regressionRate: number;
  /** 0-100, or null if no coverage data exists yet (no test cases/runs). */
  coverage: number | null;
  /** Average hours to fully resolve a bug (creation to Closed), or null with no resolved bugs yet. */
  resolutionVelocityHours: number | null;
};

export type QualityScoreFactorBreakdown = {
  key: "bugHealth" | "highPriority" | "testPassRate" | "regressionRate" | "coverage" | "velocity";
  label: string;
  /** This factor's own 0-100 sub-score. */
  subScore: number;
  /** The weight this factor actually carried in the final average (0-1) — redistributed when other factors were excluded for missing data. */
  weight: number;
  /** The raw value the sub-score was derived from, formatted for display. */
  valueLabel: string;
  available: boolean;
};

export type QualityScoreResult = {
  score: number;
  band: QualityBand;
  factors: QualityScoreFactorBreakdown[];
};

const BASE_WEIGHTS = {
  bugHealth: 0.4,
  highPriority: 0.15,
  testPassRate: 0.15,
  regressionRate: 0.15,
  coverage: 0.1,
  velocity: 0.05,
} as const;

// Each open P0/P1 bug costs 8 points off this sub-score — 13+ open
// high-priority bugs zeroes it out, since that many simultaneously-urgent
// bugs is itself a release-blocking signal regardless of their severity.
function highPriorityScore(openHighPriorityCount: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - openHighPriorityCount * 8)));
}

// A 2% regression rate — the exact threshold item 68's own example uses —
// costs 10 points; the sub-score reaches 0 at a 20% regression rate.
function regressionScore(regressionRatePercent: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - regressionRatePercent * 5)));
}

// Treats a 10-day average resolution time as the point this sub-score
// bottoms out — a build resolving bugs same-day scores near 100, one taking
// two weeks or more on average scores near 0.
function velocityScore(avgHours: number): number {
  const TEN_DAYS_HOURS = 240;
  return Math.max(0, Math.min(100, Math.round(100 - (avgHours / TEN_DAYS_HOURS) * 100)));
}

export function computeGameQualityScore(factors: QualityScoreFactors): QualityScoreResult {
  const entries: { key: QualityScoreFactorBreakdown["key"]; label: string; subScore: number | null; valueLabel: string }[] = [
    {
      key: "bugHealth",
      label: "Bug health",
      subScore: computeBugHealthScore(factors.openSeverityCounts),
      valueLabel: `${factors.openSeverityCounts.BLOCKER + factors.openSeverityCounts.CRITICAL + factors.openSeverityCounts.HIGH + factors.openSeverityCounts.MEDIUM + factors.openSeverityCounts.LOW} open bugs`,
    },
    {
      key: "highPriority",
      label: "Open high-priority bugs",
      subScore: highPriorityScore(factors.openHighPriorityCount),
      valueLabel: `${factors.openHighPriorityCount} open (P0/P1)`,
    },
    {
      key: "testPassRate",
      label: "Test pass rate",
      subScore: factors.testPassRate,
      valueLabel: factors.testPassRate === null ? "No test runs yet" : `${factors.testPassRate}%`,
    },
    {
      key: "regressionRate",
      label: "Regression rate",
      subScore: regressionScore(factors.regressionRate),
      valueLabel: `${factors.regressionRate}%`,
    },
    {
      key: "coverage",
      label: "Coverage",
      subScore: factors.coverage,
      valueLabel: factors.coverage === null ? "No coverage data yet" : `${factors.coverage}%`,
    },
    {
      key: "velocity",
      label: "Resolution velocity",
      subScore: factors.resolutionVelocityHours === null ? null : velocityScore(factors.resolutionVelocityHours),
      valueLabel:
        factors.resolutionVelocityHours === null
          ? "No resolved bugs yet"
          : `${Math.round((factors.resolutionVelocityHours / 24) * 10) / 10}d avg to resolve`,
    },
  ];

  const availableWeightSum = entries.reduce(
    (sum, e) => (e.subScore === null ? sum : sum + BASE_WEIGHTS[e.key]),
    0
  );

  let weightedTotal = 0;
  const breakdown: QualityScoreFactorBreakdown[] = entries.map((e) => {
    const available = e.subScore !== null;
    // Redistribute a missing factor's weight proportionally across the
    // factors that do have data, so the weights always sum to 1 — a build
    // with no coverage data yet is scored entirely on the factors it does
    // have, not silently docked points for data that doesn't exist.
    const weight = available ? BASE_WEIGHTS[e.key] / availableWeightSum : 0;
    if (available) weightedTotal += (e.subScore as number) * weight;
    return { key: e.key, label: e.label, subScore: e.subScore ?? 0, weight, valueLabel: e.valueLabel, available };
  });

  const score = Math.max(0, Math.min(100, Math.round(weightedTotal)));
  return { score, band: qualityBand(score), factors: breakdown };
}
