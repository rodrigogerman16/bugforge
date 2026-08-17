import { prisma } from "@/lib/prisma";
import { BugStatus, type BugPriority, type BugSeverity, type Platform, type BuildStatus, type TestCasePriority, type SessionStatus } from "@/generated/prisma/enums";
import { emptySeverityCounts, SEVERITY_ORDER, type SeverityCounts } from "@/lib/severity";
import { PRIORITY_ORDER } from "@/lib/priority";
import { BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";
import { computeQualityScore, qualityBand, type QualityBand } from "@/lib/quality-score";
import { formatReleaseDate } from "@/lib/utils";
import type { TrendRangeDays } from "@/lib/trend-range";
import { resolveRelationships } from "@/lib/relationships";
import { deriveTestCaseStatus, type TestCaseStatus } from "@/lib/test-case";
import { reproductionQualityPercent } from "@/lib/tester";
import { groupActivityByDay, type ActivityEventRow } from "@/lib/activity";
import type { TesterRole } from "@/generated/prisma/enums";
import { QA_DISCIPLINE_ORDER, QADiscipline } from "@/lib/coverage";

// "Open" means still on the pre-verification side of the workflow — a Fixed or
// Ready for QA bug hasn't been confirmed by QA yet, so it still counts as a
// release risk until it reaches Verified.
export const OPEN_STATUSES: BugStatus[] = [
  BugStatus.NEW,
  BugStatus.CONFIRMED,
  BugStatus.IN_PROGRESS,
  BugStatus.FIXED,
  BugStatus.READY_FOR_QA,
];

export type GameSummary = {
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
  qualityBand: QualityBand;
};

export async function getShellGames() {
  const games = await prisma.game.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      platforms: { select: { platform: true } },
      coverColor: true,
      releaseDate: true,
      builds: { orderBy: { releasedAt: "desc" }, take: 1, select: { version: true } },
      bugs: { select: { severity: true, status: true } },
    },
  });

  return games.map((game) => {
    const openCounts = emptySeverityCounts();
    for (const bug of game.bugs) {
      if (OPEN_STATUSES.includes(bug.status)) openCounts[bug.severity]++;
    }
    const qualityScore = computeQualityScore(openCounts);

    return {
      id: game.id,
      name: game.name,
      slug: game.slug,
      platforms: game.platforms.map((p) => p.platform),
      coverColor: game.coverColor,
      latestBuildVersion: game.builds[0]?.version ?? null,
      qualityScore,
      qualityBand: qualityBand(qualityScore),
      releaseDateLabel: formatReleaseDate(game.releaseDate),
    };
  });
}

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

export async function getGamesWithBuilds() {
  return prisma.game.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      builds: { orderBy: { releasedAt: "desc" }, select: { id: true, version: true } },
    },
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

