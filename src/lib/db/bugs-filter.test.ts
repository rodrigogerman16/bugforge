import { describe, it, expect } from "vitest";
import { buildBugWhere, buildBugOrderBy } from "@/lib/db/bugs";

const gameIds = ["game-1", "game-2"];

describe("buildBugWhere", () => {
  it("always scopes to the resolved game ids, with no other filters applied", () => {
    const where = buildBugWhere({}, gameIds);
    expect(where).toEqual({ gameId: { in: gameIds } });
  });

  it("adds exactly one clause per filter actually provided", () => {
    const where = buildBugWhere({ severity: "CRITICAL", priority: "P1" }, gameIds);
    expect(where).toEqual({ gameId: { in: gameIds }, severity: "CRITICAL", priority: "P1" });
  });

  it("maps the 'unassigned' sentinel to a real null assignedToId filter", () => {
    const where = buildBugWhere({ assigneeId: "unassigned" }, gameIds);
    expect(where).toMatchObject({ assignedToId: null });
  });

  it("filters by a real tester id directly when it isn't the sentinel", () => {
    const where = buildBugWhere({ assigneeId: "tester-1" }, gameIds);
    expect(where).toMatchObject({ assignedToId: "tester-1" });
  });

  it("builds an open-ended date range when only one bound is given", () => {
    const from = new Date("2026-01-01");
    const whereFromOnly = buildBugWhere({ dateFrom: from }, gameIds);
    expect(whereFromOnly).toMatchObject({ createdAt: { gte: from } });
    expect((whereFromOnly as { createdAt?: { lte?: unknown } }).createdAt).not.toHaveProperty("lte");

    const to = new Date("2026-01-31");
    const whereToOnly = buildBugWhere({ dateTo: to }, gameIds);
    expect(whereToOnly).toMatchObject({ createdAt: { lte: to } });
  });

  it("searches title, description, and area name for a free-text query", () => {
    const where = buildBugWhere({ q: "crash" }, gameIds);
    expect(where).toMatchObject({
      OR: [
        { title: { contains: "crash" } },
        { description: { contains: "crash" } },
        { area: { name: { contains: "crash" } } },
      ],
    });
  });

  it("filters by build version and platform independently", () => {
    const where = buildBugWhere({ build: "0.9.14-beta", platform: "PC" }, gameIds);
    expect(where).toMatchObject({ build: { version: "0.9.14-beta" }, platform: "PC" });
  });

  it("combines every provided filter into a single where clause", () => {
    const where = buildBugWhere(
      { severity: "BLOCKER", status: "NEW", areaId: "area-1", tagId: "tag-1", reporterId: "tester-2" },
      gameIds
    );
    expect(where).toMatchObject({
      gameId: { in: gameIds },
      severity: "BLOCKER",
      status: "NEW",
      areaId: "area-1",
      tags: { some: { id: "tag-1" } },
      reportedById: "tester-2",
    });
  });
});

describe("buildBugOrderBy", () => {
  it("sorts number/title/updatedAt directly by direction with no inversion", () => {
    expect(buildBugOrderBy("number", "asc")).toEqual([{ number: "asc" }]);
    expect(buildBugOrderBy("updatedAt", "desc")).toEqual([{ updatedAt: "desc" }, { number: "desc" }]);
  });

  it("inverts direction for severity/priority/status — desc surfaces the most severe/urgent/earliest-stage first", () => {
    // rank 0 = Blocker/P0/New, so "desc" (most severe first) means the
    // underlying rank column sorts ascending.
    expect(buildBugOrderBy("severity", "desc")).toEqual([{ severityRank: "asc" }, { number: "desc" }]);
    expect(buildBugOrderBy("severity", "asc")).toEqual([{ severityRank: "desc" }, { number: "desc" }]);
    expect(buildBugOrderBy("priority", "desc")).toEqual([{ priorityRank: "asc" }, { number: "desc" }]);
    expect(buildBugOrderBy("status", "desc")).toEqual([{ statusRank: "asc" }, { number: "desc" }]);
  });

  it("sorts relation fields (area/build/reporter/assignee) by their real column, uninverted", () => {
    expect(buildBugOrderBy("area", "asc")).toEqual([{ area: { name: "asc" } }, { number: "desc" }]);
    expect(buildBugOrderBy("build", "desc")).toEqual([{ build: { version: "desc" } }, { number: "desc" }]);
    expect(buildBugOrderBy("reporter", "asc")).toEqual([{ reportedBy: { name: "asc" } }, { number: "desc" }]);
    expect(buildBugOrderBy("assignee", "asc")).toEqual([{ assignedTo: { name: "asc" } }, { number: "desc" }]);
  });

  it("every sort field except 'number' appends number as a stable tiebreaker for pagination", () => {
    const fieldsWithTiebreaker: Parameters<typeof buildBugOrderBy>[0][] = [
      "title", "severity", "priority", "status", "area", "build", "reporter", "assignee", "updatedAt",
    ];
    for (const field of fieldsWithTiebreaker) {
      const orderBy = buildBugOrderBy(field, "desc");
      expect(orderBy.at(-1)).toEqual({ number: "desc" });
    }
  });
});
