import { prisma } from "@/lib/prisma";
import { BugStatus, type BugPriority, type BugSeverity, type Platform } from "@/generated/prisma/enums";
import { emptySeverityCounts, SEVERITY_ORDER, type SeverityCounts } from "@/lib/severity";
import { PRIORITY_ORDER } from "@/lib/priority";
import { BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";
import { computeQualityScore, qualityBand, type QualityBand } from "@/lib/quality-score";
import { formatReleaseDate } from "@/lib/utils";
import type { TrendRangeDays } from "@/lib/trend-range";

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
  q?: string;
  sort?: BugSortField;
  dir?: "asc" | "desc";
  page?: number;
};

// Every bug gets a stable, human-friendly ticket number (BUG-1, BUG-2, …)
// derived from its creation order across the whole database — not stored,
// since it's fully determined by createdAt and cheap to recompute for the
// small volumes this app deals with, and it stays stable across sorting
// because it's assigned before any display sort/filter is applied.
async function getBugNumberMap(): Promise<Map<string, number>> {
  const allBugs = await prisma.bug.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return new Map(allBugs.map((b, i) => [b.id, i + 1]));
}

export async function getBugList(options: BugListOptions) {
  const { gameSlug, severity, priority, status, area, q, page = 1 } = options;
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