// TC-numbers are derived from creation order across the whole database, the
// same convention used for BUG-numbers — not stored, cheap to recompute.
export async function getTestCaseNumberMap(): Promise<Map<string, number>> {
  const all = await prisma.testCase.findMany({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return new Map(all.map((tc, i) => [tc.id, i + 1]));
}

export type TestCaseSummary = {
  id: string;
  number: number;
  title: string;
  category: { id: string; name: string } | null;
  priority: TestCasePriority;
  platform: Platform;
  status: TestCaseStatus;
  latestRunAt: Date | null;
  game: { id: string; name: string; slug: string; coverColor: string };
};

export async function getTestCases(gameSlug?: string): Promise<TestCaseSummary[]> {
  const [testCases, numberMap] = await Promise.all([
    prisma.testCase.findMany({
      where: gameSlug && gameSlug !== "all" ? { game: { slug: gameSlug } } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: { select: { id: true, name: true } },
        priority: true,
        platform: true,
        game: { select: { id: true, name: true, slug: true, coverColor: true } },
        runs: { orderBy: { runAt: "desc" }, take: 1, select: { result: true, runAt: true } },
      },
    }),
    getTestCaseNumberMap(),
  ]);

  return testCases.map((tc) => ({
    id: tc.id,
    number: numberMap.get(tc.id) ?? 0,
    title: tc.title,
    category: tc.category,
    priority: tc.priority,
    platform: tc.platform,
    status: deriveTestCaseStatus(tc.runs[0]?.result),
    latestRunAt: tc.runs[0]?.runAt ?? null,
    game: tc.game,
  }));
}

export async function getTestCaseDetail(id: string) {
  const [testCase, numberMap, bugNumberMap] = await Promise.all([
    prisma.testCase.findUnique({
      where: { id },
      include: {
        game: { select: { id: true, name: true, slug: true, coverColor: true, platforms: { select: { platform: true } } } },
        category: { select: { id: true, name: true } },
        runs: {
          orderBy: { runAt: "desc" },
          include: {
            tester: { select: { id: true, name: true } },
            session: { select: { id: true, name: true, build: { select: { version: true } } } },
            createdBug: { select: { id: true, title: true } },
          },
        },
      },
    }),
    getTestCaseNumberMap(),
    getBugNumberMap(),
  ]);
  if (!testCase) return null;

  return {
    ...testCase,
    game: { ...testCase.game, platforms: testCase.game.platforms.map((p) => p.platform) },
    number: numberMap.get(testCase.id) ?? 0,
    status: deriveTestCaseStatus(testCase.runs[0]?.result),
    runs: testCase.runs.map((run) => ({
      ...run,
      createdBug: run.createdBug
        ? { ...run.createdBug, number: bugNumberMap.get(run.createdBug.id) ?? 0 }
        : null,
    })),
  };
}

export async function getTestRunDetail(runId: string) {
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      testCase: { select: { id: true, title: true, gameId: true } },
      tester: { select: { id: true, name: true } },
      session: { select: { id: true, name: true, build: { select: { version: true } } } },
      stepResults: { orderBy: { stepIndex: "asc" } },
      createdBug: { select: { id: true, title: true } },
    },
  });
  if (!run) return null;

  const [testCaseNumberMap, bugNumberMap] = await Promise.all([getTestCaseNumberMap(), getBugNumberMap()]);

  return {
    ...run,
    testCase: { ...run.testCase, number: testCaseNumberMap.get(run.testCase.id) ?? 0 },
    createdBug: run.createdBug
      ? { ...run.createdBug, number: bugNumberMap.get(run.createdBug.id) ?? 0 }
      : null,
  };
}

export async function getGameSessions(gameId: string) {
  return prisma.qASession.findMany({
    where: { gameId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true, build: { select: { version: true } } },
  });
}

export type SessionSummary = {
  id: string;
  name: string;
  status: SessionStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  notes: string | null;
  build: { version: string };
  game: { id: string; name: string; slug: string; platforms: Platform[]; coverColor: string };
  testerCount: number;
  bugsFound: number;
  criticalCount: number;
  testCasesExecuted: number;
  coveragePercent: number | null;
};

async function buildSessionSummaries(
  sessions: {
    id: string;
    name: string;
    status: SessionStatus;
    startedAt: Date | null;
    endedAt: Date | null;
    notes: string | null;
    gameId: string;
    build: { version: string };
    game: { id: string; name: string; slug: string; platforms: Platform[]; coverColor: string };
    bugs: { severity: BugSeverity; reportedById: string | null }[];
    testRuns: { testerId: string | null; testCaseId: string }[];
  }[]
): Promise<SessionSummary[]> {
  const gameIds = [...new Set(sessions.map((s) => s.gameId))];
  const testCaseCounts = await prisma.testCase.groupBy({
    by: ["gameId"],
    where: { gameId: { in: gameIds } },
    _count: { _all: true },
  });
  const totalTestCasesByGame = new Map(testCaseCounts.map((c) => [c.gameId, c._count._all]));

  return sessions.map((session) => {
    const testerIds = new Set<string>();
    for (const bug of session.bugs) if (bug.reportedById) testerIds.add(bug.reportedById);
    for (const run of session.testRuns) if (run.testerId) testerIds.add(run.testerId);

    const criticalCount = session.bugs.filter((b) => b.severity === "CRITICAL").length;

    const distinctTestCases = new Set(session.testRuns.map((r) => r.testCaseId));
    const totalTestCases = totalTestCasesByGame.get(session.gameId) ?? 0;
    const coveragePercent =
      totalTestCases > 0 ? Math.round((distinctTestCases.size / totalTestCases) * 1000) / 10 : null;

    return {
      id: session.id,
      name: session.name,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      notes: session.notes,
      build: session.build,
      game: session.game,
      testerCount: testerIds.size,
      bugsFound: session.bugs.length,
      criticalCount,
      testCasesExecuted: session.testRuns.length,
      coveragePercent,
    };
  });
}

