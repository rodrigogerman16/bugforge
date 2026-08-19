import type { NextRequest } from "next/server";
import { getSessions } from "@/lib/db";
import { toCsv, csvResponse, jsonResponse } from "@/lib/utils/export";
import { SESSION_STATUS_LABEL } from "@/lib/status-labels";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "json" ? "json" : "csv";
  const sessions = await getSessions(params.get("game") ?? undefined);

  if (format === "json") {
    return jsonResponse(
      "bugforge-sessions.json",
      sessions.map((s) => ({
        name: s.name,
        game: s.game.name,
        build: s.build.version,
        status: SESSION_STATUS_LABEL[s.status],
        startedAt: s.startedAt ? s.startedAt.toISOString() : null,
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        testers: s.testerCount,
        bugsFound: s.bugsFound,
        criticalBugs: s.criticalCount,
        testCasesExecuted: s.testCasesExecuted,
        coveragePercent: s.coveragePercent,
        notes: s.notes,
      }))
    );
  }

  const csv = toCsv(sessions, [
    { label: "Name", value: (s) => s.name },
    { label: "Game", value: (s) => s.game.name },
    { label: "Build", value: (s) => s.build.version },
    { label: "Status", value: (s) => SESSION_STATUS_LABEL[s.status] },
    { label: "Started At", value: (s) => (s.startedAt ? s.startedAt.toISOString() : "") },
    { label: "Ended At", value: (s) => (s.endedAt ? s.endedAt.toISOString() : "") },
    { label: "Testers", value: (s) => s.testerCount },
    { label: "Bugs Found", value: (s) => s.bugsFound },
    { label: "Critical Bugs", value: (s) => s.criticalCount },
    { label: "Test Cases Executed", value: (s) => s.testCasesExecuted },
    { label: "Coverage %", value: (s) => (s.coveragePercent === null ? "" : s.coveragePercent) },
  ]);
  return csvResponse("bugforge-sessions.csv", csv);
}
