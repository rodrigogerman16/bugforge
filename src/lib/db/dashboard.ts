import { prisma } from "@/lib/db/prisma";
import { BugStatus, type Platform } from "@/generated/prisma/enums";
import { emptySeverityCounts, type SeverityCounts } from "@/lib/severity";
import {
  qualityBand,
  computeGameQualityScore,
  computeBugHealthScore,
  type QualityScoreFactorBreakdown,
} from "@/lib/quality-score";
import type { TrendRangeDays } from "@/lib/utils/trend-range";
import { OPEN_STATUSES, TERMINAL_STATUSES } from "./bugs";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HIGH_PRIORITY: string[] = ["P0", "P1"];

// The dashboard's Quality Score card is the canonical, transparent display
// item 67 asks for — every game/aggregate score here is the full six-factor
// composite (see computeGameQualityScore), with the per-factor breakdown
// returned alongside the total. Two other places in the app also show a
// lighter-weight "quality score" (the sidebar's game switcher via
// getShellGames, and the Builds list) — those stay on bug-health-only
// deliberately: they're called on every page load or list every build at
// once, and the extra queries a full composite needs (test runs, coverage,
// resolution history) aren't worth paying for somewhere that isn't the
// actual transparency surface.
export type DashboardGameSummary = {
  id: string;
  name: string;
  slug: string;
  platforms: Platform[];
  coverColor: string;
  latestBuild: { version: string; branch: string } | null;
  activeSession: { name: string; status: string } | null;
  bugTotal: number;
  openBugTotal: number;
  severityCounts: SeverityCounts;
  openSeverityCounts: SeverityCounts;
  qualityScore: number;
  qualityBand: ReturnType<typeof qualityBand>;
  qualityFactors: QualityScoreFactorBreakdown[];
};

