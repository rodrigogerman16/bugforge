import { prisma } from "@/lib/db/prisma";
import type { QualityGateMetric, BuildStatus, BugSeverity, BugStatus } from "@/generated/prisma/enums";
import { SEVERITY_ORDER } from "@/lib/severity";
import { OPEN_STATUSES } from "./bugs";

// The configured release requirements — the actual gate, editable on the
// Settings page. A fixed order (matching the enum's declaration order)
// keeps the settings list and every readiness checklist consistent.
const QUALITY_GATE_ORDER: QualityGateMetric[] = [
  "CRITICAL_BUGS",
  "TEST_PASS_RATE",
  "REGRESSION_RATE",
  "COVERAGE",
  "PERFORMANCE",
];

export async function getQualityGates() {
  const gates = await prisma.qualityGate.findMany();
  return gates.sort((a, b) => QUALITY_GATE_ORDER.indexOf(a.metric) - QUALITY_GATE_ORDER.indexOf(b.metric));
}

// Games + their real builds, for the report-generation pickers on /reports.
export async function getGamesForReports() {
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

export type BuildQaReportData = {
  buildId: string;
  version: string;
  status: BuildStatus;
  releasedAt: Date;
  branch: string;
  notes: string | null;
  gameName: string;
  gameSlug: string;
  bugsBySeverity: { severity: BugSeverity; total: number; open: number }[];
  totalBugs: number;
  openBugs: number;
  regressionCount: number;
  testPassRate: number | null;
  topOpenBugs: { number: number; title: string; severity: BugSeverity; status: BugStatus }[];
};

// Everything the Build QA report needs about one build — real per-severity
// bug counts (total and still-open), test pass rate, and the highest-severity
// open bugs, all scoped to that build alone.
export async function getBuildQaReportData(buildId: string): Promise<BuildQaReportData | null> {
  const build = await prisma.build.findUnique({
    where: { id: buildId },
    select: {
      version: true,
      status: true,
      releasedAt: true,
      branch: true,
      notes: true,
      game: { select: { name: true, slug: true } },
    },
  });
  if (!build) return null;

  const bugs = await prisma.bug.findMany({
    where: { buildId },
    select: { id: true, number: true, title: true, severity: true, status: true, isRegression: true },
  });

  const bySeverity = new Map<BugSeverity, { total: number; open: number }>();
  for (const severity of SEVERITY_ORDER) bySeverity.set(severity, { total: 0, open: 0 });
  for (const bug of bugs) {
    const bucket = bySeverity.get(bug.severity)!;
    bucket.total += 1;
    if (OPEN_STATUSES.includes(bug.status)) bucket.open += 1;
  }

  const openBugs = bugs.filter((b) => OPEN_STATUSES.includes(b.status));
  const topOpenBugs = [...openBugs]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, 10)
    .map((b) => ({ number: b.number, title: b.title, severity: b.severity, status: b.status }));

  const testRuns = await prisma.testRun.findMany({
    where: { session: { buildId } },
    select: { result: true },
  });
  const pass = testRuns.filter((r) => r.result === "PASS").length;
  const fail = testRuns.filter((r) => r.result === "FAIL").length;

  return {
    buildId,
    version: build.version,
    status: build.status,
    releasedAt: build.releasedAt,
    branch: build.branch,
    notes: build.notes,
    gameName: build.game.name,
    gameSlug: build.game.slug,
    bugsBySeverity: SEVERITY_ORDER.map((severity) => ({ severity, ...bySeverity.get(severity)! })),
    totalBugs: bugs.length,
    openBugs: openBugs.length,
    regressionCount: bugs.filter((b) => b.isRegression).length,
    testPassRate: pass + fail > 0 ? Math.round((pass / (pass + fail)) * 1000) / 10 : null,
    topOpenBugs,
  };
}

export type RegressionReportEntry = {
  regressionBugId: string;
  regressionBugNumber: number;
  title: string;
  severity: BugSeverity;
  areaName: string | null;
  gameName: string;
  reproducedBuild: string;
  originalBugId: string;
  originalBugNumber: number;
  originalFixedBuild: string;
  createdAt: Date;
};

export type RegressionReportData = {
  entries: RegressionReportEntry[];
  byArea: { area: string; count: number }[];
};

// Every confirmed regression (a real REGRESSION_OF relationship, not a
// freestanding flag) whose regression bug was filed within [from, to].
export async function getRegressionReportData(
  gameSlug: string | undefined,
  from: Date,
  to: Date
): Promise<RegressionReportData> {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: { id: true },
  });
  const gameIds = games.map((g) => g.id);

  const relationships = await prisma.bugRelationship.findMany({
    where: {
      type: "REGRESSION_OF",
      sourceBug: { gameId: { in: gameIds }, createdAt: { gte: from, lte: to } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      sourceBug: {
        select: {
          id: true,
          number: true,
          title: true,
          severity: true,
          createdAt: true,
          area: { select: { name: true } },
          build: { select: { version: true } },
          game: { select: { name: true } },
        },
      },
      targetBug: { select: { id: true, number: true, build: { select: { version: true } } } },
    },
  });

  const entries: RegressionReportEntry[] = relationships.map((r) => ({
    regressionBugId: r.sourceBug.id,
    regressionBugNumber: r.sourceBug.number,
    title: r.sourceBug.title,
    severity: r.sourceBug.severity,
    areaName: r.sourceBug.area?.name ?? null,
    gameName: r.sourceBug.game.name,
    reproducedBuild: r.sourceBug.build.version,
    originalBugId: r.targetBug.id,
    originalBugNumber: r.targetBug.number,
    originalFixedBuild: r.targetBug.build.version,
    createdAt: r.sourceBug.createdAt,
  }));

  const byArea = new Map<string, number>();
  for (const e of entries) {
    const key = e.areaName ?? "Unassigned";
    byArea.set(key, (byArea.get(key) ?? 0) + 1);
  }

  return {
    entries,
    byArea: [...byArea.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
  };
}

