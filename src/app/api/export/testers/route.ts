import { getTesterProfiles } from "@/lib/db";
import { toCsv, csvResponse, jsonResponse } from "@/lib/utils/export";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";
  const testers = await getTesterProfiles();

  if (format === "json") {
    return jsonResponse(
      "bugforge-testers.json",
      testers.map((t) => ({
        name: t.name,
        email: t.email,
        role: t.role,
        bugsReported: t.bugsReported,
        bugsConfirmed: t.bugsConfirmed,
        bugsRejected: t.bugsRejected,
        testCasesExecuted: t.testCasesExecuted,
        reproductionQualityPercent: t.reproductionQuality,
      }))
    );
  }

  const csv = toCsv(testers, [
    { label: "Name", value: (t) => t.name },
    { label: "Email", value: (t) => t.email },
    { label: "Role", value: (t) => t.role },
    { label: "Bugs Reported", value: (t) => t.bugsReported },
    { label: "Bugs Confirmed", value: (t) => t.bugsConfirmed },
    { label: "Bugs Rejected", value: (t) => t.bugsRejected },
    { label: "Test Cases Executed", value: (t) => t.testCasesExecuted },
    { label: "Reproduction Quality %", value: (t) => (t.reproductionQuality === null ? "" : t.reproductionQuality) },
  ]);
  return csvResponse("bugforge-testers.csv", csv);
}