export async function getDashboardData(gameSlug?: string) {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    include: {
      builds: { orderBy: { releasedAt: "desc" }, take: 1 },
      sessions: { orderBy: { startedAt: "desc" } },
      platforms: { select: { platform: true } },
      bugs: {
        select: {
          severity: true,
          priority: true,
          status: true,
          isRegression: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const weekAgo = new Date(Date.now() - WEEK_MS);
  const gameIds = games.map((g) => g.id);

  // Two more real, per-game inputs the composite score needs, gathered
  // alongside the games query rather than per-game in a loop: test runs
  // (for pass rate, bucketed by game via testCase.gameId) and test case
  // totals (for coverage — the same "distinct executed / total" definition
  // getCoverageByDiscipline uses, just collapsed across every discipline
  // instead of broken out by one).
  const [testRunsByGame, testCasesByGame] = await Promise.all([
    prisma.testRun.findMany({
      where: { testCase: { gameId: { in: gameIds } } },
      select: { result: true, testCaseId: true, testCase: { select: { gameId: true } } },
    }),
    prisma.testCase.findMany({
      where: { gameId: { in: gameIds } },
      select: { id: true, gameId: true },
    }),
  ]);

  function factorsForGame(gameId: string, bugs: (typeof games)[number]["bugs"]): {
    openSeverityCounts: SeverityCounts;
    openHighPriorityCount: number;
    testPassRate: number | null;
    regressionRate: number;
    coverage: number | null;
    resolutionVelocityHours: number | null;
  } {
    const openSeverityCounts = emptySeverityCounts();
    let openHighPriorityCount = 0;
    for (const bug of bugs) {
      if (OPEN_STATUSES.includes(bug.status)) {
        openSeverityCounts[bug.severity]++;
        if (HIGH_PRIORITY.includes(bug.priority)) openHighPriorityCount++;
      }
    }

    const regressedCount = bugs.filter((b) => b.isRegression).length;
    const regressionRate = bugs.length > 0 ? Math.round((regressedCount / bugs.length) * 1000) / 10 : 0;

    const runs = testRunsByGame.filter((r) => r.testCase.gameId === gameId);
    const pass = runs.filter((r) => r.result === "PASS").length;
    const fail = runs.filter((r) => r.result === "FAIL").length;
    const testPassRate = pass + fail > 0 ? Math.round((pass / (pass + fail)) * 1000) / 10 : null;

    const gameTestCaseIds = new Set(testCasesByGame.filter((tc) => tc.gameId === gameId).map((tc) => tc.id));
    const distinctExecuted = new Set(runs.map((r) => r.testCaseId)).size;
    const coverage = gameTestCaseIds.size > 0 ? Math.round((distinctExecuted / gameTestCaseIds.size) * 100) : null;

    // Approximated from createdAt→updatedAt on each already-Closed bug
    // (updatedAt is the last edit, which for a terminal bug is effectively
    // its close time) rather than the full STATUS_CHANGED activity history
    // getBugLifecycleMetrics reconstructs — cheap enough to compute for
    // every dashboard load, at the cost of being a same-precision proxy
    // rather than the exact stage-by-stage timeline that page uses.
    const closedBugs = bugs.filter((b) => b.status === "CLOSED");
    const resolutionVelocityHours =
      closedBugs.length > 0
        ? closedBugs.reduce((sum, b) => sum + (b.updatedAt.getTime() - b.createdAt.getTime()) / 3_600_000, 0) /
          closedBugs.length
        : null;

    return { openSeverityCounts, openHighPriorityCount, testPassRate, regressionRate, coverage, resolutionVelocityHours };
  }

  const gameSummaries: DashboardGameSummary[] = games.map((game) => {
    const severityCounts = emptySeverityCounts();
    let openBugTotal = 0;
    for (const bug of game.bugs) {
      severityCounts[bug.severity]++;
      if (OPEN_STATUSES.includes(bug.status)) openBugTotal++;
    }

    const factors = factorsForGame(game.id, game.bugs);
    const { score: qualityScore, band, factors: qualityFactors } = computeGameQualityScore(factors);

    const highlightedSession =
      game.sessions.find((s) => s.status === "ACTIVE") ?? game.sessions[0] ?? null;

    return {
      id: game.id,
      name: game.name,
      slug: game.slug,
      platforms: game.platforms.map((p) => p.platform),
      coverColor: game.coverColor,
      latestBuild: game.builds[0]
        ? { version: game.builds[0].version, branch: game.builds[0].branch }
        : null,
      activeSession: highlightedSession
        ? { name: highlightedSession.name, status: highlightedSession.status }
        : null,
      bugTotal: game.bugs.length,
      openBugTotal,
      severityCounts,
      openSeverityCounts: factors.openSeverityCounts,
      qualityScore,
      qualityBand: band,
      qualityFactors,
    };
  });

  const aggregateOpenSeverityCounts = emptySeverityCounts();
  const aggregateSeverityCounts = emptySeverityCounts();
  for (const game of gameSummaries) {
    for (const key of Object.keys(aggregateOpenSeverityCounts) as (keyof SeverityCounts)[]) {
      aggregateOpenSeverityCounts[key] += game.openSeverityCounts[key];
      aggregateSeverityCounts[key] += game.severityCounts[key];
    }
  }

  const allBugs = games.flatMap((g) => g.bugs);
  const aggregateFactors = factorsForGame("__all__", allBugs.map((b) => b));
  // factorsForGame's per-game coverage/test-pass lookups filter by gameId,
  // which "__all__" can't match — recomputed directly across every game's
  // runs/test cases below instead, same definitions, just unfiltered.
  const allRuns = testRunsByGame;
  const allPass = allRuns.filter((r) => r.result === "PASS").length;
  const allFail = allRuns.filter((r) => r.result === "FAIL").length;
  const aggregateTestPassRate = allPass + allFail > 0 ? Math.round((allPass / (allPass + allFail)) * 1000) / 10 : null;
  const aggregateDistinctExecuted = new Set(allRuns.map((r) => r.testCaseId)).size;
  const aggregateCoverage =
    testCasesByGame.length > 0 ? Math.round((aggregateDistinctExecuted / testCasesByGame.length) * 100) : null;

  const {
    score: aggregateQualityScore,
    band: aggregateQualityBand,
    factors: aggregateQualityFactors,
  } = computeGameQualityScore({
    ...aggregateFactors,
    openSeverityCounts: aggregateOpenSeverityCounts,
    testPassRate: aggregateTestPassRate,
    coverage: aggregateCoverage,
  });

  const totalBugs = allBugs.length;
  const discoveredThisWeek = allBugs.filter((b) => b.createdAt >= weekAgo).length;
  const FIXED_LIKE_STATUSES: BugStatus[] = [
    BugStatus.FIXED,
    BugStatus.READY_FOR_QA,
    BugStatus.VERIFIED,
    BugStatus.CLOSED,
  ];
  const fixedThisWeek = allBugs.filter(
    (b) => FIXED_LIKE_STATUSES.includes(b.status) && b.updatedAt >= weekAgo
  ).length;

  const stats = {
    totalGames: gameSummaries.length,
    totalOpenBugs: gameSummaries.reduce((sum, g) => sum + g.openBugTotal, 0),
    activeSessions: gameSummaries.filter((g) => g.activeSession?.status === "ACTIVE").length,
    aggregateQualityScore,
    aggregateQualityBand,
    aggregateQualityFactors,
    aggregateOpenSeverityCounts,
    aggregateSeverityCounts,
    totalBugs,
    criticalBugsOpen: aggregateOpenSeverityCounts.CRITICAL,
    discoveredThisWeek,
    fixedThisWeek,
    regressionRate: aggregateFactors.regressionRate,
    testPassRate: aggregateTestPassRate,
  };

  return { games: gameSummaries, stats };
}

export type QualityTrendPoint = { date: string; score: number };

// Backtests the bug-health formula against each bug's real createdAt/updatedAt
// history: for every day in the window, a bug counts as open if it existed by
// that day and hadn't reached a terminal status yet (using updatedAt as the best
// available proxy for when it closed). This is a genuine reconstruction from the
// actual bug timeline, not synthetic/random data — and it's bug-health only
// (see computeBugHealthScore in lib/quality-score.ts), not the full composite
// score above, since a same-day historical snapshot of test runs/coverage
// isn't something this app reconstructs.
export async function getQualityTrend(
  gameSlug: string | undefined,
  days: TrendRangeDays
): Promise<QualityTrendPoint[]> {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: {
      bugs: { select: { severity: true, status: true, createdAt: true, updatedAt: true } },
    },
  });

  const allBugs = games.flatMap((g) => g.bugs);
  const dayMs = 86_400_000;
  const now = Date.now();

  const points: QualityTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const asOf = new Date(now - i * dayMs);
    const openCounts = emptySeverityCounts();
    for (const bug of allBugs) {
      if (bug.createdAt > asOf) continue;
      const closedByNow = TERMINAL_STATUSES.includes(bug.status) && bug.updatedAt <= asOf;
      if (closedByNow) continue;
      openCounts[bug.severity]++;
    }
    points.push({
      date: asOf.toISOString().slice(0, 10),
      score: computeBugHealthScore(openCounts),
    });
  }

  return points;
}
