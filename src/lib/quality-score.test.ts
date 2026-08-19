import { describe, it, expect } from "vitest";
import { computeQualityScore, computeGameQualityScore, qualityBand, type QualityScoreFactors } from "@/lib/quality-score";
import { emptySeverityCounts } from "@/lib/severity";

function perfectFactors(overrides: Partial<QualityScoreFactors> = {}): QualityScoreFactors {
  return {
    openSeverityCounts: emptySeverityCounts(),
    openHighPriorityCount: 0,
    testPassRate: 100,
    regressionRate: 0,
    coverage: 100,
    resolutionVelocityHours: 0,
    ...overrides,
  };
}

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

describe("computeGameQualityScore", () => {
  it("scores a game perfect on every factor as 100", () => {
    const result = computeGameQualityScore(perfectFactors());
    expect(result.score).toBe(100);
    expect(result.band).toBe("HEALTHY");
  });

  it("every factor's weight sums to 1 when all data is available", () => {
    const result = computeGameQualityScore(perfectFactors());
    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it("excludes a factor with no data and redistributes its weight, rather than penalizing missing data", () => {
    const withData = computeGameQualityScore(perfectFactors());
    const noTestRuns = computeGameQualityScore(perfectFactors({ testPassRate: null }));

    const testPassFactor = noTestRuns.factors.find((f) => f.key === "testPassRate")!;
    expect(testPassFactor.available).toBe(false);
    expect(testPassFactor.weight).toBe(0);

    // Every other factor is still perfect, so excluding test pass rate
    // (rather than treating missing data as a 0) must not lower the score.
    expect(noTestRuns.score).toBe(withData.score);

    const totalWeight = noTestRuns.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it("still produces a real 0-100 score from only the always-available factors (bug health, high-priority count, regression rate) when every nullable factor is unavailable", () => {
    const result = computeGameQualityScore({
      openSeverityCounts: emptySeverityCounts(),
      openHighPriorityCount: 0,
      testPassRate: null,
      regressionRate: 0,
      coverage: null,
      resolutionVelocityHours: null,
    });
    expect(result.score).toBe(100);
    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
    expect(result.factors.find((f) => f.key === "testPassRate")!.available).toBe(false);
    expect(result.factors.find((f) => f.key === "coverage")!.available).toBe(false);
    expect(result.factors.find((f) => f.key === "velocity")!.available).toBe(false);
  });

  it("penalizes open high-priority bugs independently of severity", () => {
    const result = computeGameQualityScore(perfectFactors({ openHighPriorityCount: 5 }));
    expect(result.score).toBeLessThan(100);
  });

  it("a 2% regression rate — item 68's own example threshold — is a real, visible penalty", () => {
    const clean = computeGameQualityScore(perfectFactors());
    const regressed = computeGameQualityScore(perfectFactors({ regressionRate: 2 }));
    expect(regressed.score).toBeLessThan(clean.score);
  });

  it("every returned factor carries a human-readable value label", () => {
    const result = computeGameQualityScore(perfectFactors({ testPassRate: null, coverage: null, resolutionVelocityHours: null }));
    for (const factor of result.factors) {
      expect(factor.valueLabel.length).toBeGreaterThan(0);
    }
  });

  it("never produces a score outside 0-100 even at the worst possible inputs", () => {
    const result = computeGameQualityScore({
      openSeverityCounts: { BLOCKER: 50, CRITICAL: 50, HIGH: 50, MEDIUM: 50, LOW: 50 },
      openHighPriorityCount: 50,
      testPassRate: 0,
      regressionRate: 100,
      coverage: 0,
      resolutionVelocityHours: 10_000,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
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
