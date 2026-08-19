import { prisma } from "@/lib/db/prisma";
import type { BugSeverity, Platform } from "@/generated/prisma/enums";
import { SEVERITY_ORDER } from "@/lib/severity";
import { TERMINAL_STATUSES } from "./bugs";
import { getCoverageByDiscipline, type DisciplineCoverage } from "./coverage";

export type AnalyticsBundle = {
  bugsOverTime: { date: string; count: number }[];
  bugsBySeverity: { severity: BugSeverity; count: number }[];
  bugsByArea: { area: string; count: number }[];
  bugsByBuild: { build: string; count: number }[];
  bugsByPlatform: { platform: Platform; count: number }[];
  resolutionTimeBySeverity: { severity: BugSeverity; avgDays: number | null; count: number }[];
  regressionRateTrend: { date: string; rate: number }[];
  testPassRateTrend: { date: string; rate: number | null }[];
  testerActivity: { tester: string; bugsReported: number; testRunsLogged: number; total: number }[];
  coverageByDiscipline: DisciplineCoverage[];
};

// Every chart on /analytics, computed from two real queries (bugs and test
// runs that fall inside [from, to]) plus the resolved-bugs and coverage
// queries each chart actually needs — everything is derived in JS from
// real rows, nothing simulated. Trend charts are cumulative-as-of-each-day
// within the window (same technique as getQualityTrend) so a sparse day
// never reads as a false zero.
export async function getAnalyticsData(gameSlug: string | undefined, from: Date, to: Date): Promise<AnalyticsBundle> {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: { id: true },
  });
  const gameIds = games.map((g) => g.id);

  const [bugsInRange, resolvedBugsInRange, testRunsInRange, testers, coverageByDiscipline] = await Promise.all([
    prisma.bug.findMany({
      where: { gameId: { in: gameIds }, createdAt: { gte: from, lte: to } },
      select: {
        createdAt: true,
        severity: true,
        platform: true,
        isRegression: true,
        reportedById: true,
        area: { select: { name: true } },
        build: { select: { version: true } },
        game: { select: { name: true } },
      },
    }),
    prisma.bug.findMany({
      where: { gameId: { in: gameIds }, status: { in: TERMINAL_STATUSES }, updatedAt: { gte: from, lte: to } },
      select: { severity: true, createdAt: true, updatedAt: true },
    }),
    prisma.testRun.findMany({
      where: { testCase: { gameId: { in: gameIds } }, runAt: { gte: from, lte: to } },
      select: { runAt: true, result: true, testerId: true },
    }),
    prisma.tester.findMany({ select: { id: true, name: true } }),
    getCoverageByDiscipline(gameSlug),
  ]);

  const dayMs = 86_400_000;
  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);

  const bugsOverTime: { date: string; count: number }[] = [];
  const regressionRateTrend: { date: string; rate: number }[] = [];
  const testPassRateTrend: { date: string; rate: number | null }[] = [];

  for (let i = 0; i < totalDays; i++) {
    const dayStart = new Date(from.getTime() + i * dayMs);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const dateKey = dayStart.toISOString().slice(0, 10);

    const thatDay = bugsInRange.filter((b) => b.createdAt >= dayStart && b.createdAt < dayEnd);
    bugsOverTime.push({ date: dateKey, count: thatDay.length });

    // Cumulative within this window — every bug/run so far, through this day.
    const bugsSoFar = bugsInRange.filter((b) => b.createdAt < dayEnd);
    regressionRateTrend.push({
      date: dateKey,
      rate: bugsSoFar.length > 0 ? Math.round((bugsSoFar.filter((b) => b.isRegression).length / bugsSoFar.length) * 1000) / 10 : 0,
    });

    const runsSoFar = testRunsInRange.filter((r) => r.runAt < dayEnd);
    const pass = runsSoFar.filter((r) => r.result === "PASS").length;
    const fail = runsSoFar.filter((r) => r.result === "FAIL").length;
    testPassRateTrend.push({ date: dateKey, rate: pass + fail > 0 ? Math.round((pass / (pass + fail)) * 1000) / 10 : null });
  }

  const bySeverity = new Map<BugSeverity, number>();
  for (const b of bugsInRange) bySeverity.set(b.severity, (bySeverity.get(b.severity) ?? 0) + 1);
  const bugsBySeverity = SEVERITY_ORDER.map((severity) => ({ severity, count: bySeverity.get(severity) ?? 0 }));

  const byArea = new Map<string, number>();
  for (const b of bugsInRange) {
    const name = b.area?.name ?? "Unassigned";
    byArea.set(name, (byArea.get(name) ?? 0) + 1);
  }
  const bugsByArea = [...byArea.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Build version strings repeat across games (every game seeds its own
  // "0.9.14-beta"), so under "All Games" the label needs the game name too
  // or two unrelated builds silently merge into one bar.
  const byBuild = new Map<string, number>();
  for (const b of bugsInRange) {
    const label = showAll ? `${b.game.name} ${b.build.version}` : b.build.version;
    byBuild.set(label, (byBuild.get(label) ?? 0) + 1);
  }
  const bugsByBuild = [...byBuild.entries()]
    .map(([build, count]) => ({ build, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const byPlatform = new Map<Platform, number>();
  for (const b of bugsInRange) byPlatform.set(b.platform, (byPlatform.get(b.platform) ?? 0) + 1);
  const bugsByPlatform = [...byPlatform.entries()].map(([platform, count]) => ({ platform, count }));

  const resolutionBySeverity = new Map<BugSeverity, { totalDays: number; count: number }>();
  for (const b of resolvedBugsInRange) {
    const days = (b.updatedAt.getTime() - b.createdAt.getTime()) / dayMs;
    const bucket = resolutionBySeverity.get(b.severity) ?? { totalDays: 0, count: 0 };
    bucket.totalDays += days;
    bucket.count += 1;
    resolutionBySeverity.set(b.severity, bucket);
  }
  const resolutionTimeBySeverity = SEVERITY_ORDER.map((severity) => {
    const bucket = resolutionBySeverity.get(severity);
    return {
      severity,
      count: bucket?.count ?? 0,
      avgDays: bucket && bucket.count > 0 ? Math.round((bucket.totalDays / bucket.count) * 10) / 10 : null,
    };
  });

  const testerNameById = new Map(testers.map((t) => [t.id, t.name]));
  const activityById = new Map<string, { bugsReported: number; testRunsLogged: number }>();
  for (const b of bugsInRange) {
    if (!b.reportedById) continue;
    const bucket = activityById.get(b.reportedById) ?? { bugsReported: 0, testRunsLogged: 0 };
    bucket.bugsReported += 1;
    activityById.set(b.reportedById, bucket);
  }
  for (const r of testRunsInRange) {
    if (!r.testerId) continue;
    const bucket = activityById.get(r.testerId) ?? { bugsReported: 0, testRunsLogged: 0 };
    bucket.testRunsLogged += 1;
    activityById.set(r.testerId, bucket);
  }
  const testerActivity = [...activityById.entries()]
    .map(([id, activity]) => ({
      tester: testerNameById.get(id) ?? "Unknown",
      ...activity,
      total: activity.bugsReported + activity.testRunsLogged,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    bugsOverTime,
    bugsBySeverity,
    bugsByArea,
    bugsByBuild,
    bugsByPlatform,
    resolutionTimeBySeverity,
    regressionRateTrend,
    testPassRateTrend,
    testerActivity,
    coverageByDiscipline,
  };
}

export type LifecycleStageMetric = { avgHours: number | null; sampleCount: number };

export type BugLifecycleMetrics = {
  timeToConfirm: LifecycleStageMetric;
  timeToFix: LifecycleStageMetric;
  timeToVerify: LifecycleStageMetric;
  totalResolutionTime: LifecycleStageMetric;
};

// Stage-to-stage durations, reconstructed from each bug's own real
// STATUS_CHANGED activity history rather than guessed from createdAt/
// updatedAt alone — updatedAt only ever reflects the *last* edit, so it
// can't tell "confirmed" apart from "fixed" apart from "verified". A bug
// that skipped a stage (e.g. straight to Rejected) simply contributes no
// sample to that stage's average, rather than a fabricated zero.
export async function getBugLifecycleMetrics(
  gameSlug: string | undefined,
  from: Date,
  to: Date
): Promise<BugLifecycleMetrics> {
  const showAll = gameSlug === "all";
  const games = await prisma.game.findMany({
    where: !showAll && gameSlug ? { slug: gameSlug } : undefined,
    orderBy: { createdAt: "asc" },
    take: !showAll && !gameSlug ? 1 : undefined,
    select: { id: true },
  });
  const gameIds = games.map((g) => g.id);

  const bugs = await prisma.bug.findMany({
    where: { gameId: { in: gameIds }, createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true,
      activity: {
        where: { type: "STATUS_CHANGED" },
        orderBy: { createdAt: "asc" },
        select: { toValue: true, createdAt: true },
      },
    },
  });

  const hourMs = 3_600_000;
  const confirmDurations: number[] = [];
  const fixDurations: number[] = [];
  const verifyDurations: number[] = [];
  const totalDurations: number[] = [];

  for (const bug of bugs) {
    const firstReach = (status: string) => bug.activity.find((e) => e.toValue === status)?.createdAt ?? null;

    const confirmedAt = firstReach("CONFIRMED");
    const fixedAt = firstReach("FIXED");
    const verifiedAt = firstReach("VERIFIED");
    const closedAt = firstReach("CLOSED");

    if (confirmedAt) confirmDurations.push((confirmedAt.getTime() - bug.createdAt.getTime()) / hourMs);
    if (confirmedAt && fixedAt && fixedAt.getTime() >= confirmedAt.getTime()) {
      fixDurations.push((fixedAt.getTime() - confirmedAt.getTime()) / hourMs);
    }
    if (fixedAt && verifiedAt && verifiedAt.getTime() >= fixedAt.getTime()) {
      verifyDurations.push((verifiedAt.getTime() - fixedAt.getTime()) / hourMs);
    }
    if (closedAt) totalDurations.push((closedAt.getTime() - bug.createdAt.getTime()) / hourMs);
  }

  const summarize = (samples: number[]): LifecycleStageMetric => ({
    avgHours: samples.length > 0 ? Math.round((samples.reduce((sum, v) => sum + v, 0) / samples.length) * 10) / 10 : null,
    sampleCount: samples.length,
  });

  return {
    timeToConfirm: summarize(confirmDurations),
    timeToFix: summarize(fixDurations),
    timeToVerify: summarize(verifyDurations),
    totalResolutionTime: summarize(totalDurations),
  };
}