export async function getSessions(gameSlug?: string): Promise<SessionSummary[]> {
  const sessions = await prisma.qASession.findMany({
    where: gameSlug && gameSlug !== "all" ? { game: { slug: gameSlug } } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      startedAt: true,
      endedAt: true,
      notes: true,
      gameId: true,
      build: { select: { version: true } },
      game: { select: { id: true, name: true, slug: true, coverColor: true, platforms: { select: { platform: true } } } },
      bugs: { select: { severity: true, reportedById: true } },
      testRuns: { select: { testerId: true, testCaseId: true } },
    },
  });

  return buildSessionSummaries(
    sessions.map((s) => ({ ...s, game: { ...s.game, platforms: s.game.platforms.map((p) => p.platform) } }))
  );
}

export async function getSessionDetail(id: string) {
  const session = await prisma.qASession.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      startedAt: true,
      endedAt: true,
      notes: true,
      gameId: true,
      build: { select: { version: true } },
      game: { select: { id: true, name: true, slug: true, coverColor: true, platforms: { select: { platform: true } } } },
      bugs: {
        select: { severity: true, reportedById: true },
      },
      testRuns: { select: { testerId: true, testCaseId: true } },
    },
  });
  if (!session) return null;

  const [summary] = await buildSessionSummaries([
    { ...session, game: { ...session.game, platforms: session.game.platforms.map((p) => p.platform) } },
  ]);

  const [testers, bugs, testRuns, numberMap] = await Promise.all([
    prisma.tester.findMany({
      where: { id: { in: [...new Set([...session.bugs.map((b) => b.reportedById), ...session.testRuns.map((r) => r.testerId)].filter((x): x is string => !!x))] } },
      select: { id: true, name: true, role: true },
    }),
    prisma.bug.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, severity: true, status: true },
    }),
    prisma.testRun.findMany({
      where: { sessionId: id },
      orderBy: { runAt: "desc" },
      select: {
        id: true,
        result: true,
        runAt: true,
        testCase: { select: { id: true, title: true } },
        tester: { select: { id: true, name: true } },
      },
    }),
    getBugNumberMap(),
  ]);

  return {
    ...summary,
    testers,
    bugs: bugs.map((b) => ({ ...b, number: numberMap.get(b.id) ?? 0 })),
    testRuns,
  };
}

// "Confirmed" here means the tester's own reported bugs that were validated
// as real (anything past NEW that wasn't REJECTED) — a reproduction-quality
// signal about their own reports, never a comparison against anyone else.
const REJECTED_BUG_STATUSES: BugStatus[] = [BugStatus.REJECTED];

export type TesterProfileSummary = {
  id: string;
  name: string;
  email: string;
  role: TesterRole;
  bugsReported: number;
  bugsConfirmed: number;
  bugsRejected: number;
  testCasesExecuted: number;
  reproductionQuality: number | null;
};

export async function getTesterProfiles(): Promise<TesterProfileSummary[]> {
  const [testers, bugCounts, testRunCounts] = await Promise.all([
    // Alphabetical, not sorted by any stat — this is a directory, not a
    // leaderboard.
    prisma.tester.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true } }),
    prisma.bug.groupBy({ by: ["reportedById", "status"], _count: { _all: true } }),
    prisma.testRun.groupBy({ by: ["testerId"], _count: { _all: true } }),
  ]);

  const testCaseCountByTester = new Map(testRunCounts.map((r) => [r.testerId, r._count._all]));

  return testers.map((tester) => {
    let bugsReported = 0;
    let bugsRejected = 0;
    let bugsConfirmed = 0;
    for (const row of bugCounts) {
      if (row.reportedById !== tester.id) continue;
      bugsReported += row._count._all;
      if (REJECTED_BUG_STATUSES.includes(row.status)) bugsRejected += row._count._all;
      else if (row.status !== BugStatus.NEW) bugsConfirmed += row._count._all;
    }

    return {
      id: tester.id,
      name: tester.name,
      email: tester.email,
      role: tester.role,
      bugsReported,
      bugsConfirmed,
      bugsRejected,
      testCasesExecuted: testCaseCountByTester.get(tester.id) ?? 0,
      reproductionQuality: reproductionQualityPercent(bugsConfirmed, bugsRejected),
    };
  });
}

