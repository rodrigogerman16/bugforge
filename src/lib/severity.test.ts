import { describe, it, expect } from "vitest";
import { SEVERITY_ORDER, SEVERITY_RANK, emptySeverityCounts } from "@/lib/severity";

// SEVERITY_RANK backs the Bug.severityRank database column the bug list
// sorts by (see lib/db/bugs.ts) — if it ever drifts out of sync with
// SEVERITY_ORDER, severity sorting would silently break at the database
// level while every in-app label/badge kept looking correct.
describe("SEVERITY_RANK", () => {
  it("assigns a 0-based rank matching each severity's position in SEVERITY_ORDER", () => {
    SEVERITY_ORDER.forEach((severity, index) => {
      expect(SEVERITY_RANK[severity]).toBe(index);
    });
  });

  it("ranks Blocker as the most severe (rank 0) and Low as the least (highest rank)", () => {
    expect(SEVERITY_RANK.BLOCKER).toBe(0);
    expect(SEVERITY_RANK.LOW).toBe(SEVERITY_ORDER.length - 1);
  });
});

describe("emptySeverityCounts", () => {
  it("returns a zeroed bucket for every real severity, no more and no fewer", () => {
    const counts = emptySeverityCounts();
    for (const severity of SEVERITY_ORDER) {
      expect(counts[severity]).toBe(0);
    }
    expect(Object.keys(counts).sort()).toEqual([...SEVERITY_ORDER].sort());
  });
});
