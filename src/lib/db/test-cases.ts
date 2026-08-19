import { prisma } from "@/lib/db/prisma";
import type { TestCasePriority, Platform } from "@/generated/prisma/enums";
import { deriveTestCaseStatus, type TestCaseStatus } from "@/lib/test-case";

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
  const [testCase, numberMap] = await Promise.all([
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
            createdBug: { select: { id: true, number: true, title: true } },
          },
        },
      },
    }),
    getTestCaseNumberMap(),
  ]);
  if (!testCase) return null;

  return {
    ...testCase,
    game: { ...testCase.game, platforms: testCase.game.platforms.map((p) => p.platform) },
    number: numberMap.get(testCase.id) ?? 0,
    status: deriveTestCaseStatus(testCase.runs[0]?.result),
    runs: testCase.runs,
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
      createdBug: { select: { id: true, number: true, title: true } },
    },
  });
  if (!run) return null;

  const testCaseNumberMap = await getTestCaseNumberMap();

  return {
    ...run,
    testCase: { ...run.testCase, number: testCaseNumberMap.get(run.testCase.id) ?? 0 },
  };
}