export type TesterActivityRow = ActivityEventRow & { bug: { id: string; number: number; title: string } };

export async function getTesterProfileDetail(id: string) {
  const tester = await prisma.tester.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!tester) return null;

  const [profiles, activityEvents, numberMap] = await Promise.all([
    getTesterProfiles(),
    prisma.activityEvent.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        actor: { select: { id: true, name: true, role: true } },
        targetTester: { select: { id: true, name: true, role: true } },
        bug: { select: { id: true, title: true } },
      },
    }),
    getBugNumberMap(),
  ]);

  const summary = profiles.find((p) => p.id === id);
  if (!summary) return null;

  const activity: TesterActivityRow[] = activityEvents.map((e) => ({
    ...e,
    bug: { id: e.bug.id, number: numberMap.get(e.bug.id) ?? 0, title: e.bug.title },
  }));

  return { ...summary, activityByDay: groupActivityByDay(activity) };
}

export type DisciplineCoverage = {
  discipline: QADiscipline;
  totalTestCases: number;
  executedTestCases: number;
  coveragePercent: number | null;
};

export async function getCoverageByDiscipline(gameSlug?: string): Promise<DisciplineCoverage[]> {
  const testCases = await prisma.testCase.findMany({
    where: gameSlug && gameSlug !== "all" ? { game: { slug: gameSlug } } : undefined,
    select: { category: { select: { discipline: true } }, _count: { select: { runs: true } } },
  });

  const buckets = new Map<QADiscipline, { total: number; executed: number }>();
  for (const discipline of QA_DISCIPLINE_ORDER) buckets.set(discipline, { total: 0, executed: 0 });

  for (const testCase of testCases) {
    const discipline = testCase.category?.discipline;
    if (!discipline) continue;
    const bucket = buckets.get(discipline)!;
    bucket.total++;
    if (testCase._count.runs > 0) bucket.executed++;
  }

  return QA_DISCIPLINE_ORDER.map((discipline) => {
    const bucket = buckets.get(discipline)!;
    return {
      discipline,
      totalTestCases: bucket.total,
      executedTestCases: bucket.executed,
      coveragePercent: bucket.total > 0 ? Math.round((bucket.executed / bucket.total) * 100) : null,
    };
  });
}

export async function getCurrentUser() {
  const tester = await prisma.tester.findFirst({
    where: { role: "QA_LEAD" },
    orderBy: { createdAt: "asc" },
  });
  return (
    tester ?? {
      id: "mock-user",
      name: "Guest QA",
      email: "guest@bugforge.dev",
      role: "QA_ENGINEER" as const,
    }
  );
}

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

// A bug counts as "closed" (no longer open) once it reaches one of these
// statuses — the inverse of OPEN_STATUSES above.
const TERMINAL_STATUSES: BugStatus[] = [
  BugStatus.VERIFIED,
  BugStatus.CLOSED,
  BugStatus.REJECTED,
  BugStatus.DUPLICATE,
];

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

export const BUG_SORT_FIELDS = [
  "number",
  "title",
  "severity",
  "priority",
  "status",
  "area",
  "build",
  "reporter",
  "assignee",
  "updatedAt",
] as const;
export type BugSortField = (typeof BUG_SORT_FIELDS)[number];

export function isBugSortField(value: string | undefined): value is BugSortField {
  return !!value && (BUG_SORT_FIELDS as readonly string[]).includes(value);
}

export const BUG_PAGE_SIZE = 20;

const STATUS_SORT_ORDER: BugStatus[] = [...BUG_WORKFLOW_MAIN, ...BUG_WORKFLOW_EXITS];

export type BugListOptions = {
  gameSlug?: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  status?: BugStatus;
  areaId?: string;
  build?: string;
  platform?: Platform;
  reporterId?: string;
  /** A tester id, or the sentinel "unassigned" for assignedToId === null. */
  assigneeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tagId?: string;
  q?: string;
  sort?: BugSortField;
  dir?: "asc" | "desc";
  page?: number;
};

