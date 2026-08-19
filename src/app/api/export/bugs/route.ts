import type { NextRequest } from "next/server";
import { getBugsForExport, isBugSortField } from "@/lib/db";
import { toCsv, csvResponse, jsonResponse } from "@/lib/utils/export";
import { SEVERITY_META } from "@/lib/severity";
import { PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { PLATFORM_LABEL } from "@/lib/platform";
import { BugSeverity, BugPriority, BugStatus, Platform } from "@/generated/prisma/enums";

function isBugSeverity(value: string | null): value is BugSeverity {
  return !!value && (Object.values(BugSeverity) as string[]).includes(value);
}
function isBugPriority(value: string | null): value is BugPriority {
  return !!value && (Object.values(BugPriority) as string[]).includes(value);
}
function isBugStatus(value: string | null): value is BugStatus {
  return !!value && (Object.values(BugStatus) as string[]).includes(value);
}
function isPlatform(value: string | null): value is Platform {
  return !!value && (Object.values(Platform) as string[]).includes(value);
}

// Exports exactly the rows the /bugs list would show for the same filters —
// the export button on that page links here with its current query string
// plus &format=csv|json, so what's downloaded always matches what's on screen.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "json" ? "json" : "csv";
  const sortParam = params.get("sort") ?? undefined;
  const dateFromRaw = params.get("dateFrom");
  const dateToRaw = params.get("dateTo");

  const bugs = await getBugsForExport({
    gameSlug: params.get("game") ?? undefined,
    severity: isBugSeverity(params.get("severity")) ? (params.get("severity") as BugSeverity) : undefined,
    priority: isBugPriority(params.get("priority")) ? (params.get("priority") as BugPriority) : undefined,
    status: isBugStatus(params.get("status")) ? (params.get("status") as BugStatus) : undefined,
    areaId: params.get("area") ?? undefined,
    build: params.get("build") ?? undefined,
    platform: isPlatform(params.get("platform")) ? (params.get("platform") as Platform) : undefined,
    reporterId: params.get("reporter") ?? undefined,
    assigneeId: params.get("assignee") ?? undefined,
    dateFrom: dateFromRaw ? new Date(`${dateFromRaw}T00:00:00`) : undefined,
    dateTo: dateToRaw ? new Date(`${dateToRaw}T23:59:59.999`) : undefined,
    tagId: params.get("tag") ?? undefined,
    q: params.get("q") ?? undefined,
    sort: isBugSortField(sortParam) ? sortParam : "updatedAt",
    dir: params.get("dir") === "asc" ? "asc" : "desc",
  });

  if (format === "json") {
    return jsonResponse(
      "bugforge-bugs.json",
      bugs.map((b) => ({
        id: `BUG-${b.number}`,
        title: b.title,
        game: b.game.name,
        severity: SEVERITY_META[b.severity].label,
        priority: PRIORITY_META[b.priority].label,
        status: BUG_STATUS_META[b.status].label,
        area: b.area?.name ?? null,
        build: b.build.version,
        platform: PLATFORM_LABEL[b.platform],
        isRegression: b.isRegression,
        reportedBy: b.reportedBy?.name ?? null,
        assignedTo: b.assignedTo?.name ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }))
    );
  }

  const csv = toCsv(bugs, [
    { label: "ID", value: (b) => `BUG-${b.number}` },
    { label: "Title", value: (b) => b.title },
    { label: "Game", value: (b) => b.game.name },
    { label: "Severity", value: (b) => SEVERITY_META[b.severity].label },
    { label: "Priority", value: (b) => PRIORITY_META[b.priority].label },
    { label: "Status", value: (b) => BUG_STATUS_META[b.status].label },
    { label: "Area", value: (b) => b.area?.name ?? "" },
    { label: "Build", value: (b) => b.build.version },
    { label: "Platform", value: (b) => PLATFORM_LABEL[b.platform] },
    { label: "Regression", value: (b) => (b.isRegression ? "Yes" : "No") },
    { label: "Reported By", value: (b) => b.reportedBy?.name ?? "" },
    { label: "Assigned To", value: (b) => b.assignedTo?.name ?? "" },
    { label: "Created At", value: (b) => b.createdAt.toISOString() },
    { label: "Updated At", value: (b) => b.updatedAt.toISOString() },
  ]);
  return csvResponse("bugforge-bugs.csv", csv);
}
