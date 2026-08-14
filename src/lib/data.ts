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

// "Open" means still on the pre-verification side of the workflow — a Fixed or
// Ready for QA bug hasn't been confirmed by QA yet, so it still counts as a
// release risk until it reaches Verified.
const OPEN_STATUSES: BugStatus[] = [
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
  platform: Platform;
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
      platform: true,
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
      platform: game.platform,
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
  game: { id: string; name: string; slug: string; platform: Platform; coverColor: string };
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
      game: { select: { id: true, name: true, slug: true, platform: true, coverColor: true } },
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
      game: build.game,
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
  category: string | null;
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
        category: true,
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
        game: { select: { id: true, name: true, slug: true, platform: true, coverColor: true } },
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
  game: { id: string; name: string; slug: string; platform: Platform; coverColor: string };
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
    game: { id: string; name: string; slug: string; platform: Platform; coverColor: string };
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
      game: { select: { id: true, name: true, slug: true, platform: true, coverColor: true } },
      bugs: { select: { severity: true, reportedById: true } },
      testRuns: { select: { testerId: true, testCaseId: true } },
    },
  });

  return buildSessionSummaries(sessions);
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
      game: { select: { id: true, name: true, slug: true, platform: true, coverColor: true } },
      bugs: {
        select: { severity: true, reportedById: true },
      },
      testRuns: { select: { testerId: true, testCaseId: true } },
    },
  });
  if (!session) return null;

  const [summary] = await buildSessionSummaries([session]);

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
      platform: game.platform,
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
  area?: string;
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
      platform: true,
      builds: { select: { version: true }, orderBy: { releasedAt: "desc" } },
    },
  });

  const builds = [...new Set(games.flatMap((g) => g.builds.map((b) => b.version)))];
  const platforms = [...new Set(games.map((g) => g.platform))];

  const [testers, tags] = await Promise.all([
    prisma.tester.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);

  return { builds, platforms, testers, tags };
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
    area,
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
        ...(area ? { area } : {}),
        ...(build ? { build: { version: build } } : {}),
        ...(platform ? { game: { platform } } : {}),
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
                { area: { contains: q } },
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
        area: true,
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
    area: (a, b) => (a.area ?? "").localeCompare(b.area ?? ""),
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
        game: { select: { name: true, slug: true, coverColor: true, platform: true } },
        build: { select: { version: true, branch: true } },
        session: { select: { name: true } },
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
