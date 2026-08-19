import { prisma } from "@/lib/db/prisma";
import { BugStatus } from "@/generated/prisma/enums";
import { emptySeverityCounts, type SeverityCounts } from "@/lib/severity";
import { computeQualityScore, qualityBand } from "@/lib/quality-score";
import type { TrendRangeDays } from "@/lib/utils/trend-range";
import { OPEN_STATUSES, TERMINAL_STATUSES } from "./bugs";
import type { GameSummary } from "./games";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
        select: { severity: true, status: true, isRegression: true, createdAt: true, updatedAt: true },
      },
    },
  });

  const weekAgo = new Date(Date.now() - WEEK_MS);

  const gameSummaries: GameSummary[] = games.map((game) => {
    const severityCounts = emptySeverityCounts();
    const openSeverityCounts = emptySeverityCounts();
    let openBugTotal = 0;
    for (const bug of game.bugs) {
      severityCounts[bug.severity]++;
      if (OPEN_STATUSES.includes(bug.status)) {
        openSeverityCounts[bug.severity]++;
        openBugTotal++;
      }
    }
    const qualityScore = computeQualityScore(openSeverityCounts);

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
      openSeverityCounts,
      qualityScore,
      qualityBand: qualityBand(qualityScore),
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
  const aggregateQualityScore = computeQualityScore(aggregateOpenSeverityCounts);

  const allBugs = games.flatMap((g) => g.bugs);
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
  const regressedCount = allBugs.filter((b) => b.isRegression).length;
  const regressionRate = totalBugs > 0 ? Math.round((regressedCount / totalBugs) * 1000) / 10 : 0;

  const gameIds = games.map((g) => g.id);
  const testRuns = await prisma.testRun.findMany({
    where: { testCase: { gameId: { in: gameIds } } },
    select: { result: true },
  });
  const passCount = testRuns.filter((r) => r.result === "PASS").length;
  const failCount = testRuns.filter((r) => r.result === "FAIL").length;
  const testPassRate =
    passCount + failCount > 0 ? Math.round((passCount / (passCount + failCount)) * 1000) / 10 : null;

  const stats = {
    totalGames: gameSummaries.length,
    totalOpenBugs: gameSummaries.reduce((sum, g) => sum + g.openBugTotal, 0),
    activeSessions: gameSummaries.filter((g) => g.activeSession?.status === "ACTIVE").length,
    aggregateQualityScore,
    aggregateQualityBand: qualityBand(aggregateQualityScore),
    aggregateOpenSeverityCounts,
    aggregateSeverityCounts,
    totalBugs,
    criticalBugsOpen: aggregateOpenSeverityCounts.CRITICAL,
    discoveredThisWeek,
    fixedThisWeek,
    regressionRate,
    testPassRate,
  };

  return { games: gameSummaries, stats };
}

export type QualityTrendPoint = { date: string; score: number };

// Backtests the quality-score formula against each bug's real createdAt/updatedAt
// history: for every day in the window, a bug counts as open if it existed by
// that day and hadn't reached a terminal status yet (using updatedAt as the best
// available proxy for when it closed). This is a genuine reconstruction from the
// actual bug timeline, not synthetic/random data.
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
      score: computeQualityScore(openCounts),
    });
  }

  return points;
}

