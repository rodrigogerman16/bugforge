import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { BugStatus, type BugSeverity, type BugPriority, type Platform, type BuildStatus } from "@/generated/prisma/enums";
import { resolveRelationships } from "@/lib/relationships";
import type { QADiscipline } from "@/lib/coverage";
import { getTestCaseNumberMap } from "./test-cases";

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

// A bug counts as "closed" (no longer open) once it reaches one of these
// statuses — the inverse of OPEN_STATUSES above.
export const TERMINAL_STATUSES: BugStatus[] = [
  BugStatus.VERIFIED,
  BugStatus.CLOSED,
  BugStatus.REJECTED,
  BugStatus.DUPLICATE,
];

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
  /** Only bugs flagged as a regression of an earlier fixed bug — see isRegression. */
  regression?: boolean;
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

export type TagSummary = { id: string; name: string; color: string };

export async function getTags(): Promise<TagSummary[]> {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
}

// Every bug's BUG-N ticket number is a real, indexed, unique column
// (Bug.number) assigned once at creation from the "bugNumber" Counter row —
// see getNextBugNumber below. This atomically increments-and-returns in one
// statement, so two concurrent bug creations can never collide on the same
// number the way a naive "count existing rows + 1" would under concurrency.
export async function getNextBugNumber(): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: bigint | number }[]>`
    UPDATE "Counter" SET "value" = "value" + 1 WHERE "id" = 'bugNumber' RETURNING "value"
  `;
  return Number(rows[0].value);
}

async function resolveGameIds(gameSlug: string | undefined): Promise<string[]> {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: { id: true },
  });
  return games.map((g) => g.id);
}

// Shared by getBugList (which paginates) and getBugsForExport (which
// doesn't) — same filter logic, single source of truth for what "matches
// the current bug list filters" means. Every field here maps onto an
// indexed column (see the @@index list on the Bug model), so this `where`
// runs as an index scan even against a 100,000+ row table, never a full
// table scan.
export function buildBugWhere(
  options: Omit<BugListOptions, "page" | "sort" | "dir">,
  gameIds: string[]
): Prisma.BugWhereInput {
  const { severity, priority, status, areaId, build, platform, reporterId, assigneeId, dateFrom, dateTo, tagId, q, regression } = options;
  return {
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
    ...(regression ? { isRegression: true } : {}),
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
  };
}

// Translates the bug table's public sort field into a real Prisma orderBy —
// pushed down to the database instead of loading every matching row into
// Node to sort in memory. Severity/priority/status sort by their Rank
// mirror column (see severityRank on the Bug model): that column stores a
// 0-based position in this app's domain order (0 = Blocker/P0/New), the
// *inverse* of what "desc" should show first, so the requested direction is
// flipped for just these three — matching the "desc surfaces the most
// severe/highest-priority/furthest-along bug first" behavior this table has
// always had. Every branch appends `number` as a tiebreaker: without one,
// rows tied on the sort column could shuffle between pages of a skip/take
// query, which the old whole-array-sorted-once approach never risked.
export function buildBugOrderBy(sort: BugSortField, dir: "asc" | "desc"): Prisma.BugOrderByWithRelationInput[] {
  const rankDir = dir === "desc" ? "asc" : "desc";
  switch (sort) {
    case "number":
      return [{ number: dir }];
    case "title":
      return [{ title: dir }, { number: "desc" }];
    case "severity":
      return [{ severityRank: rankDir }, { number: "desc" }];
    case "priority":
      return [{ priorityRank: rankDir }, { number: "desc" }];
    case "status":
      return [{ statusRank: rankDir }, { number: "desc" }];
    case "area":
      return [{ area: { name: dir } }, { number: "desc" }];
    case "build":
      return [{ build: { version: dir } }, { number: "desc" }];
    case "reporter":
      return [{ reportedBy: { name: dir } }, { number: "desc" }];
    case "assignee":
      return [{ assignedTo: { name: dir } }, { number: "desc" }];
    case "updatedAt":
      return [{ updatedAt: dir }, { number: "desc" }];
  }
}

