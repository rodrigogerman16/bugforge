import type { NextRequest } from "next/server";
import {
  getBuildQaReportData,
  getBuildReadinessData,
  getQualityGates,
  getDashboardData,
  getAnalyticsData,
  getBugLifecycleMetrics,
  getRegressionReportData,
  getCoverageByDiscipline,
  getShellGames,
} from "@/lib/db";
import { computeReleaseReadiness } from "@/lib/release-readiness";
import { resolveAnalyticsRange } from "@/lib/utils/analytics-range";
import { toSectionedCsv, csvResponse, jsonResponse } from "@/lib/utils/export";
import { SEVERITY_META } from "@/lib/severity";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { BUILD_STATUS_META } from "@/lib/build-status";
import { QA_DISCIPLINE_META } from "@/lib/coverage";

async function scopeLabel(gameSlug: string | undefined) {
  if (!gameSlug || gameSlug === "all") return "All Games";
  const games = await getShellGames();
  return games.find((g) => g.slug === gameSlug)?.name ?? "All Games";
}

// The export mirrors exactly what the on-screen report shows — same data
// functions, same filters — just serialized as a downloadable file instead
// of HTML. CSV is a sectioned file (summary + each table), JSON is the raw
// structured data.
export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const search = request.nextUrl.searchParams;
  const format = search.get("format") === "json" ? "json" : "csv";

  if (type === "build-qa") {
    const buildId = search.get("build");
    const data = buildId ? await getBuildQaReportData(buildId) : null;
    if (!data) return new Response("Unknown or missing build", { status: 404 });

    if (format === "json") return jsonResponse("bugforge-build-qa-report.json", data);

    const csv = toSectionedCsv([
      {
        title: "Summary",
        columns: ["Metric", "Value"],
        rows: [
          ["Game", data.gameName],
          ["Build", data.version],
          ["Status", BUILD_STATUS_META[data.status].label],
          ["Released", data.releasedAt.toISOString()],
          ["Branch", data.branch],
          ["Total Bugs", data.totalBugs],
          ["Open Bugs", data.openBugs],
          ["Regressions", data.regressionCount],
          ["Test Pass Rate", data.testPassRate === null ? "N/A" : `${data.testPassRate}%`],
        ],
      },
      {
        title: "Bugs by Severity",
        columns: ["Severity", "Open", "Total"],
        rows: data.bugsBySeverity.map((s) => [SEVERITY_META[s.severity].label, s.open, s.total]),
      },
      {
        title: "Top Open Issues",
        columns: ["Bug", "Title", "Severity", "Status"],
        rows: data.topOpenBugs.map((b) => [`BUG-${b.number}`, b.title, SEVERITY_META[b.severity].label, BUG_STATUS_META[b.status].label]),
      },
    ]);
    return csvResponse("bugforge-build-qa-report.csv", csv);
  }

  if (type === "release-readiness") {
    const buildId = search.get("build");
    if (!buildId) return new Response("Missing build", { status: 400 });
    const [data, gates] = await Promise.all([getBuildReadinessData(buildId), getQualityGates()]);
    if (!data) return new Response("Unknown build", { status: 404 });

    const readiness = computeReleaseReadiness(
      {
        criticalBugs: data.criticalBugs,
        testPassRate: data.testPassRate,
        regressionRate: data.regressionRate,
        coverage: data.coverage,
        performance: data.performance,
      },
      gates
    );

    if (format === "json") return jsonResponse("bugforge-release-readiness-report.json", { ...data, readiness });

    const csv = toSectionedCsv([
      {
        title: "Verdict",
        columns: ["Metric", "Value"],
        rows: [
          ["Game", data.gameName],
          ["Build", data.version],
          ["Score", `${readiness.score} / 100`],
          ["Ready", readiness.ready ? "Yes" : "No"],
        ],
      },
      {
        title: "Quality Gates",
        columns: ["Gate", "Requirement", "Value", "Passed"],
        rows: readiness.gates.map((g) => [
          g.label,
          g.requirementLabel,
          g.value === null ? "N/A" : g.value,
          g.passed ? "Yes" : "No",
        ]),
      },
      {
        title: "Blocking Issues",
        columns: ["Issue"],
        rows: readiness.blockingIssues.length > 0 ? readiness.blockingIssues.map((issue) => [issue]) : [["None"]],
      },
      {
        title: "Raw Metrics",
        columns: ["Metric", "Value"],
        rows: [
          ["Critical Bugs", data.criticalBugs],
          ["Test Pass Rate", data.testPassRate === null ? "N/A" : `${data.testPassRate}%`],
          ["Regression Rate", `${data.regressionRate}%`],
          ["Coverage", data.coverage === null ? "N/A" : `${data.coverage}%`],
          ["Performance", data.performance === null ? "N/A" : `${data.performance}%`],
        ],
      },
    ]);
    return csvResponse("bugforge-release-readiness-report.csv", csv);
  }

  if (type === "weekly-qa") {
    const gameSlug = search.get("game") ?? undefined;
    const { from, to } = resolveAnalyticsRange({ range: "7" });
    const [{ stats }, analytics, lifecycle, scope] = await Promise.all([
      getDashboardData(gameSlug),
      getAnalyticsData(gameSlug, from, to),
      getBugLifecycleMetrics(gameSlug, from, to),
      scopeLabel(gameSlug),
    ]);

    if (format === "json") return jsonResponse("bugforge-weekly-qa-report.json", { scope, from, to, stats, lifecycle, analytics });

    const formatHours = (m: { avgHours: number | null }) => (m.avgHours === null ? "N/A" : `${m.avgHours}h`);
    const csv = toSectionedCsv([
      {
        title: `Weekly QA Report — ${scope}`,
        columns: ["Metric", "Value"],
        rows: [
          ["Discovered", stats.discoveredThisWeek],
          ["Fixed", stats.fixedThisWeek],
          ["Regression Rate", `${stats.regressionRate}%`],
          ["Quality Score", `${stats.aggregateQualityScore} / 100`],
          ["Open Bugs", stats.totalOpenBugs],
          ["Critical Open", stats.criticalBugsOpen],
          ["Active Sessions", stats.activeSessions],
          ["Test Pass Rate", stats.testPassRate === null ? "N/A" : `${stats.testPassRate}%`],
        ],
      },
      {
        title: "Bug Lifecycle This Week",
        columns: ["Stage", "Avg Duration", "Sample Count"],
        rows: [
          ["Time to Confirm", formatHours(lifecycle.timeToConfirm), lifecycle.timeToConfirm.sampleCount],
          ["Time to Fix", formatHours(lifecycle.timeToFix), lifecycle.timeToFix.sampleCount],
          ["Time to Verify", formatHours(lifecycle.timeToVerify), lifecycle.timeToVerify.sampleCount],
          ["Total Resolution", formatHours(lifecycle.totalResolutionTime), lifecycle.totalResolutionTime.sampleCount],
        ],
      },
      {
        title: "New Bugs by Severity",
        columns: ["Severity", "Count"],
        rows: analytics.bugsBySeverity.map((s) => [SEVERITY_META[s.severity].label, s.count]),
      },
      {
        title: "Top Tester Activity",
        columns: ["Tester", "Bugs Reported", "Test Runs Logged"],
        rows: analytics.testerActivity.slice(0, 6).map((t) => [t.tester, t.bugsReported, t.testRunsLogged]),
      },
    ]);
    return csvResponse("bugforge-weekly-qa-report.csv", csv);
  }

  if (type === "regression") {
    const gameSlug = search.get("game") ?? undefined;
    const { from, to } = resolveAnalyticsRange({ range: search.get("range") ?? undefined });
    const [data, scope] = await Promise.all([getRegressionReportData(gameSlug, from, to), scopeLabel(gameSlug)]);

    if (format === "json") return jsonResponse("bugforge-regression-report.json", { scope, from, to, ...data });

    const csv = toSectionedCsv([
      {
        title: `Regression Report — ${scope}`,
        columns: ["Metric", "Value"],
        rows: [
          ["Confirmed Regressions", data.entries.length],
          ["Areas Affected", data.byArea.length],
        ],
      },
      {
        title: "Regressions by Area",
        columns: ["Area", "Count"],
        rows: data.byArea.map((a) => [a.area, a.count]),
      },
      {
        title: "Regressions",
        columns: ["Bug", "Title", "Severity", "Game", "Area", "Reproduced In", "Original Bug", "Originally Fixed In", "Filed At"],
        rows: data.entries.map((e) => [
          `BUG-${e.regressionBugNumber}`,
          e.title,
          SEVERITY_META[e.severity].label,
          e.gameName,
          e.areaName ?? "Unassigned",
          e.reproducedBuild,
          `BUG-${e.originalBugNumber}`,
          e.originalFixedBuild,
          e.createdAt.toISOString(),
        ]),
      },
    ]);
    return csvResponse("bugforge-regression-report.csv", csv);
  }

  if (type === "test-coverage") {
    const gameSlug = search.get("game") ?? undefined;
    const [coverage, scope] = await Promise.all([getCoverageByDiscipline(gameSlug), scopeLabel(gameSlug)]);
    const disciplinesWithData = coverage.filter((c) => c.totalTestCases > 0);
    const overallExecuted = disciplinesWithData.reduce((sum, c) => sum + c.executedTestCases, 0);
    const overallTotal = disciplinesWithData.reduce((sum, c) => sum + c.totalTestCases, 0);
    const overallCoverage = overallTotal > 0 ? Math.round((overallExecuted / overallTotal) * 1000) / 10 : null;

    if (format === "json") return jsonResponse("bugforge-test-coverage-report.json", { scope, overallCoverage, overallExecuted, overallTotal, coverage });

    const csv = toSectionedCsv([
      {
        title: `Test Coverage Report — ${scope}`,
        columns: ["Metric", "Value"],
        rows: [
          ["Overall Coverage", overallCoverage === null ? "N/A" : `${overallCoverage}%`],
          ["Test Cases Executed", `${overallExecuted} / ${overallTotal}`],
        ],
      },
      {
        title: "Coverage by Discipline",
        columns: ["Discipline", "Executed", "Total", "Coverage %"],
        rows: coverage.map((c) => [
          QA_DISCIPLINE_META[c.discipline].label,
          c.executedTestCases,
          c.totalTestCases,
          c.coveragePercent === null ? "N/A" : c.coveragePercent,
        ]),
      },
    ]);
    return csvResponse("bugforge-test-coverage-report.csv", csv);
  }

  return new Response("Unknown report type", { status: 404 });
}
