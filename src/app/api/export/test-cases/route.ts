import type { NextRequest } from "next/server";
import { getTestCases } from "@/lib/db";
import { toCsv, csvResponse, jsonResponse } from "@/lib/utils/export";
import { TEST_CASE_PRIORITY_META, TEST_CASE_STATUS_META } from "@/lib/test-case";
import { PLATFORM_LABEL } from "@/lib/platform";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "json" ? "json" : "csv";
  const testCases = await getTestCases(params.get("game") ?? undefined);

  if (format === "json") {
    return jsonResponse(
      "bugforge-test-cases.json",
      testCases.map((tc) => ({
        id: `TC-${String(tc.number).padStart(5, "0")}`,
        title: tc.title,
        game: tc.game.name,
        category: tc.category?.name ?? null,
        priority: TEST_CASE_PRIORITY_META[tc.priority].label,
        platform: PLATFORM_LABEL[tc.platform],
        status: TEST_CASE_STATUS_META[tc.status].label,
        lastRunAt: tc.latestRunAt ? tc.latestRunAt.toISOString() : null,
      }))
    );
  }

  const csv = toCsv(testCases, [
    { label: "ID", value: (tc) => `TC-${String(tc.number).padStart(5, "0")}` },
    { label: "Title", value: (tc) => tc.title },
    { label: "Game", value: (tc) => tc.game.name },
    { label: "Category", value: (tc) => tc.category?.name ?? "" },
    { label: "Priority", value: (tc) => TEST_CASE_PRIORITY_META[tc.priority].label },
    { label: "Platform", value: (tc) => PLATFORM_LABEL[tc.platform] },
    { label: "Status", value: (tc) => TEST_CASE_STATUS_META[tc.status].label },
    { label: "Last Run At", value: (tc) => (tc.latestRunAt ? tc.latestRunAt.toISOString() : "") },
  ]);
  return csvResponse("bugforge-test-cases.csv", csv);
}
