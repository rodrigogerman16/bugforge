import { prisma } from "@/lib/db/prisma";
import type { Platform, BuildStatus } from "@/generated/prisma/enums";
import { emptySeverityCounts } from "@/lib/severity";
import { computeQualityScore, qualityBand, type QualityBand } from "@/lib/quality-score";
import { QA_DISCIPLINE_META } from "@/lib/coverage";
import { OPEN_STATUSES } from "./bugs";
import { getCoverageByDiscipline } from "./coverage";

export type BuildSummary = {
  id: string;
  version: string;
  branch: string;
  status: BuildStatus;
  releasedAt: Date;
  notes: string | null;
  game: { id: string; name: string; slug: string; platforms: Platform[]; coverColor: string };
  bugTotal: number;
  criticalOpenCount: number;
  highOpenCount: number;
  regressionCount: number;
  qualityScore: number;
  qualityBand: QualityBand;
  testPassRate: number | null;
};

export async function getBuilds(options?: { gameSlug?: string; buildIds?: string[] }): Promise<BuildSummary[]> {
  const { gameSlug, buildIds } = options ?? {};
  const builds = await prisma.build.findMany({
    where: {
      ...(gameSlug && gameSlug !== "all" ? { game: { slug: gameSlug } } : {}),
      ...(buildIds ? { id: { in: buildIds } } : {}),
    },
    orderBy: { releasedAt: "desc" },
    select: {
      id: true,
      version: true,
      branch: true,
      status: true,
      releasedAt: true,
      notes: true,
      game: { select: { id: true, name: true, slug: true, coverColor: true, platforms: { select: { platform: true } } } },
      bugs: { select: { severity: true, status: true, isRegression: true } },
    },
  });

  // TestRun has no direct buildId — it only reaches a build transitively via
  // its session, so pass/fail counts are bucketed by session.buildId here.
  const testRuns = await prisma.testRun.findMany({
    where: { session: { buildId: { in: builds.map((b) => b.id) } } },
    select: { result: true, session: { select: { buildId: true } } },
  });
  const passFailByBuild = new Map<string, { pass: number; fail: number }>();
  for (const run of testRuns) {
    const buildId = run.session.buildId;
    const bucket = passFailByBuild.get(buildId) ?? { pass: 0, fail: 0 };
    if (run.result === "PASS") bucket.pass++;
    else if (run.result === "FAIL") bucket.fail++;
    passFailByBuild.set(buildId, bucket);
  }

  return builds.map((build) => {
    // Same "still a release risk" definition as everywhere else in the app —
    // a build's QA status reflects its own open bugs, not its full history.
    const openCounts = emptySeverityCounts();
    for (const bug of build.bugs) {
      if (OPEN_STATUSES.includes(bug.status)) openCounts[bug.severity]++;
    }
    const qualityScore = computeQualityScore(openCounts);

    const passFail = passFailByBuild.get(build.id);
    const testPassRate =
      passFail && passFail.pass + passFail.fail > 0
        ? Math.round((passFail.pass / (passFail.pass + passFail.fail)) * 1000) / 10
        : null;

    return {
      id: build.id,
      version: build.version,
      branch: build.branch,
      status: build.status,
      releasedAt: build.releasedAt,
      notes: build.notes,
      game: { ...build.game, platforms: build.game.platforms.map((p) => p.platform) },
      bugTotal: build.bugs.length,
      criticalOpenCount: openCounts.CRITICAL,
      highOpenCount: openCounts.HIGH,
      regressionCount: build.bugs.filter((b) => b.isRegression).length,
      qualityScore,
      qualityBand: qualityBand(qualityScore),
      testPassRate,
    };
  });
}

export async function getBuildOptions() {
  return prisma.build.findMany({
    orderBy: [{ game: { name: "asc" } }, { releasedAt: "desc" }],
    select: {
      id: true,
      version: true,
      releasedAt: true,
      game: { select: { name: true, slug: true } },
    },
  });
}

// Just id/version, newest first, for the "which build was this fixed/
// verified in" pickers on a bug's own page — a bug can only ever be
// fixed/verified in a build of the same game it belongs to.
export async function getBuildsForGame(gameId: string) {
  return prisma.build.findMany({
    where: { gameId },
    orderBy: { releasedAt: "desc" },
    select: { id: true, version: true },
  });
}

// The real, current latest build for a game — what "recommended next test"
// actually tells a tester to retest against, never a guessed version string.
export async function getLatestBuildVersion(gameId: string): Promise<string | null> {
  const build = await prisma.build.findFirst({
    where: { gameId },
    orderBy: { releasedAt: "desc" },
    select: { version: true },
  });
  return build?.version ?? null;
}

const COVERAGE_TARGET_PERCENT = 70;
const HIGH_PRIORITY_CLUSTER_THRESHOLD = 3;

export type BuildRiskContext = {
  buildId: string;
  version: string;
  status: BuildStatus;
  gameId: string;
  // Open BLOCKER + CRITICAL severity bugs filed against this specific build.
  criticalOpenCount: number;
  // Percentage-point change in this build's own regression rate versus the
  // previous build for the same game, by release order. Null when there's
  // no earlier build to compare against.
  regressionRateDeltaPct: number | null;
  // Disciplines whose real test coverage (from the Coverage page's own
  // computation) sits below a fixed target — worst first, capped to 2.
  belowTargetDisciplines: { label: string; coveragePercent: number | null }[];
  // The single largest cluster of open, high-priority (P0/P1) bugs sharing
  // one real gameMode value, when it meets the clustering threshold.
  clusteredHighPriority: { gameMode: string; count: number } | null;
};