export async function getBugFilterOptions(gameSlug: string | undefined) {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: {
      platforms: { select: { platform: true } },
      builds: { select: { version: true }, orderBy: { releasedAt: "desc" } },
    },
  });

  const builds = [...new Set(games.flatMap((g) => g.builds.map((b) => b.version)))];
  const platforms = [...new Set(games.flatMap((g) => g.platforms.map((p) => p.platform)))];

  const [testers, tags, areas] = await Promise.all([
    prisma.tester.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    prisma.area.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return { builds, platforms, testers, tags, areas };
}

export type AreaSummary = { id: string; name: string; discipline: QADiscipline | null };

// The real, user-manageable game-area taxonomy (see the Area model) — bugs
// and test cases are tagged against these rows, and new custom areas are
// just new rows created from the /areas page, not a hardcoded list.
export async function getAreas(): Promise<AreaSummary[]> {
  return prisma.area.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, discipline: true },
  });
}

export async function getAreaUsageCounts(): Promise<Map<string, { bugs: number; testCases: number }>> {
  const areas = await prisma.area.findMany({
    select: { id: true, _count: { select: { bugs: true, testCases: true } } },
  });
  return new Map(areas.map((a) => [a.id, { bugs: a._count.bugs, testCases: a._count.testCases }]));
}

// Every bug gets a stable, human-friendly ticket number (BUG-1, BUG-2, …)
// derived from its creation order across the whole database — not stored,
// since it's fully determined by createdAt and cheap to recompute for the
// small volumes this app deals with, and it stays stable across sorting
// because it's assigned before any display sort/filter is applied.
export async function getBugNumberMap(): Promise<Map<string, number>> {
  const allBugs = await prisma.bug.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return new Map(allBugs.map((b, i) => [b.id, i + 1]));
}

