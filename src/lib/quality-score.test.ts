import { describe, it, expect } from "vitest";
import { computeQualityScore, qualityBand } from "@/lib/quality-score";
import { emptySeverityCounts } from "@/lib/severity";

describe("computeQualityScore", () => {
  it("scores a game with nothing open as perfect", () => {
    expect(computeQualityScore(emptySeverityCounts())).toBe(100);
  });

  it("costs a single Blocker its full flat weight", () => {
    const counts = { ...emptySeverityCounts(), BLOCKER: 1 };
    expect(computeQualityScore(counts)).toBe(80);
  });

  it("costs a single Critical its full flat weight", () => {
    const counts = { ...emptySeverityCounts(), CRITICAL: 1 };
    expect(computeQualityScore(counts)).toBe(88);
  });

  it("grows High/Medium/Low cost sub-linearly (sqrt), not per-bug", () => {
    const oneHigh = computeQualityScore({ ...emptySeverityCounts(), HIGH: 1 });
    const tenHigh = computeQualityScore({ ...emptySeverityCounts(), HIGH: 10 });
    // 10x the bugs should cost noticeably less than 10x the penalty.
    const onePenalty = 100 - oneHigh;
    const tenPenalty = 100 - tenHigh;
    expect(tenPenalty).toBeLessThan(onePenalty * 10);
    expect(tenPenalty).toBeGreaterThan(onePenalty);
  });

  it("never drops below 0 even with an overwhelming number of open bugs", () => {
    const counts = { BLOCKER: 50, CRITICAL: 50, HIGH: 50, MEDIUM: 50, LOW: 50 };
    expect(computeQualityScore(counts)).toBe(0);
  });

  it("ignores nothing but the open counts it's given — closed bugs never enter this function", () => {
    // computeQualityScore only ever sees *open* counts by contract; passing
    // zero counts must always mean 100 regardless of how bad the game's
    // total bug count might be elsewhere.
    expect(computeQualityScore(emptySeverityCounts())).toBe(100);
  });
});

describe("qualityBand", () => {
  it("bands the documented boundaries correctly", () => {
    expect(qualityBand(100)).toBe("HEALTHY");
    expect(qualityBand(75)).toBe("HEALTHY");
    expect(qualityBand(74)).toBe("AT_RISK");
    expect(qualityBand(45)).toBe("AT_RISK");
    expect(qualityBand(44)).toBe("CRITICAL");
    expect(qualityBand(0)).toBe("CRITICAL");
  });
});