export async function getBuildRiskContext(buildId: string): Promise<BuildRiskContext | null> {
  const build = await prisma.build.findUnique({
    where: { id: buildId },
    select: { id: true, version: true, status: true, releasedAt: true, gameId: true, game: { select: { slug: true } } },
  });
  if (!build) return null;

  const [criticalOpenCount, thisBuildBugs, previousBuild, clusterRows, disciplineCoverage] = await Promise.all([
    prisma.bug.count({
      where: { buildId, status: { in: OPEN_STATUSES }, severity: { in: ["BLOCKER", "CRITICAL"] } },
    }),
    prisma.bug.findMany({ where: { buildId }, select: { isRegression: true } }),
    prisma.build.findFirst({
      where: { gameId: build.gameId, releasedAt: { lt: build.releasedAt } },
      orderBy: { releasedAt: "desc" },
      select: { id: true },
    }),
    prisma.bug.groupBy({
      by: ["gameMode"],
      where: { buildId, status: { in: OPEN_STATUSES }, priority: { in: ["P0", "P1"] }, gameMode: { not: null } },
      _count: { _all: true },
    }),
    getCoverageByDiscipline(build.game.slug),
  ]);

  let regressionRateDeltaPct: number | null = null;
  if (previousBuild) {
    const prevBugs = await prisma.bug.findMany({ where: { buildId: previousBuild.id }, select: { isRegression: true } });
    const rateOf = (bugs: { isRegression: boolean }[]) =>
      bugs.length > 0 ? (bugs.filter((b) => b.isRegression).length / bugs.length) * 100 : 0;
    regressionRateDeltaPct = Math.round((rateOf(thisBuildBugs) - rateOf(prevBugs)) * 10) / 10;
  }

  const belowTargetDisciplines = disciplineCoverage
    .filter((d) => d.coveragePercent === null || d.coveragePercent < COVERAGE_TARGET_PERCENT)
    .sort((a, b) => (a.coveragePercent ?? -1) - (b.coveragePercent ?? -1))
    .slice(0, 2)
    .map((d) => ({ label: QA_DISCIPLINE_META[d.discipline].label, coveragePercent: d.coveragePercent }));

  const topCluster = clusterRows
    .filter((r) => r._count._all >= HIGH_PRIORITY_CLUSTER_THRESHOLD)
    .sort((a, b) => b._count._all - a._count._all)[0];
  const clusteredHighPriority = topCluster ? { gameMode: topCluster.gameMode!, count: topCluster._count._all } : null;

  return {
    buildId: build.id,
    version: build.version,
    status: build.status,
    gameId: build.gameId,
    criticalOpenCount,
    regressionRateDeltaPct,
    belowTargetDisciplines,
    clusteredHighPriority,
  };
}

export type BuildReadinessData = {
  id: string;
  version: string;
  status: BuildStatus;
  releasedAt: Date;
  gameId: string;
  gameName: string;
  gameSlug: string;
  criticalBugs: number;
  testPassRate: number | null;
  regressionRate: number;
  coverage: number | null;
  performance: number | null;
};

// Everything the /builds/[id]/readiness scorecard needs, computed directly
// from this build's own bugs and the test runs logged in its own sessions —
// "coverage" and "performance" are real, build-scoped figures, not the
// game-wide numbers the Coverage page shows.
export async function getBuildReadinessData(buildId: string): Promise<BuildReadinessData | null> {
  const build = await prisma.build.findUnique({
    where: { id: buildId },
    select: {
      id: true,
      version: true,
      status: true,
      releasedAt: true,
      gameId: true,
      game: { select: { name: true, slug: true } },
    },
  });
  if (!build) return null;

  const [criticalBugs, allBugs, sessions, totalTestCases] = await Promise.all([
    prisma.bug.count({
      where: { buildId, status: { in: OPEN_STATUSES }, severity: { in: ["BLOCKER", "CRITICAL"] } },
    }),
    prisma.bug.findMany({ where: { buildId }, select: { isRegression: true } }),
    prisma.qASession.findMany({ where: { buildId }, select: { id: true } }),
    prisma.testCase.count({ where: { gameId: build.gameId } }),
  ]);

  const regressionRate =
    allBugs.length > 0 ? Math.round((allBugs.filter((b) => b.isRegression).length / allBugs.length) * 1000) / 10 : 0;

  const sessionIds = sessions.map((s) => s.id);
  const testRuns =
    sessionIds.length > 0
      ? await prisma.testRun.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { result: true, testCaseId: true, testCase: { select: { category: { select: { discipline: true } } } } },
        })
      : [];

  const passFailRate = (runs: { result: string }[]) => {
    const pass = runs.filter((r) => r.result === "PASS").length;
    const fail = runs.filter((r) => r.result === "FAIL").length;
    return pass + fail > 0 ? Math.round((pass / (pass + fail)) * 1000) / 10 : null;
  };

  const testPassRate = passFailRate(testRuns);
  const performance = passFailRate(testRuns.filter((r) => r.testCase.category?.discipline === "PERFORMANCE"));

  const distinctExecuted = new Set(testRuns.map((r) => r.testCaseId)).size;
  const coverage = totalTestCases > 0 ? Math.round((distinctExecuted / totalTestCases) * 1000) / 10 : null;

  return {
    id: build.id,
    version: build.version,
    status: build.status,
    releasedAt: build.releasedAt,
    gameId: build.gameId,
    gameName: build.game.name,
    gameSlug: build.game.slug,
    criticalBugs,
    testPassRate,
    regressionRate,
    coverage,
    performance,
  };
}


