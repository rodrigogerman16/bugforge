import { describe, it, expect } from "vitest";
import { PRIORITY_ORDER, PRIORITY_RANK } from "@/lib/priority";

// Mirrors severity.test.ts — PRIORITY_RANK backs Bug.priorityRank, the
// database column the bug list sorts by (see lib/db/bugs.ts).
describe("PRIORITY_RANK", () => {
  it("assigns a 0-based rank matching each priority's position in PRIORITY_ORDER", () => {
    PRIORITY_ORDER.forEach((priority, index) => {
      expect(PRIORITY_RANK[priority]).toBe(index);
    });
  });

  it("ranks P0 as most urgent (rank 0) and P4 as least urgent (highest rank)", () => {
    expect(PRIORITY_RANK.P0).toBe(0);
    expect(PRIORITY_RANK.P4).toBe(PRIORITY_ORDER.length - 1);
  });
});
