import { prisma } from "@/lib/db/prisma";
import { QA_DISCIPLINE_ORDER, QADiscipline } from "@/lib/coverage";

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

