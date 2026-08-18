// Release readiness is a deterministic scorecard, not a BugForge AI
// suggestion (see src/lib/ai/) — every number and every blocking issue is
// computed directly from real build data against fixed, documented
// thresholds, with no hedging language needed because nothing here is a
// heuristic guess.

export type ReadinessBreakdown = {
  criticalBugs: number;
  testPassRate: number | null;
  regressionRate: number;
  coverage: number | null;
  performance: number | null;
};

export type ReleaseReadiness = {
  score: number;
  ready: boolean;
  breakdown: ReadinessBreakdown;
  blockingIssues: string[];
};

// The bar a build must clear on each metric to ship. Also what drives the
// blocking-issues list below — a metric only appears there when it actually
// misses its own target.
export const RELEASE_TARGETS = {
  testPassRate: 90,
  regressionRate: 3,
  coverage: 80,
  performance: 85,
};

export function computeReleaseReadiness(breakdown: ReadinessBreakdown): ReleaseReadiness {
  const blockingIssues: string[] = [];

  if (breakdown.criticalBugs > 0) {
    blockingIssues.push(
      breakdown.criticalBugs === 1 ? "1 critical bug is still open." : `${breakdown.criticalBugs} critical bugs are still open.`
    );
  }

  if (breakdown.testPassRate === null) {
    blockingIssues.push("No test runs have been logged against this build yet.");
  } else if (breakdown.testPassRate < RELEASE_TARGETS.testPassRate) {
    blockingIssues.push(`Test pass rate (${breakdown.testPassRate}%) is below the ${RELEASE_TARGETS.testPassRate}% release threshold.`);
  }

  if (breakdown.regressionRate > RELEASE_TARGETS.regressionRate) {
    blockingIssues.push(`Regression rate (${breakdown.regressionRate}%) exceeds the ${RELEASE_TARGETS.regressionRate}% threshold.`);
  }

  if (breakdown.coverage === null) {
    blockingIssues.push("No test cases have been executed against this build yet.");
  } else if (breakdown.coverage < RELEASE_TARGETS.coverage) {
    blockingIssues.push(`Test coverage (${breakdown.coverage}%) is below the ${RELEASE_TARGETS.coverage}% target.`);
  }

  if (breakdown.performance !== null && breakdown.performance < RELEASE_TARGETS.performance) {
    blockingIssues.push(`Performance test pass rate (${breakdown.performance}%) is below the ${RELEASE_TARGETS.performance}% target.`);
  }

  // Each metric costs points relative to how far it misses its own target —
  // critical bugs and regression rate are weighted heaviest since they're
  // the two signals most directly tied to shipping a broken build. Missing
  // data (no runs logged at all) costs a flat penalty rather than being
  // treated as a perfect score.
  let score = 100;
  score -= breakdown.criticalBugs * 3;
  score -= breakdown.testPassRate !== null ? Math.max(0, RELEASE_TARGETS.testPassRate - breakdown.testPassRate) * 0.6 : 15;
  score -= breakdown.regressionRate * 2;
  score -= breakdown.coverage !== null ? Math.max(0, RELEASE_TARGETS.coverage - breakdown.coverage) * 0.5 : 15;
  score -= breakdown.performance !== null ? Math.max(0, RELEASE_TARGETS.performance - breakdown.performance) * 0.3 : 0;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    ready: blockingIssues.length === 0,
    breakdown,
    blockingIssues,
  };
}