const BUG_LIST_SELECT = {
  id: true,
  number: true,
  title: true,
  severity: true,
  priority: true,
  status: true,
  isRegression: true,
  platform: true,
  area: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  game: { select: { name: true, slug: true, coverColor: true } },
  build: { select: { version: true } },
  reportedBy: { select: { name: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.BugSelect;

// Real server-side pagination: the total count and the one requested page
// are two indexed queries, not "load every matching bug, then slice it in
// JS" — the page size never grows even if the filtered set is 100,000 rows.
export async function getBugList(options: BugListOptions) {
  const { page = 1, sort = "updatedAt", dir = "desc" } = options;
  const gameIds = await resolveGameIds(options.gameSlug);
  const where = buildBugWhere(options, gameIds);
  const orderBy = buildBugOrderBy(sort, dir);

  const totalCount = await prisma.bug.count({ where });
  const pageCount = Math.max(1, Math.ceil(totalCount / BUG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);

  const bugs = await prisma.bug.findMany({
    where,
    orderBy,
    select: BUG_LIST_SELECT,
    skip: (safePage - 1) * BUG_PAGE_SIZE,
    take: BUG_PAGE_SIZE,
  });

  return { bugs, totalCount, page: safePage, pageCount };
}

export type QaWorkQueue = {
  readyForQaCount: number;
  assignedToMeCount: number;
  regressionCount: number;
  reportedByMeOpenCount: number;
};

// The four counts a QA Tester/Lead actually needs to answer "what needs my
// attention today" — see the dashboard's QaWorkQueue card. Each count maps
// directly onto a bugs-list filter (see buildBugWhere/hrefFor* below) so
// clicking through never lands on an unfiltered list the tester then has
// to filter themselves.
export async function getQaWorkQueue(gameSlug: string | undefined, userId: string): Promise<QaWorkQueue> {
  const gameIds = await resolveGameIds(gameSlug);
  const baseWhere: Prisma.BugWhereInput = { gameId: { in: gameIds } };

  const [readyForQaCount, assignedToMeCount, regressionCount, reportedByMeOpenCount] = await Promise.all([
    prisma.bug.count({ where: { ...baseWhere, status: BugStatus.READY_FOR_QA } }),
    prisma.bug.count({ where: { ...baseWhere, assignedToId: userId, status: { in: OPEN_STATUSES } } }),
    prisma.bug.count({ where: { ...baseWhere, isRegression: true, status: { in: OPEN_STATUSES } } }),
    prisma.bug.count({ where: { ...baseWhere, reportedById: userId, status: { in: OPEN_STATUSES } } }),
  ]);

  return { readyForQaCount, assignedToMeCount, regressionCount, reportedByMeOpenCount };
}

// The unpaginated counterpart of getBugList, for exporting the full set of
// bugs matching the current filters (CSV/JSON) rather than one page of
// them — the filtering and sorting still happen in the database, this just
// omits skip/take because "every matching row" is the actual point of an
// export.
export async function getBugsForExport(options: Omit<BugListOptions, "page">) {
  const { sort = "updatedAt", dir = "desc" } = options;
  const gameIds = await resolveGameIds(options.gameSlug);
  const where = buildBugWhere(options, gameIds);
  const orderBy = buildBugOrderBy(sort, dir);
  return prisma.bug.findMany({ where, orderBy, select: BUG_LIST_SELECT });
}

// Wrapped in React's cache() so a request that calls this twice — the bug
// detail page and its generateMetadata both need it — hits the database
// once, not twice, for the same id within the same request.
export const getBugDetail = cache(async (id: string) => {
  const bug = await prisma.bug.findUnique({
    where: { id },
    include: {
      game: { select: { name: true, slug: true, coverColor: true } },
      build: { select: { version: true, branch: true } },
      fixedInBuild: { select: { id: true, version: true } },
      verifiedInBuild: { select: { id: true, version: true } },
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
  });

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

  return { ...bug, originatingTestCase };
});

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
  const rows = await prisma.bugRelationship.findMany({
    where: { OR: [{ sourceBugId: bugId }, { targetBugId: bugId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sourceBug: { select: { id: true, number: true, title: true, status: true } },
      targetBug: { select: { id: true, number: true, title: true, status: true } },
    },
  });

  return resolveRelationships(bugId, rows);
}

export async function getRegressionInfo(bugId: string) {
  const relationship = await prisma.bugRelationship.findFirst({
    where: { sourceBugId: bugId, type: "REGRESSION_OF" },
    orderBy: { createdAt: "asc" },
    include: {
      sourceBug: { select: { build: { select: { version: true } } } },
      targetBug: {
        select: {
          id: true,
          number: true,
          title: true,
          build: { select: { version: true } },
          fixedInBuild: { select: { version: true } },
          verifiedInBuild: { select: { version: true } },
        },
      },
    },
  });
  if (!relationship) return null;

  return {
    originalBugId: relationship.targetBug.id,
    originalBugTitle: relationship.targetBug.title,
    originalBugNumber: relationship.targetBug.number,
    // Falls back to the build the original bug was reported against for
    // bugs fixed before fixedInBuild existed — everything reported since
    // has a real, explicit "fixed in" build instead of this approximation.
    previouslyFixedBuild: relationship.targetBug.fixedInBuild?.version ?? relationship.targetBug.build.version,
    verifiedBuild: relationship.targetBug.verifiedInBuild?.version ?? null,
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
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: {
      id: true,
      number: true,
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
  });
  if (!bug) return null;

  return {
    id: bug.id,
    number: bug.number,
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
  excludeBugId?: string
): Promise<DuplicateCandidateBug[]> {
  return prisma.bug.findMany({
    where: {
      gameId,
      ...(excludeBugId ? { id: { not: excludeBugId } } : {}),
      status: { not: "DUPLICATE" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, title: true, description: true, status: true, severity: true },
  });
}

export type AreaRiskContext = { openBugsInArea: number; regressionCountInArea: number };

// The two "is this area historically unstable" signals regression-risk and
// priority heuristics need — how many other open bugs and confirmed
// regressions this specific area already has in this game.
export async function getAreaRiskContext(
  gameId: string,
  areaId: string | null,
  // Omitted for a bug that doesn't exist yet (see analyzeBugDraft) — there's
  // no real id to exclude, and every other open bug in the area is a
  // genuine signal either way.
  excludeBugId?: string
): Promise<AreaRiskContext> {
  if (!areaId) return { openBugsInArea: 0, regressionCountInArea: 0 };

  const [openBugsInArea, regressionCountInArea] = await Promise.all([
    prisma.bug.count({
      where: {
        gameId,
        areaId,
        ...(excludeBugId ? { id: { not: excludeBugId } } : {}),
        status: { in: OPEN_STATUSES },
      },
    }),
    prisma.bugRelationship.count({
      where: { type: "REGRESSION_OF", sourceBug: { gameId, areaId } },
    }),
  ]);
  return { openBugsInArea, regressionCountInArea };
}

