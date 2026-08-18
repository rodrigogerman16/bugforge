import type { NextRequest } from "next/server";
import { getBuilds } from "@/lib/data";
import { toCsv, csvResponse, jsonResponse } from "@/lib/export";
import { BUILD_STATUS_META } from "@/lib/build-status";
import { formatPlatformList } from "@/lib/platform";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "json" ? "json" : "csv";
  const builds = await getBuilds({ gameSlug: params.get("game") ?? undefined });

  if (format === "json") {
    return jsonResponse(
      "bugforge-builds.json",
      builds.map((b) => ({
        version: b.version,
        game: b.game.name,
        status: BUILD_STATUS_META[b.status].label,
        branch: b.branch,
        releasedAt: b.releasedAt.toISOString(),
        platforms: b.game.platforms,
        totalBugs: b.bugTotal,
        criticalOpenBugs: b.criticalOpenCount,
        highOpenBugs: b.highOpenCount,
        regressionCount: b.regressionCount,
        qualityScore: b.qualityScore,
        testPassRate: b.testPassRate,
        notes: b.notes,
      }))
    );
  }

  const csv = toCsv(builds, [
    { label: "Version", value: (b) => b.version },
    { label: "Game", value: (b) => b.game.name },
    { label: "Status", value: (b) => BUILD_STATUS_META[b.status].label },
    { label: "Branch", value: (b) => b.branch },
    { label: "Released At", value: (b) => b.releasedAt.toISOString() },
    { label: "Platforms", value: (b) => formatPlatformList(b.game.platforms) },
    { label: "Total Bugs", value: (b) => b.bugTotal },
    { label: "Critical Open", value: (b) => b.criticalOpenCount },
    { label: "High Open", value: (b) => b.highOpenCount },
    { label: "Regressions", value: (b) => b.regressionCount },
    { label: "Quality Score", value: (b) => b.qualityScore },
    { label: "Test Pass Rate", value: (b) => (b.testPassRate === null ? "" : b.testPassRate) },
  ]);
  return csvResponse("bugforge-builds.csv", csv);
}
