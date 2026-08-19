import { prisma } from "@/lib/db/prisma";
import type { Platform, BugSeverity, SessionStatus } from "@/generated/prisma/enums";

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

  const [testers, bugs, testRuns] = await Promise.all([
    prisma.tester.findMany({
      where: { id: { in: [...new Set([...session.bugs.map((b) => b.reportedById), ...session.testRuns.map((r) => r.testerId)].filter((x): x is string => !!x))] } },
      select: { id: true, name: true, role: true },
    }),
    prisma.bug.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, title: true, severity: true, status: true },
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
  ]);

  return {
    ...summary,
    testers,
    bugs,
    testRuns,
  };
}

