import { describe, it, expect } from "vitest";
import {
  BUG_WORKFLOW_MAIN,
  BUG_WORKFLOW_EXITS,
  BUG_STATUS_SORT_ORDER,
  BUG_STATUS_RANK,
  BUG_STATUS_META,
} from "@/lib/status-labels";

// Mirrors severity.test.ts/priority.test.ts — BUG_STATUS_RANK backs
// Bug.statusRank, the database column the bug list sorts by (see
// lib/db/bugs.ts).
describe("BUG_STATUS_SORT_ORDER / BUG_STATUS_RANK", () => {
  it("is the main workflow followed by both exit statuses, in that order", () => {
    expect(BUG_STATUS_SORT_ORDER).toEqual([...BUG_WORKFLOW_MAIN, ...BUG_WORKFLOW_EXITS]);
  });

  it("assigns a 0-based rank matching each status's position in the sort order", () => {
    BUG_STATUS_SORT_ORDER.forEach((status, index) => {
      expect(BUG_STATUS_RANK[status]).toBe(index);
    });
  });

  it("ranks New as the earliest workflow stage (rank 0)", () => {
    expect(BUG_STATUS_RANK.NEW).toBe(0);
  });

  it("has a label, icon, and color for every status the workflow can reach", () => {
    for (const status of BUG_STATUS_SORT_ORDER) {
      expect(BUG_STATUS_META[status].label).toBeTruthy();
      expect(BUG_STATUS_META[status].icon).toBeTruthy();
      expect(BUG_STATUS_META[status].color).toBeTruthy();
    }
  });
});