export async function getBugList(options: BugListOptions) {
  const {
    gameSlug,
    severity,
    priority,
    status,
    areaId,
    build,
    platform,
    reporterId,
    assigneeId,
    dateFrom,
    dateTo,
    tagId,
    q,
    page = 1,
  } = options;
  const sort = options.sort ?? "updatedAt";
  const dir = options.dir ?? "desc";

  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: { id: true },
  });
  const gameIds = games.map((g) => g.id);

  const [allMatching, numberMap] = await Promise.all([
    prisma.bug.findMany({
      where: {
        gameId: { in: gameIds },
        ...(severity ? { severity } : {}),
        ...(priority ? { priority } : {}),
        ...(status ? { status } : {}),
        ...(areaId ? { areaId } : {}),
        ...(build ? { build: { version: build } } : {}),
        ...(platform ? { platform } : {}),
        ...(reporterId ? { reportedById: reporterId } : {}),
        ...(assigneeId ? { assignedToId: assigneeId === "unassigned" ? null : assigneeId } : {}),
        ...(tagId ? { tags: { some: { id: tagId } } } : {}),
        ...(dateFrom || dateTo
          ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { area: { name: { contains: q } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        severity: true,
        priority: true,
        status: true,
        isRegression: true,
        area: { select: { id: true, name: true } },
        updatedAt: true,
        game: { select: { name: true, slug: true, coverColor: true } },
        build: { select: { version: true } },
        reportedBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    getBugNumberMap(),
  ]);

  const bugs = allMatching.map((bug) => ({ ...bug, number: numberMap.get(bug.id) ?? 0 }));

  const dirMul = dir === "asc" ? 1 : -1;
  const comparators: Record<BugSortField, (a: (typeof bugs)[number], b: (typeof bugs)[number]) => number> = {
    number: (a, b) => a.number - b.number,
    title: (a, b) => a.title.localeCompare(b.title),
    // Reversed vs. their definition-order arrays so "desc" — the default
    // direction on a fresh column click — surfaces the most severe/highest
    // priority/furthest-along bug first, matching how desc already behaves
    // for numbers and dates elsewhere in this table.
    severity: (a, b) => SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity),
    priority: (a, b) => PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority),
    status: (a, b) => STATUS_SORT_ORDER.indexOf(b.status) - STATUS_SORT_ORDER.indexOf(a.status),
    area: (a, b) => (a.area?.name ?? "").localeCompare(b.area?.name ?? ""),
    build: (a, b) => a.build.version.localeCompare(b.build.version),
    reporter: (a, b) => (a.reportedBy?.name ?? "").localeCompare(b.reportedBy?.name ?? ""),
    assignee: (a, b) => (a.assignedTo?.name ?? "").localeCompare(b.assignedTo?.name ?? ""),
    updatedAt: (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
  };
  bugs.sort((a, b) => dirMul * comparators[sort](a, b));

  const totalCount = bugs.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / BUG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * BUG_PAGE_SIZE;
  const pageBugs = bugs.slice(start, start + BUG_PAGE_SIZE);

  return { bugs: pageBugs, totalCount, page: safePage, pageCount };
}

export async function getBugDetail(id: string) {
  const [bug, numberMap] = await Promise.all([
    prisma.bug.findUnique({
      where: { id },
      include: {
        game: { select: { name: true, slug: true, coverColor: true } },
        build: { select: { version: true, branch: true } },
        session: { select: { name: true } },
        area: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        tags: { select: { id: true, name: true, color: true } },
        evidence: {
          select: {
            id: true,
            type: true,
            url: true,
            content: true,
            fileName: true,
            fileSizeBytes: true,
            caption: true,
          },
          orderBy: { createdAt: "asc" },
        },
        // A bug auto-created from a failed test execution keeps a real link
        // back to that run, so the origin is traceable, not just prose.
        originatingTestRuns: {
          take: 1,
          select: { id: true, testCase: { select: { id: true, title: true } } },
        },
      },
    }),
    getBugNumberMap(),
  ]);

  if (!bug) return null;

  const originatingRun = bug.originatingTestRuns[0];
  let originatingTestCase: { id: string; number: number; title: string; runId: string } | null = null;
  if (originatingRun) {
    const testCaseNumberMap = await getTestCaseNumberMap();
    originatingTestCase = {
      id: originatingRun.testCase.id,
      number: testCaseNumberMap.get(originatingRun.testCase.id) ?? 0,
      title: originatingRun.testCase.title,
      runId: originatingRun.id,
    };
  }

  return { ...bug, number: numberMap.get(bug.id) ?? 0, originatingTestCase };
}

export async function getTesters() {
  return prisma.tester.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

type FlatComment = Awaited<ReturnType<typeof fetchFlatComments>>[number];
export type CommentNode = FlatComment & { replies: CommentNode[] };

async function fetchFlatComments(bugId: string) {
  return prisma.comment.findMany({
    where: { bugId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, role: true } },
      mentions: { select: { id: true, name: true } },
      reactions: {
        select: { id: true, emoji: true, testerId: true, tester: { select: { name: true } } },
      },
      attachments: {
        select: { id: true, type: true, url: true, fileName: true, fileSizeBytes: true },
      },
    },
  });
}

// Comments are fetched flat (a self-relation can't be fetched pre-nested in
// one query) and assembled into a reply tree here.
export async function getBugComments(bugId: string): Promise<CommentNode[]> {
  const flat = await fetchFlatComments(bugId);

  const byId = new Map<string, CommentNode>();
  for (const c of flat) byId.set(c.id, { ...c, replies: [] });

  const roots: CommentNode[] = [];
  for (const c of flat) {
    const node = byId.get(c.id)!;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getBugRelationships(bugId: string) {
  const [rows, numberMap] = await Promise.all([
    prisma.bugRelationship.findMany({
      where: { OR: [{ sourceBugId: bugId }, { targetBugId: bugId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sourceBug: { select: { id: true, title: true, status: true } },
        targetBug: { select: { id: true, title: true, status: true } },
      },
    }),
    getBugNumberMap(),
  ]);

  return resolveRelationships(bugId, rows, (id) => numberMap.get(id) ?? 0);
}

export async function getRegressionInfo(bugId: string) {
  const relationship = await prisma.bugRelationship.findFirst({
    where: { sourceBugId: bugId, type: "REGRESSION_OF" },
    orderBy: { createdAt: "asc" },
    include: {
      sourceBug: { select: { build: { select: { version: true } } } },
      targetBug: { select: { id: true, title: true, build: { select: { version: true } } } },
    },
  });
  if (!relationship) return null;

  const numberMap = await getBugNumberMap();
  return {
    originalBugId: relationship.targetBug.id,
    originalBugTitle: relationship.targetBug.title,
    originalBugNumber: numberMap.get(relationship.targetBug.id) ?? 0,
    previouslyFixedBuild: relationship.targetBug.build.version,
    reproducedBuild: relationship.sourceBug.build.version,
  };
}

export async function getBugActivity(bugId: string) {
  return prisma.activityEvent.findMany({
    where: { bugId },
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, name: true, role: true } },
      targetTester: { select: { id: true, name: true, role: true } },
    },
  });
}

// Everything BugForge AI's heuristics need about one bug, gathered in a
// single query so every action (severity, duplicates, regression risk, …)
// works from the same real snapshot instead of re-deriving it per action.
export type AiBugContext = {
  id: string;
  number: number;
  title: string;
  description: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  isRegression: boolean;
  platform: Platform;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  map: string | null;
  gameMode: string | null;
  createdAt: Date;
  evidenceCount: number;
  tags: string[];
  gameId: string;
  gameName: string;
  gameSlug: string;
  areaId: string | null;
  areaName: string | null;
  areaDiscipline: QADiscipline | null;
  buildVersion: string;
  buildStatus: BuildStatus;
};

export async function getBugForAi(bugId: string): Promise<AiBugContext | null> {
  const [bug, numberMap] = await Promise.all([
    prisma.bug.findUnique({
      where: { id: bugId },
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        priority: true,
        status: true,
        isRegression: true,
        platform: true,
        stepsToReproduce: true,
        expectedResult: true,
        actualResult: true,
        map: true,
        gameMode: true,
        createdAt: true,
        _count: { select: { evidence: true } },
        tags: { select: { name: true } },
        game: { select: { id: true, name: true, slug: true } },
        area: { select: { id: true, name: true, discipline: true } },
        build: { select: { version: true, status: true } },
      },
    }),
    getBugNumberMap(),
  ]);
  if (!bug) return null;

  return {
    id: bug.id,
    number: numberMap.get(bug.id) ?? 0,
    title: bug.title,
    description: bug.description,
    severity: bug.severity,
    priority: bug.priority,
    status: bug.status,
    isRegression: bug.isRegression,
    platform: bug.platform,
    stepsToReproduce: bug.stepsToReproduce,
    expectedResult: bug.expectedResult,
    actualResult: bug.actualResult,
    map: bug.map,
    gameMode: bug.gameMode,
    createdAt: bug.createdAt,
    evidenceCount: bug._count.evidence,
    tags: bug.tags.map((t) => t.name),
    gameId: bug.game.id,
    gameName: bug.game.name,
    gameSlug: bug.game.slug,
    areaId: bug.area?.id ?? null,
    areaName: bug.area?.name ?? null,
    areaDiscipline: bug.area?.discipline ?? null,
    buildVersion: bug.build.version,
    buildStatus: bug.build.status,
  };
}

export type DuplicateCandidateBug = {
  id: string;
  number: number;
  title: string;
  description: string;
  status: BugStatus;
  severity: BugSeverity;
};

// Every other non-duplicate bug in the same game — the candidate pool the
// duplicate-detection heuristic scores by text similarity against.
export async function getGameBugsForDuplicateScan(
  gameId: string,
  excludeBugId: string
): Promise<DuplicateCandidateBug[]> {
  const [bugs, numberMap] = await Promise.all([
    prisma.bug.findMany({
      where: { gameId, id: { not: excludeBugId }, status: { not: "DUPLICATE" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, status: true, severity: true },
    }),
    getBugNumberMap(),
  ]);
  return bugs.map((b) => ({ ...b, number: numberMap.get(b.id) ?? 0 }));
}

export type AreaRiskContext = { openBugsInArea: number; regressionCountInArea: number };

// The two "is this area historically unstable" signals regression-risk and
// priority heuristics need — how many other open bugs and confirmed
// regressions this specific area already has in this game.
export async function getAreaRiskContext(
  gameId: string,
  areaId: string | null,
  excludeBugId: string
): Promise<AreaRiskContext> {
  if (!areaId) return { openBugsInArea: 0, regressionCountInArea: 0 };

  const [openBugsInArea, regressionCountInArea] = await Promise.all([
    prisma.bug.count({
      where: { gameId, areaId, id: { not: excludeBugId }, status: { in: OPEN_STATUSES } },
    }),
    prisma.bugRelationship.count({
      where: { type: "REGRESSION_OF", sourceBug: { gameId, areaId } },
    }),
  ]);
  return { openBugsInArea, regressionCountInArea };
}
